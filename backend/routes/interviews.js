import express from "express";
import db from "../db.js";
import { requireRole } from "../rolesMiddleware.js";

const router = express.Router();

// Lista colloqui per calendario (entrambi i ruoli)
router.get("/", (req, res) => {
  const { from, to, candidate_id } = req.query;

  const params = [];
  let where = "1=1";

  if (from) {
    where += " AND datetime(scheduled_at) >= datetime(?)";
    params.push(from);
  }
  if (to) {
    where += " AND datetime(scheduled_at) <= datetime(?)";
    params.push(to);
  }
  if (candidate_id) {
    where += " AND candidate_id = ?";
    params.push(candidate_id);
  }

  let sql = `
    SELECT i.id, i.candidate_id, i.scheduled_at, i.location, i.status,
           i.feedback, i.strengths, i.weaknesses,
           c.first_name, c.last_name
    FROM interviews i
    JOIN candidates c ON c.id = i.candidate_id
    WHERE ${where}
    ORDER BY datetime(i.scheduled_at) ASC
  `;

  db.all(sql, params, (err, rows) => {
    if (err) return res.status(500).json({ message: "Errore DB" });

    if (req.user.role === "secretary") {
      rows = rows.map(r => ({
        id: r.id,
        candidate_id: r.candidate_id,
        scheduled_at: r.scheduled_at,
        location: r.location,
        status: r.status,
        first_name: r.first_name,
        last_name: r.last_name
      }));
    }

    res.json(rows);
  });
});

// Creazione colloquio – admin o segreteria
router.post("/", requireRole("admin", "secretary"), (req, res) => {
  const { candidate_id, scheduled_at, location } = req.body;

  if (!candidate_id || !scheduled_at) {
    return res.status(400).json({ message: "candidate_id e scheduled_at sono obbligatori" });
  }

  db.run(
    `
    INSERT INTO interviews (candidate_id, scheduled_at, location, created_by)
    VALUES (?, ?, ?, ?)
  `,
    [candidate_id, scheduled_at, location || null, req.user.id],
    function (err) {
      if (err) return res.status(500).json({ message: "Errore DB" });
      res.status(201).json({ id: this.lastID });
    }
  );
});

// Aggiornamento colloquio – segreteria può cambiare solo schedule/location/status, admin anche feedback
router.put("/:id", requireRole("admin", "secretary"), (req, res) => {
  const { scheduled_at, location, status, feedback, strengths, weaknesses } = req.body;

  const isAdmin = req.user.role === "admin";

  const fields = [];
  const params = [];

  if (scheduled_at !== undefined) {
    fields.push("scheduled_at = ?");
    params.push(scheduled_at);
  }
  if (location !== undefined) {
    fields.push("location = ?");
    params.push(location);
  }
  if (status !== undefined) {
    fields.push("status = ?");
    params.push(status);
  }

  if (isAdmin) {
    if (feedback !== undefined) {
      fields.push("feedback = ?");
      params.push(feedback || null);
    }
    if (strengths !== undefined) {
      fields.push("strengths = ?");
      params.push(strengths || null);
    }
    if (weaknesses !== undefined) {
      fields.push("weaknesses = ?");
      params.push(weaknesses || null);
    }
  }

  fields.push("updated_by = ?");
  params.push(req.user.id);
  params.push(req.params.id);

  const sql = `
    UPDATE interviews
    SET ${fields.join(", ")}
    WHERE id = ?
  `;

  db.run(sql, params, function (err) {
    if (err) return res.status(500).json({ message: "Errore DB" });
    if (this.changes === 0) return res.status(404).json({ message: "Colloquio non trovato" });
    res.json({ message: "Aggiornato" });
  });
});

// Dettaglio colloquio – admin vede tutto, segreteria vede limitato
router.get("/:id", (req, res) => {
  db.get(
    `
    SELECT i.*, c.first_name, c.last_name
    FROM interviews i
    JOIN candidates c ON c.id = i.candidate_id
    WHERE i.id = ?
  `,
    [req.params.id],
    (err, row) => {
      if (err) return res.status(500).json({ message: "Errore DB" });
      if (!row) return res.status(404).json({ message: "Colloquio non trovato" });

      if (req.user.role === "secretary") {
        delete row.feedback;
        delete row.strengths;
        delete row.weaknesses;
      }

      res.json(row);
    }
  );
});

export default router;
