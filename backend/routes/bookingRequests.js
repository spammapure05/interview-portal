import express from "express";
import db from "../db.js";
import { requireRole } from "../rolesMiddleware.js";
import { createNotification, notifyByRole } from "./notifications.js";

const router = express.Router();

// Helper per ottenere l'URL base dell'applicazione
function getAppUrl() {
  return process.env.APP_URL || "http://localhost:3000";
}

// Helper per generare URL per le azioni sulle richieste
function getRequestActionUrl(requestId, role) {
  const baseUrl = getAppUrl();
  // Admin/Secretary vedono la pagina gestione richieste, viewer la propria lista
  if (role === "admin" || role === "secretary") {
    return `${baseUrl}/admin/requests?highlight=${requestId}`;
  }
  return `${baseUrl}/my-requests?highlight=${requestId}`;
}

// Helper per sanitizzare input per prevenire email header injection
function sanitizeForEmail(str) {
  if (!str) return "";
  // Rimuove caratteri che potrebbero essere usati per header injection
  return String(str)
    .replace(/[\r\n]/g, " ")       // Rimuove newlines (header injection)
    .replace(/[<>]/g, "")          // Rimuove < > (HTML injection base)
    .trim();
}

// Helper per escape HTML base (per template email)
function escapeHtml(str) {
  if (!str) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#x27;");
}

// Helper per inviare notifiche email
async function sendNotificationEmail(templateType, recipientEmail, recipientName, variables, ccEmail = null) {
  return new Promise((resolve, reject) => {
    // Get SMTP config
    db.get("SELECT * FROM smtp_config WHERE id = 1 AND enabled = 1", async (err, smtpConfig) => {
      if (err || !smtpConfig) {
        console.log("SMTP not configured or disabled");
        return resolve(false);
      }

      // Get template
      db.get("SELECT * FROM notification_templates WHERE type = ? AND enabled = 1", [templateType], async (err, template) => {
        if (err || !template) {
          console.log("Template not found or disabled:", templateType);
          return resolve(false);
        }

        try {
          const nodemailer = await import("nodemailer");

          const transporter = nodemailer.default.createTransport({
            host: smtpConfig.host,
            port: smtpConfig.port,
            secure: !!smtpConfig.secure,
            auth: smtpConfig.username ? {
              user: smtpConfig.username,
              pass: smtpConfig.password
            } : undefined
          });

          // Replace variables in template con sanitizzazione
          let subject = template.subject;
          let body = template.body;

          for (const [key, value] of Object.entries(variables)) {
            const regex = new RegExp(`{{${key}}}`, 'g');
            // Sanitizza subject per prevenire header injection
            subject = subject.replace(regex, sanitizeForEmail(value) || '');
            // Escape HTML nel body per prevenire XSS
            body = body.replace(regex, escapeHtml(value) || '');
          }

          const mailOptions = {
            from: `"${smtpConfig.from_name}" <${smtpConfig.from_email}>`,
            to: recipientEmail,
            subject: subject,
            html: body
          };

          // Aggiungi CC se specificato
          if (ccEmail) {
            mailOptions.cc = ccEmail;
          }

          await transporter.sendMail(mailOptions);

          console.log(`Email sent to ${recipientEmail}${ccEmail ? ` (CC: ${ccEmail})` : ''} for ${templateType}`);
          resolve(true);
        } catch (error) {
          console.error("Email send error:", error);
          resolve(false);
        }
      });
    });
  });
}

// Helper per ottenere tutti gli admin e segreteria
function getAdminAndSecretaryEmails() {
  return new Promise((resolve, reject) => {
    db.all("SELECT email, role FROM users WHERE role IN ('admin', 'secretary') AND active = 1", (err, rows) => {
      if (err) {
        console.error("Error getting admin/secretary emails:", err);
        return resolve({ admins: [], secretaries: [] });
      }
      const admins = rows.filter(r => r.role === 'admin').map(r => r.email);
      const secretaries = rows.filter(r => r.role === 'secretary').map(r => r.email);
      resolve({ admins, secretaries });
    });
  });
}

