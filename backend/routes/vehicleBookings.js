import express from "express";
import db from "../db.js";
import { logAudit } from "./audit.js";
import { sendEmail } from "../services/emailService.js";

const router = express.Router();

// Funzione helper per inviare email a destinatario esterno per prenotazione veicolo
async function sendExternalVehicleBookingEmail(booking, vehicle) {
  if (!booking.external_email) return;

  try {
    const startDate = new Date(booking.start_time);
    const endDate = booking.end_time ? new Date(booking.end_time) : null;

    const subject = `Prenotazione Veicolo: ${vehicle.brand} ${vehicle.model} (${vehicle.plate})`;
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #F59E0B;">Prenotazione Veicolo Confermata</h2>
        <p>Ti informiamo che è stata effettuata una prenotazione veicolo a tuo nome.</p>

        <div style="background: #f8fafc; border-radius: 8px; padding: 20px; margin: 20px 0;">
          <h3 style="margin-top: 0; color: #1e293b;">${vehicle.brand} ${vehicle.model}</h3>
          <p><strong>Targa:</strong> ${vehicle.plate}</p>
          <p><strong>Conducente:</strong> ${booking.driver_name}</p>
          <p><strong>Data partenza:</strong> ${startDate.toLocaleDateString("it-IT", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}</p>
          <p><strong>Ora partenza:</strong> ${startDate.toLocaleTimeString("it-IT", { hour: "2-digit", minute: "2-digit" })}</p>
          ${endDate ? `<p><strong>Rientro previsto:</strong> ${endDate.toLocaleDateString("it-IT", { weekday: "long", day: "numeric", month: "long", year: "numeric" })} alle ${endDate.toLocaleTimeString("it-IT", { hour: "2-digit", minute: "2-digit" })}</p>` : ""}
          ${booking.destination ? `<p><strong>Destinazione:</strong> ${booking.destination}</p>` : ""}
          ${booking.purpose ? `<p><strong>Motivo:</strong> ${booking.purpose}</p>` : ""}
          ${booking.km_start ? `<p><strong>Km alla partenza:</strong> ${booking.km_start.toLocaleString()} km</p>` : ""}
        </div>

        <p style="color: #64748b; font-size: 14px;">Questa prenotazione è stata effettuata dalla segreteria/amministrazione.</p>
        <p style="color: #64748b; font-size: 14px;">Cordiali saluti,<br>Interview Portal</p>
      </div>
    `;

    await sendEmail(booking.external_email, subject, html);
    console.log(`Email inviata a ${booking.external_email} per prenotazione veicolo`);
  } catch (error) {
    console.error("Errore invio email prenotazione veicolo esterna:", error);
  }
}

// Lista prenotazioni con filtri opzionali
router.get("/", (req, res) => {
  const { vehicle_id, start_date, end_date, active_only } = req.query;

  let sql = `
    SELECT vb.*, v.plate, v.brand, v.model, v.color as vehicle_color
    FROM vehicle_bookings vb
    JOIN vehicles v ON vb.vehicle_id = v.id
    WHERE 1=1
  `;
  const params = [];

  if (vehicle_id) {
    sql += " AND vb.vehicle_id = ?";
    params.push(vehicle_id);
  }

  if (start_date) {
    sql += " AND (vb.end_time >= ? OR vb.end_time IS NULL)";
    params.push(start_date);
  }

  if (end_date) {
    sql += " AND vb.start_time <= ?";
    params.push(end_date);
  }

  if (active_only === "true") {
    sql += " AND vb.returned = 0";
  }

  sql += " ORDER BY vb.start_time DESC";

  db.all(sql, params, (err, rows) => {
    if (err) return res.status(500).json({ message: "Errore DB" });
    res.json(rows);
  });
});

// Dettaglio prenotazione
router.get("/:id", (req, res) => {
  const { id } = req.params;
  db.get(
    `SELECT vb.*, v.plate, v.brand, v.model, v.color as vehicle_color
     FROM vehicle_bookings vb
     JOIN vehicles v ON vb.vehicle_id = v.id
     WHERE vb.id = ?`,
    [id],
    (err, row) => {
      if (err) return res.status(500).json({ message: "Errore DB" });
      if (!row) return res.status(404).json({ message: "Prenotazione non trovata" });
      res.json(row);
    }
  );
});

// Verifica conflitti (stesso veicolo, stesso periodo, non restituito)
function checkConflicts(vehicleId, startTime, endTime, excludeId = null) {
  return new Promise((resolve, reject) => {
    let sql = `
      SELECT id, driver_name, start_time, end_time
      FROM vehicle_bookings
      WHERE vehicle_id = ?
        AND returned = 0
        AND start_time < ?
        AND (end_time > ? OR end_time IS NULL)
    `;
    const params = [vehicleId, endTime || "9999-12-31", startTime];

    if (excludeId) {
      sql += " AND id != ?";
      params.push(excludeId);
    }

    db.all(sql, params, (err, rows) => {
      if (err) reject(err);
      else resolve(rows);
    });
  });
}

// Check availability endpoint
router.post("/check-availability", async (req, res) => {
  const { vehicle_id, start_time, end_time, exclude_id } = req.body;

  if (!vehicle_id || !start_time) {
    return res.status(400).json({ message: "Parametri mancanti" });
  }

  try {
    const conflicts = await checkConflicts(vehicle_id, start_time, end_time, exclude_id);

    if (conflicts.length === 0) {
      return res.json({ available: true });
    }

    // Find alternative vehicles available at the same time
    const alternativeVehicles = await new Promise((resolve, reject) => {
      db.all(
        `SELECT v.id, v.plate, v.brand, v.model, v.color
         FROM vehicles v
         WHERE v.active = 1 AND v.id != ?
           AND v.id NOT IN (
             SELECT vehicle_id FROM vehicle_bookings
             WHERE returned = 0
               AND start_time < ?
               AND (end_time > ? OR end_time IS NULL)
           )`,
        [vehicle_id, end_time || "9999-12-31", start_time],
        (err, rows) => {
          if (err) reject(err);
          else resolve(rows);
        }
      );
    });

    res.json({
      available: false,
      conflicts,
      suggestions: {
        alternativeVehicles
      }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Errore server" });
  }
});

// Crea nuova prenotazione
router.post("/", async (req, res) => {
  const { vehicle_id, driver_name, destination, purpose, start_time, end_time, km_start, notes, external_email } = req.body;

  if (!vehicle_id || !driver_name || !start_time) {
    return res.status(400).json({ message: "Veicolo, conducente e data partenza sono obbligatori" });
  }

  // Valida che end_time sia dopo start_time se specificato
  if (end_time && new Date(end_time) <= new Date(start_time)) {
    return res.status(400).json({ message: "La data di rientro deve essere successiva alla partenza" });
  }

  // Valida formato email se specificata
  if (external_email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(external_email)) {
    return res.status(400).json({ message: "Formato email non valido" });
  }

  try {
    // Verifica conflitti
    const conflicts = await checkConflicts(vehicle_id, start_time, end_time);
    if (conflicts.length > 0) {
      return res.status(409).json({
        message: "Il veicolo è già prenotato in questo periodo",
        conflicts
      });
    }

    db.run(
      `INSERT INTO vehicle_bookings
       (vehicle_id, driver_name, destination, purpose, start_time, end_time, km_start, notes, external_email, created_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        vehicle_id,
        driver_name,
        destination || null,
        purpose || null,
        start_time,
        end_time || null,
        km_start || null,
        notes || null,
        external_email || null,
        req.user.id
      ],
      function (err) {
        if (err) return res.status(500).json({ message: "Errore DB" });

        const bookingId = this.lastID;
        logAudit(req.user.id, req.user.email, "create", "vehicle_booking", bookingId, {
          vehicle_id,
          driver_name,
          start_time,
          external_email
        });

        // Recupera i dati della prenotazione creata
        db.get(
          `SELECT vb.*, v.plate, v.brand, v.model, v.color as vehicle_color
           FROM vehicle_bookings vb
           JOIN vehicles v ON vb.vehicle_id = v.id
           WHERE vb.id = ?`,
          [bookingId],
          async (err, row) => {
            if (err) return res.status(500).json({ message: "Errore DB" });

            // Se c'è un'email esterna, invia notifica
            if (external_email && row) {
              const vehicle = { plate: row.plate, brand: row.brand, model: row.model };
              await sendExternalVehicleBookingEmail(row, vehicle);
            }

            res.status(201).json(row);
          }
        );
      }
    );
  } catch (err) {
    res.status(500).json({ message: "Errore server" });
  }
});

