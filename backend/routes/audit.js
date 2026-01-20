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

// Lista audit log (solo admin)
router.get("/", requireRole("admin"), (req, res) => {
  const { entity_type, entity_id, limit = 100, offset = 0 } = req.query;

  let sql = `SELECT * FROM audit_log`;
  const params = [];
  const conditions = [];

  if (entity_type) {
    conditions.push("entity_type = ?");
    params.push(entity_type);
  }
  if (entity_id) {
    conditions.push("entity_id = ?");
    params.push(entity_id);
  }

  if (conditions.length > 0) {
    sql += " WHERE " + conditions.join(" AND ");
  }

  sql += " ORDER BY created_at DESC LIMIT ? OFFSET ?";
  params.push(parseInt(limit), parseInt(offset));

  db.all(sql, params, (err, rows) => {
    if (err) return res.status(500).json({ message: "Errore DB" });
    res.json(rows);
  });
});

// Storico di un candidato specifico
router.get("/candidate/:id", requireRole("admin"), (req, res) => {
  const { id } = req.params;
  db.all(
    `SELECT * FROM audit_log
     WHERE (entity_type = 'candidate' AND entity_id = ?)
        OR (entity_type = 'document' AND details LIKE ?)
        OR (entity_type = 'interview' AND details LIKE ?)
     ORDER BY created_at DESC`,
    [id, `%"candidate_id":${id}%`, `%"candidate_id":${id}%`],
    (err, rows) => {
      if (err) return res.status(500).json({ message: "Errore DB" });
      res.json(rows);
    }
  );
});

export default router;