// Helper per inviare notifica a tutti admin e segreteria
async function notifyAllStaff(templateType, variables, requesterEmailAsCC = null, requestId = null) {
  const { admins, secretaries } = await getAdminAndSecretaryEmails();
  const allStaff = [...admins, ...secretaries];

  for (const email of allStaff) {
    // Aggiungi action_url per admin/secretary
    const varsWithUrl = requestId ? { ...variables, action_url: getRequestActionUrl(requestId, "admin") } : variables;
    await sendNotificationEmail(templateType, email, "Staff", varsWithUrl, requesterEmailAsCC);
  }

  // Crea notifiche in-app per admin e segreteria
  const notificationTitles = {
    request_submitted: "Nuova Richiesta",
    request_approved: "Richiesta Approvata",
    request_rejected: "Richiesta Rifiutata"
  };
  const title = notificationTitles[templateType] || "Notifica";
  const message = `${variables.requester_name || "Un utente"} - ${variables.request_type || "Prenotazione"} per ${variables.date || "data non specificata"}`;
  const link = requestId ? `/admin/requests?highlight=${requestId}` : "/admin/requests";

  try {
    await notifyByRole(["admin", "secretary"], templateType, title, message, link);
  } catch (e) {
    console.error("Errore creazione notifica in-app:", e);
  }
}

// Helper per inviare notifica al richiedente e alle segreterie
async function notifyRequesterAndSecretaries(templateType, requesterEmail, requesterName, variables, requestId = null, requesterId = null) {
  const { secretaries } = await getAdminAndSecretaryEmails();

  // Email al richiedente con action_url per viewer
  const varsForRequester = requestId ? { ...variables, action_url: getRequestActionUrl(requestId, "viewer") } : variables;
  await sendNotificationEmail(templateType, requesterEmail, requesterName, varsForRequester);

  // Email a tutte le segreterie con action_url per secretary
  for (const secEmail of secretaries) {
    const varsForSecretary = requestId ? { ...variables, action_url: getRequestActionUrl(requestId, "secretary") } : variables;
    await sendNotificationEmail(templateType, secEmail, "Segreteria", varsForSecretary);
  }

  // Crea notifica in-app per il richiedente
  if (requesterId) {
    const notificationTitles = {
      request_approved: "Richiesta Approvata",
      request_rejected: "Richiesta Rifiutata",
      request_counter: "Controproposta Ricevuta"
    };
    const title = notificationTitles[templateType] || "Aggiornamento Richiesta";
    const message = templateType === "request_approved"
      ? `La tua richiesta per ${variables.request_type || "prenotazione"} del ${variables.date || ""} è stata approvata`
      : templateType === "request_rejected"
        ? `La tua richiesta per ${variables.request_type || "prenotazione"} è stata rifiutata`
        : `Hai ricevuto una controproposta per la tua richiesta`;
    const link = requestId ? `/my-requests?highlight=${requestId}` : "/my-requests";

    try {
      await createNotification(requesterId, templateType, title, message, link);
    } catch (e) {
      console.error("Errore creazione notifica in-app per richiedente:", e);
    }
  }

  // Notifica anche le segreterie in-app
  try {
    await notifyByRole(["secretary"], templateType, "Aggiornamento Richiesta",
      `${requesterName}: ${variables.request_type || "Prenotazione"}`,
      requestId ? `/admin/requests?highlight=${requestId}` : "/admin/requests");
  } catch (e) {
    console.error("Errore notifica segreterie:", e);
  }
}

// GET - Conteggio richieste pending (per badge admin) - DEVE ESSERE PRIMA DI /:id
router.get("/count/pending", requireRole("admin", "secretary"), (req, res) => {
  db.get("SELECT COUNT(*) as count FROM booking_requests WHERE status = 'pending'", (err, row) => {
    if (err) return res.status(500).json({ message: "Errore database" });
    res.json({ count: row.count });
  });
});