// Modifica prenotazione
router.put("/:id", async (req, res) => {
  const { id } = req.params;
  const { vehicle_id, driver_name, destination, purpose, start_time, end_time, km_start, notes, external_email } = req.body;

  if (!vehicle_id || !driver_name || !start_time) {
    return res.status(400).json({ message: "Veicolo, conducente e data partenza sono obbligatori" });
  }

  // Valida che end_time sia dopo start_time se specificato
  if (end_time && new Date(end_time) <= new Date(start_time)) {
    return res.status(400).json({ message: "La data di rientro deve essere successiva alla partenza" });
  }

  // Valida formato email se specificata
  if (external_email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(external_email)) {
    return res.status(400).json({ message: "Formato email non valido" });
  }

  try {
    // Verifica conflitti (escludendo la prenotazione corrente)
    const conflicts = await checkConflicts(vehicle_id, start_time, end_time, parseInt(id));
    if (conflicts.length > 0) {
      return res.status(409).json({
        message: "Il veicolo è già prenotato in questo periodo",
        conflicts
      });
    }

    db.run(
      `UPDATE vehicle_bookings
       SET vehicle_id = ?, driver_name = ?, destination = ?, purpose = ?,
           start_time = ?, end_time = ?, km_start = ?, notes = ?, external_email = ?
       WHERE id = ?`,
      [
        vehicle_id,
        driver_name,
        destination || null,
        purpose || null,
        start_time,
        end_time || null,
        km_start || null,
        notes || null,
        external_email || null,
        id
      ],
      function (err) {
        if (err) return res.status(500).json({ message: "Errore DB" });
        if (this.changes === 0) {
          return res.status(404).json({ message: "Prenotazione non trovata" });
        }

        logAudit(req.user.id, req.user.email, "update", "vehicle_booking", parseInt(id), {
          vehicle_id,
          driver_name,
          start_time,
          external_email
        });

        res.json({ updated: true });
      }
    );
  } catch (err) {
    res.status(500).json({ message: "Errore server" });
  }
});

