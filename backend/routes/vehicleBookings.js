import express from "express";
import db from "../db.js";
import { logAudit } from "./audit.js";

const router = express.Router();

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

// Crea nuova prenotazione
router.post("/", async (req, res) => {
  const { vehicle_id, driver_name, destination, purpose, start_time, end_time, km_start, notes } = req.body;

  if (!vehicle_id || !driver_name || !start_time) {
    return res.status(400).json({ message: "Veicolo, conducente e data partenza sono obbligatori" });
  }

  // Valida che end_time sia dopo start_time se specificato
  if (end_time && new Date(end_time) <= new Date(start_time)) {
    return res.status(400).json({ message: "La data di rientro deve essere successiva alla partenza" });
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
       (vehicle_id, driver_name, destination, purpose, start_time, end_time, km_start, notes, created_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        vehicle_id,
        driver_name,
        destination || null,
        purpose || null,
        start_time,
        end_time || null,
        km_start || null,
        notes || null,
        req.user.id
      ],
      function (err) {
        if (err) return res.status(500).json({ message: "Errore DB" });

        logAudit(req.user.id, req.user.email, "create", "vehicle_booking", this.lastID, {
          vehicle_id,
          driver_name,
          start_time
        });

        // Recupera i dati della prenotazione creata
        db.get(
          `SELECT vb.*, v.plate, v.brand, v.model, v.color as vehicle_color
           FROM vehicle_bookings vb
           JOIN vehicles v ON vb.vehicle_id = v.id
           WHERE vb.id = ?`,
          [this.lastID],
          (err, row) => {
            if (err) return res.status(500).json({ message: "Errore DB" });
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
  const { vehicle_id, driver_name, destination, purpose, start_time, end_time, km_start, notes } = req.body;

  if (!vehicle_id || !driver_name || !start_time) {
    return res.status(400).json({ message: "Veicolo, conducente e data partenza sono obbligatori" });
  }

  // Valida che end_time sia dopo start_time se specificato
  if (end_time && new Date(end_time) <= new Date(start_time)) {
    return res.status(400).json({ message: "La data di rientro deve essere successiva alla partenza" });
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
           start_time = ?, end_time = ?, km_start = ?, notes = ?
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
          start_time
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