// GET - Lista richieste (filtrate per ruolo)
router.get("/", (req, res) => {
  const isAdmin = req.user.role === "admin";
  const isSecretary = req.user.role === "secretary";

  let query = `
    SELECT br.*,
      r.name as room_name, r.color as room_color,
      v.plate, v.brand, v.model, v.color as vehicle_color,
      cr.name as counter_room_name,
      cv.plate as counter_plate, cv.brand as counter_brand, cv.model as counter_model
    FROM booking_requests br
    LEFT JOIN rooms r ON br.room_id = r.id
    LEFT JOIN vehicles v ON br.vehicle_id = v.id
    LEFT JOIN rooms cr ON br.counter_room_id = cr.id
    LEFT JOIN vehicles cv ON br.counter_vehicle_id = cv.id
  `;

  const params = [];

  if (!isAdmin && !isSecretary) {
    // Viewer vede solo le proprie richieste
    query += " WHERE br.requester_id = ?";
    params.push(req.user.id);
  }

  query += " ORDER BY br.created_at DESC";

  db.all(query, params, (err, rows) => {
    if (err) {
      console.error("Error fetching requests:", err);
      return res.status(500).json({ message: "Errore database" });
    }
    res.json(rows);
  });
});

// GET - Singola richiesta
router.get("/:id", (req, res) => {
  const query = `
    SELECT br.*,
      r.name as room_name, r.color as room_color, r.capacity as room_capacity,
      v.plate, v.brand, v.model, v.color as vehicle_color, v.parking_location,
      cr.name as counter_room_name, cr.capacity as counter_room_capacity,
      cv.plate as counter_plate, cv.brand as counter_brand, cv.model as counter_model, cv.parking_location as counter_parking
    FROM booking_requests br
    LEFT JOIN rooms r ON br.room_id = r.id
    LEFT JOIN vehicles v ON br.vehicle_id = v.id
    LEFT JOIN rooms cr ON br.counter_room_id = cr.id
    LEFT JOIN vehicles cv ON br.counter_vehicle_id = cv.id
    WHERE br.id = ?
  `;

  db.get(query, [req.params.id], (err, row) => {
    if (err) {
      return res.status(500).json({ message: "Errore database" });
    }
    if (!row) {
      return res.status(404).json({ message: "Richiesta non trovata" });
    }

    // Check permission
    const isAdmin = req.user.role === "admin";
    const isSecretary = req.user.role === "secretary";
    if (!isAdmin && !isSecretary && row.requester_id !== req.user.id) {
      return res.status(403).json({ message: "Non autorizzato" });
    }

    res.json(row);
  });
});

