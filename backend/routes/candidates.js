import express from "express";
import db from "../db.js";
import { requireRole } from "../rolesMiddleware.js";
import { logAudit } from "./audit.js";

const router = express.Router();

// Lista candidati – admin e segreteria (con filtro, ordinamento, paginazione)
router.get("/", requireRole("admin", "secretary"), (req, res) => {
  const { suitability, sort = "last_name", order = "asc", limit, offset = 0, search } = req.query;

  let sql = `SELECT c.*,
    (SELECT COUNT(*) FROM interviews WHERE candidate_id = c.id) as interview_count
    FROM candidates c`;
  const params = [];
  const conditions = [];

  if (suitability && suitability !== "all") {
    conditions.push("c.suitability = ?");
    params.push(suitability);
  }

  if (search) {
    conditions.push("(c.first_name LIKE ? OR c.last_name LIKE ? OR c.email LIKE ? OR c.phone LIKE ?)");
    const searchTerm = `%${search}%`;
    params.push(searchTerm, searchTerm, searchTerm, searchTerm);
  }

  if (conditions.length > 0) {
    sql += " WHERE " + conditions.join(" AND ");
  }

  // Ordinamento sicuro
  const allowedSorts = ["last_name", "first_name", "email", "suitability", "created_at", "interview_count"];
  const sortField = allowedSorts.includes(sort) ? sort : "last_name";
  const sortOrder = order.toLowerCase() === "desc" ? "DESC" : "ASC";
  sql += ` ORDER BY ${sortField === "interview_count" ? sortField : "c." + sortField} ${sortOrder}`;

  // Paginazione
  if (limit) {
    sql += " LIMIT ? OFFSET ?";
    params.push(parseInt(limit), parseInt(offset));
  }

  // Prima ottieni il count totale
  let countSql = "SELECT COUNT(*) as total FROM candidates c";
  if (conditions.length > 0) {
    countSql += " WHERE " + conditions.join(" AND ");
  }

  db.get(countSql, params.slice(0, conditions.length > 0 ? (search ? 4 : 1) : 0), (err, countRow) => {
    if (err) return res.status(500).json({ message: "Errore DB" });

    db.all(sql, params, (err, rows) => {
      if (err) return res.status(500).json({ message: "Errore DB" });
      res.json({
        data: rows,
        total: countRow.total,
        limit: limit ? parseInt(limit) : null,
        offset: parseInt(offset)
      });
    });
  });
});

// Creazione candidato – admin o segreteria
router.post("/", requireRole("admin", "secretary"), (req, res) => {
  const { first_name, last_name, email, phone, notes } = req.body;

  if (!first_name || !last_name) {
    return res.status(400).json({ message: "Nome e cognome sono obbligatori" });
  }

  db.run(
    `INSERT INTO candidates (first_name, last_name, email, phone, notes, created_at)
     VALUES (?, ?, ?, ?, ?, datetime('now'))`,
    [first_name, last_name, email || null, phone || null, notes || null],
    function (err) {
      if (err) return res.status(500).json({ message: "Errore DB" });

      logAudit(req.user.id, req.user.email, "create", "candidate", this.lastID, { first_name, last_name });

      res.status(201).json({ id: this.lastID });
    }
  );
});

// Dettaglio candidato – solo admin
router.get("/:id", requireRole("admin"), (req, res) => {
  db.get("SELECT * FROM candidates WHERE id = ?", [req.params.id], (err, row) => {
    if (err) return res.status(500).json({ message: "Errore DB" });
    if (!row) return res.status(404).json({ message: "Candidato non trovato" });
    res.json(row);
  });
});


// Modifica candidato – admin o segreteria
router.put('/:id', requireRole('admin', 'secretary'), (req, res) => {
  const { first_name, last_name, email, phone, notes, suitability } = req.body;
  if (!first_name || !last_name) {
    return res.status(400).json({ message: 'Nome e cognome sono obbligatori' });
  }

  // Validate suitability if provided
  const validSuitability = ['Da valutare', 'Idoneo', 'Non idoneo'];
  if (suitability && !validSuitability.includes(suitability)) {
    return res.status(400).json({ message: 'Valore idoneità non valido' });
  }

  db.run(
    `UPDATE candidates SET first_name = ?, last_name = ?, email = ?, phone = ?, notes = ?, suitability = ?, updated_at = datetime('now') WHERE id = ?`,
    [first_name, last_name, email || null, phone || null, notes || null, suitability || 'Da valutare', req.params.id],
    function (err) {
      if (err) return res.status(500).json({ message: 'Errore DB' });
      if (this.changes === 0) return res.status(404).json({ message: 'Candidato non trovato' });

      logAudit(req.user.id, req.user.email, "update", "candidate", parseInt(req.params.id), { first_name, last_name, suitability });

      res.json({ updated: true });
    }
  );
});

// Aggiorna solo l'idoneità del candidato – admin
router.patch('/:id/suitability', requireRole('admin'), (req, res) => {
  const { suitability } = req.body;
  const validSuitability = ['Da valutare', 'Idoneo', 'Non idoneo'];

  if (!suitability || !validSuitability.includes(suitability)) {
    return res.status(400).json({ message: 'Valore idoneità non valido' });
  }

  db.run(
    `UPDATE candidates SET suitability = ?, updated_at = datetime('now') WHERE id = ?`,
    [suitability, req.params.id],
    function (err) {
      if (err) return res.status(500).json({ message: 'Errore DB' });
      if (this.changes === 0) return res.status(404).json({ message: 'Candidato non trovato' });

      logAudit(req.user.id, req.user.email, "update_suitability", "candidate", parseInt(req.params.id), { suitability });

      res.json({ updated: true });
    }
  );
});

// Elimina candidato – solo admin
router.delete('/:id', requireRole('admin'), (req, res) => {
  const { id } = req.params;

  // Prima verifica se esistono colloqui associati
  db.get("SELECT COUNT(*) as count FROM interviews WHERE candidate_id = ?", [id], (err, row) => {
    if (err) return res.status(500).json({ message: "Errore DB" });

    if (row.count > 0) {
      return res.status(400).json({
        message: `Non è possibile eliminare il candidato: esistono ${row.count} colloqui associati. Elimina prima i colloqui.`
      });
    }

    // Recupera info candidato per il log
    db.get("SELECT first_name, last_name FROM candidates WHERE id = ?", [id], (err, candidate) => {
      if (err) return res.status(500).json({ message: "Errore DB" });
      if (!candidate) return res.status(404).json({ message: "Candidato non trovato" });

      // Elimina documenti associati
      db.run("DELETE FROM documents WHERE candidate_id = ?", [id], (err) => {
        if (err) return res.status(500).json({ message: "Errore DB" });

        // Elimina candidato
        db.run("DELETE FROM candidates WHERE id = ?", [id], function (err) {
          if (err) return res.status(500).json({ message: "Errore DB" });

          logAudit(req.user.id, req.user.email, "delete", "candidate", parseInt(id), {
            first_name: candidate.first_name,
            last_name: candidate.last_name
          });

          res.json({ deleted: true });
        });
      });
    });
  });
});

export default router;
