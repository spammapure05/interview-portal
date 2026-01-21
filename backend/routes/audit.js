import express from "express";
import db from "../db.js";
import { requireRole } from "../rolesMiddleware.js";

const router = express.Router();

// Funzione helper per loggare azioni
export const logAudit = (userId, userEmail, action, entityType, entityId, details = null) => {
  db.run(
    `INSERT INTO audit_log (user_id, user_email, action, entity_type, entity_id, details)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [userId, userEmail, action, entityType, entityId, details ? JSON.stringify(details) : null]
  );
};

// Whitelist entity types validi
const validEntityTypes = ["candidate", "interview", "document", "user", "room", "room_meeting", "vehicle", "vehicle_booking", "booking_request"];

// Lista audit log (solo admin)
router.get("/", requireRole("admin"), (req, res) => {
  const { entity_type, entity_id, limit = 100, offset = 0 } = req.query;

  let sql = `SELECT * FROM audit_log`;
  const params = [];
  const conditions = [];

  if (entity_type) {
    // Valida entity_type contro whitelist
    if (!validEntityTypes.includes(entity_type)) {
      return res.status(400).json({ message: "Tipo entità non valido" });
    }
    conditions.push("entity_type = ?");
    params.push(entity_type);
  }
  if (entity_id) {
    const parsedId = parseInt(entity_id, 10);
    if (isNaN(parsedId) || parsedId <= 0) {
      return res.status(400).json({ message: "ID entità non valido" });
    }
    conditions.push("entity_id = ?");
    params.push(parsedId);
  }

  if (conditions.length > 0) {
    sql += " WHERE " + conditions.join(" AND ");
  }

  // Limita il massimo di risultati per evitare DoS
  const parsedLimit = Math.min(parseInt(limit, 10) || 100, 500);
  const parsedOffset = parseInt(offset, 10) || 0;

  sql += " ORDER BY created_at DESC LIMIT ? OFFSET ?";
  params.push(parsedLimit, parsedOffset);

  db.all(sql, params, (err, rows) => {
    if (err) return res.status(500).json({ message: "Errore DB" });
    res.json(rows);
  });
});

// Storico di un candidato specifico
router.get("/candidate/:id", requireRole("admin"), (req, res) => {
  const { id } = req.params;

  // Validazione: assicurarsi che sia un numero valido
  const candidateId = parseInt(id, 10);
  if (isNaN(candidateId) || candidateId <= 0) {
    return res.status(400).json({ message: "ID candidato non valido" });
  }

  // Costruisce pattern LIKE in modo sicuro (candidateId è ora un numero validato)
  const likePattern = `%"candidate_id":${candidateId}%`;

  db.all(
    `SELECT * FROM audit_log
     WHERE (entity_type = 'candidate' AND entity_id = ?)
        OR (entity_type = 'document' AND details LIKE ?)
        OR (entity_type = 'interview' AND details LIKE ?)
     ORDER BY created_at DESC`,
    [candidateId, likePattern, likePattern],
    (err, rows) => {
      if (err) return res.status(500).json({ message: "Errore DB" });
      res.json(rows);
    }
  );
});

export default router;