// Registra restituzione veicolo
router.patch("/:id/return", (req, res) => {
  const { id } = req.params;
  const { km_end, return_notes } = req.body;

  const endTime = new Date().toISOString();

  db.get("SELECT * FROM vehicle_bookings WHERE id = ?", [id], (err, booking) => {
    if (err) return res.status(500).json({ message: "Errore DB" });
    if (!booking) return res.status(404).json({ message: "Prenotazione non trovata" });
    if (booking.returned) return res.status(400).json({ message: "Veicolo già restituito" });

    db.run(
      `UPDATE vehicle_bookings
       SET returned = 1, end_time = ?, km_end = ?, return_notes = ?
       WHERE id = ?`,
      [endTime, km_end || null, return_notes || null, id],
      function (err) {
        if (err) return res.status(500).json({ message: "Errore DB" });

        // Aggiorna i km del veicolo se specificati
        if (km_end) {
          db.run("UPDATE vehicles SET current_km = ? WHERE id = ?", [km_end, booking.vehicle_id]);
        }

        logAudit(req.user.id, req.user.email, "return", "vehicle_booking", parseInt(id), {
          km_end,
          return_notes
        });

        res.json({ returned: true, end_time: endTime });
      }
    );
  });
});

// Elimina prenotazione
router.delete("/:id", (req, res) => {
  const { id } = req.params;

  db.get("SELECT driver_name, vehicle_id FROM vehicle_bookings WHERE id = ?", [id], (err, booking) => {
    if (err) return res.status(500).json({ message: "Errore DB" });
    if (!booking) return res.status(404).json({ message: "Prenotazione non trovata" });

    db.run("DELETE FROM vehicle_bookings WHERE id = ?", [id], function (err) {
      if (err) return res.status(500).json({ message: "Errore DB" });

      logAudit(req.user.id, req.user.email, "delete", "vehicle_booking", parseInt(id), {
        driver_name: booking.driver_name
      });

      res.json({ deleted: true });
    });
  });
});

export default router;