// POST - Crea nuova richiesta
router.post("/", (req, res) => {
  const {
    request_type,
    room_id,
    meeting_title,
    meeting_description,
    vehicle_id,
    driver_name,
    destination,
    purpose,
    requested_start,
    requested_end
  } = req.body;

  if (!request_type || !requested_start) {
    return res.status(400).json({ message: "Tipo richiesta e data/ora inizio sono obbligatori" });
  }

  if (request_type === "room" && !room_id) {
    return res.status(400).json({ message: "Seleziona una sala" });
  }

  if (request_type === "vehicle" && !vehicle_id) {
    return res.status(400).json({ message: "Seleziona un veicolo" });
  }

  db.run(
    `INSERT INTO booking_requests (
      request_type, requester_id, requester_email, requester_name,
      room_id, meeting_title, meeting_description,
      vehicle_id, driver_name, destination, purpose,
      requested_start, requested_end
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      request_type,
      req.user.id,
      req.user.email,
      req.user.email.split("@")[0], // Use email prefix as name
      request_type === "room" ? room_id : null,
      meeting_title || null,
      meeting_description || null,
      request_type === "vehicle" ? vehicle_id : null,
      driver_name || null,
      destination || null,
      purpose || null,
      requested_start,
      requested_end || null
    ],
    async function(err) {
      if (err) {
        console.error("Error creating request:", err);
        return res.status(500).json({ message: "Errore creazione richiesta" });
      }

      const requestId = this.lastID;

      // Notifica tutti admin + segreteria con CC al richiedente
      const startDate = new Date(requested_start);
      await notifyAllStaff("request_submitted", {
        requester_name: req.user.email,
        request_type: request_type === "room" ? "Sala riunioni" : "Veicolo",
        date: startDate.toLocaleDateString("it-IT"),
        start_time: startDate.toLocaleTimeString("it-IT", { hour: "2-digit", minute: "2-digit" }),
        end_time: requested_end ? new Date(requested_end).toLocaleTimeString("it-IT", { hour: "2-digit", minute: "2-digit" }) : "N/A",
        details: request_type === "room" ? `Titolo: ${meeting_title || "N/A"}` : `Destinazione: ${destination || "N/A"}`
      }, req.user.email, requestId); // CC al richiedente

      res.status(201).json({
        message: "Richiesta inviata con successo",
        id: requestId
      });
    }
  );
});

// PUT - Approva richiesta (admin)
router.put("/:id/approve", requireRole("admin"), (req, res) => {
  const { admin_notes } = req.body;

  db.get("SELECT * FROM booking_requests WHERE id = ?", [req.params.id], (err, request) => {
    if (err) return res.status(500).json({ message: "Errore database" });
    if (!request) return res.status(404).json({ message: "Richiesta non trovata" });
    if (request.status !== "pending" && request.status !== "counter_rejected") {
      return res.status(400).json({ message: "Richiesta già gestita" });
    }

    db.run(
      `UPDATE booking_requests SET
        status = 'approved',
        admin_id = ?,
        admin_notes = ?,
        responded_at = CURRENT_TIMESTAMP,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ?`,
      [req.user.id, admin_notes || null, req.params.id],
      async function(err) {
        if (err) return res.status(500).json({ message: "Errore approvazione" });

        // Crea la prenotazione effettiva
        if (request.request_type === "room") {
          db.run(
            `INSERT INTO room_meetings (room_id, title, description, start_time, end_time, organizer, created_by)
             VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [request.room_id, request.meeting_title || "Riunione", request.meeting_description,
             request.requested_start, request.requested_end, request.requester_email, req.user.id]
          );
        } else if (request.request_type === "vehicle") {
          db.run(
            `INSERT INTO vehicle_bookings (vehicle_id, driver_name, destination, purpose, start_time, end_time, created_by)
             VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [request.vehicle_id, request.driver_name || request.requester_email, request.destination,
             request.purpose, request.requested_start, request.requested_end, req.user.id]
          );
        }

        // Notifica richiedente + segreterie
        const startDate = new Date(request.requested_start);
        await notifyRequesterAndSecretaries("request_approved", request.requester_email, request.requester_name, {
          request_type: request.request_type === "room" ? "Sala riunioni" : "Veicolo",
          date: startDate.toLocaleDateString("it-IT"),
          start_time: startDate.toLocaleTimeString("it-IT", { hour: "2-digit", minute: "2-digit" }),
          end_time: request.requested_end ? new Date(request.requested_end).toLocaleTimeString("it-IT", { hour: "2-digit", minute: "2-digit" }) : "N/A",
          details: request.request_type === "room" ? `Sala: ${request.meeting_title || "N/A"}` : `Veicolo per: ${request.destination || "N/A"}`,
          requester_name: request.requester_name || request.requester_email
        }, parseInt(req.params.id), request.requester_id);

        res.json({ message: "Richiesta approvata" });
      }
    );
  });
});

// PUT - Rifiuta richiesta (admin)
router.put("/:id/reject", requireRole("admin"), (req, res) => {
  const { rejection_reason } = req.body;

  if (!rejection_reason) {
    return res.status(400).json({ message: "Motivazione del rifiuto obbligatoria" });
  }

  db.get("SELECT * FROM booking_requests WHERE id = ?", [req.params.id], (err, request) => {
    if (err) return res.status(500).json({ message: "Errore database" });
    if (!request) return res.status(404).json({ message: "Richiesta non trovata" });
    if (request.status !== "pending" && request.status !== "counter_rejected") {
      return res.status(400).json({ message: "Richiesta già gestita" });
    }

    db.run(
      `UPDATE booking_requests SET
        status = 'rejected',
        admin_id = ?,
        rejection_reason = ?,
        responded_at = CURRENT_TIMESTAMP,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ?`,
      [req.user.id, rejection_reason, req.params.id],
      async function(err) {
        if (err) return res.status(500).json({ message: "Errore rifiuto" });

        // Notifica richiedente + segreterie
        const startDate = new Date(request.requested_start);
        await notifyRequesterAndSecretaries("request_rejected", request.requester_email, request.requester_name, {
          request_type: request.request_type === "room" ? "Sala riunioni" : "Veicolo",
          date: startDate.toLocaleDateString("it-IT"),
          rejection_reason: rejection_reason,
          requester_name: request.requester_name || request.requester_email
        }, parseInt(req.params.id), request.requester_id);

        res.json({ message: "Richiesta rifiutata" });
      }
    );
  });
});

// PUT - Controproposta (admin)
router.put("/:id/counter", requireRole("admin"), (req, res) => {
  const { counter_room_id, counter_vehicle_id, counter_start, counter_end, counter_reason } = req.body;

  if (!counter_reason) {
    return res.status(400).json({ message: "Motivazione della controproposta obbligatoria" });
  }

  db.get("SELECT * FROM booking_requests WHERE id = ?", [req.params.id], (err, request) => {
    if (err) return res.status(500).json({ message: "Errore database" });
    if (!request) return res.status(404).json({ message: "Richiesta non trovata" });
    if (request.status !== "pending") {
      return res.status(400).json({ message: "Richiesta già gestita" });
    }

    // Verifica che ci sia almeno una modifica
    const hasRoomChange = request.request_type === "room" && counter_room_id && counter_room_id !== request.room_id;
    const hasVehicleChange = request.request_type === "vehicle" && counter_vehicle_id && counter_vehicle_id !== request.vehicle_id;
    const hasTimeChange = counter_start && counter_start !== request.requested_start;

    if (!hasRoomChange && !hasVehicleChange && !hasTimeChange) {
      return res.status(400).json({ message: "Nessuna modifica proposta" });
    }

    db.run(
      `UPDATE booking_requests SET
        status = 'counter_proposed',
        admin_id = ?,
        counter_room_id = ?,
        counter_vehicle_id = ?,
        counter_start = ?,
        counter_end = ?,
        counter_reason = ?,
        responded_at = CURRENT_TIMESTAMP,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ?`,
      [
        req.user.id,
        request.request_type === "room" ? (counter_room_id || request.room_id) : null,
        request.request_type === "vehicle" ? (counter_vehicle_id || request.vehicle_id) : null,
        counter_start || request.requested_start,
        counter_end || request.requested_end,
        counter_reason,
        req.params.id
      ],
      async function(err) {
        if (err) return res.status(500).json({ message: "Errore controproposta" });

        // Notifica richiedente + segreterie
        const origDate = new Date(request.requested_start);
        const counterDate = counter_start ? new Date(counter_start) : origDate;

        await notifyRequesterAndSecretaries("request_counter", request.requester_email, request.requester_name, {
          original_details: `${origDate.toLocaleDateString("it-IT")} alle ${origDate.toLocaleTimeString("it-IT", { hour: "2-digit", minute: "2-digit" })}`,
          counter_details: `${counterDate.toLocaleDateString("it-IT")} alle ${counterDate.toLocaleTimeString("it-IT", { hour: "2-digit", minute: "2-digit" })}`,
          counter_reason: counter_reason,
          requester_name: request.requester_name || request.requester_email
        }, parseInt(req.params.id), request.requester_id);

        res.json({ message: "Controproposta inviata" });
      }
    );
  });
});

// PUT - Accetta controproposta (richiedente)
router.put("/:id/accept-counter", (req, res) => {
  db.get("SELECT * FROM booking_requests WHERE id = ?", [req.params.id], (err, request) => {
    if (err) return res.status(500).json({ message: "Errore database" });
    if (!request) return res.status(404).json({ message: "Richiesta non trovata" });
    if (request.requester_id !== req.user.id) {
      return res.status(403).json({ message: "Non autorizzato" });
    }
    if (request.status !== "counter_proposed") {
      return res.status(400).json({ message: "Nessuna controproposta da accettare" });
    }

    db.run(
      `UPDATE booking_requests SET
        status = 'counter_accepted',
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ?`,
      [req.params.id],
      async function(err) {
        if (err) return res.status(500).json({ message: "Errore accettazione" });

        // Crea la prenotazione con i dati della controproposta
        if (request.request_type === "room") {
          db.run(
            `INSERT INTO room_meetings (room_id, title, description, start_time, end_time, organizer, created_by)
             VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [request.counter_room_id || request.room_id, request.meeting_title || "Riunione",
             request.meeting_description, request.counter_start, request.counter_end,
             request.requester_email, request.admin_id]
          );
        } else if (request.request_type === "vehicle") {
          db.run(
            `INSERT INTO vehicle_bookings (vehicle_id, driver_name, destination, purpose, start_time, end_time, created_by)
             VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [request.counter_vehicle_id || request.vehicle_id, request.driver_name || request.requester_email,
             request.destination, request.purpose, request.counter_start, request.counter_end, request.admin_id]
          );
        }

        // Notifica admin e segreteria che la controproposta è stata accettata
        const counterDate = new Date(request.counter_start);
        await notifyAllStaff("request_approved", {
          requester_name: request.requester_email,
          request_type: request.request_type === "room" ? "Sala riunioni" : "Veicolo",
          date: counterDate.toLocaleDateString("it-IT"),
          start_time: counterDate.toLocaleTimeString("it-IT", { hour: "2-digit", minute: "2-digit" }),
          end_time: request.counter_end ? new Date(request.counter_end).toLocaleTimeString("it-IT", { hour: "2-digit", minute: "2-digit" }) : "N/A",
          details: `Controproposta accettata - ${request.request_type === "room" ? `Titolo: ${request.meeting_title || "N/A"}` : `Destinazione: ${request.destination || "N/A"}`}`
        }, null, parseInt(req.params.id));

        res.json({ message: "Controproposta accettata" });
      }
    );
  });
});

// PUT - Rifiuta controproposta (richiedente)
router.put("/:id/reject-counter", (req, res) => {
  db.get("SELECT * FROM booking_requests WHERE id = ?", [req.params.id], (err, request) => {
    if (err) return res.status(500).json({ message: "Errore database" });
    if (!request) return res.status(404).json({ message: "Richiesta non trovata" });
    if (request.requester_id !== req.user.id) {
      return res.status(403).json({ message: "Non autorizzato" });
    }
    if (request.status !== "counter_proposed") {
      return res.status(400).json({ message: "Nessuna controproposta da rifiutare" });
    }

    db.run(
      `UPDATE booking_requests SET
        status = 'counter_rejected',
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ?`,
      [req.params.id],
      async function(err) {
        if (err) return res.status(500).json({ message: "Errore rifiuto" });

        // Notifica admin e segreteria che la controproposta è stata rifiutata
        const origDate = new Date(request.requested_start);
        await notifyAllStaff("request_rejected", {
          requester_name: request.requester_email,
          request_type: request.request_type === "room" ? "Sala riunioni" : "Veicolo",
          date: origDate.toLocaleDateString("it-IT"),
          rejection_reason: `La controproposta è stata rifiutata dall'utente. La richiesta originale era per ${origDate.toLocaleDateString("it-IT")} alle ${origDate.toLocaleTimeString("it-IT", { hour: "2-digit", minute: "2-digit" })}.`
        }, null, parseInt(req.params.id));

        res.json({ message: "Controproposta rifiutata" });
      }
    );
  });
});

// DELETE - Annulla richiesta (richiedente)
router.delete("/:id", (req, res) => {
  db.get("SELECT * FROM booking_requests WHERE id = ?", [req.params.id], (err, request) => {
    if (err) return res.status(500).json({ message: "Errore database" });
    if (!request) return res.status(404).json({ message: "Richiesta non trovata" });

    const isAdmin = req.user.role === "admin";
    if (!isAdmin && request.requester_id !== req.user.id) {
      return res.status(403).json({ message: "Non autorizzato" });
    }

    if (request.status === "approved" || request.status === "counter_accepted") {
      return res.status(400).json({ message: "Non puoi annullare una richiesta già approvata" });
    }

    db.run(
      `UPDATE booking_requests SET
        status = 'cancelled',
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ?`,
      [req.params.id],
      function(err) {
        if (err) return res.status(500).json({ message: "Errore annullamento" });
        res.json({ message: "Richiesta annullata" });
      }
    );
  });
});

export default router;
