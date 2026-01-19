import express from "express";
import db from "../db.js";
import { requireRole } from "../rolesMiddleware.js";

const router = express.Router();

// Lista candidati – admin e segreteria (con filtro opzionale per idoneità)
router.get("/", requireRole("admin", "secretary"), (req, res) => {
  const { suitability } = req.query;

  let sql = "SELECT * FROM candidates";
  const params = [];

  if (suitability && suitability !== "all") {
    sql += " WHERE suitability = ?";
    params.push(suitability);
  }

  sql += " ORDER BY last_name, first_name";

  db.all(sql, params, (err, rows) => {
    if (err) return res.status(500).json({ message: "Errore DB" });
    res.json(rows);
  });
});

// Creazione candidato – admin o segreteria
router.post("/", requireRole("admin", "secretary"), (req, res) => {
  const { first_name, last_name, email, phone, notes } = req.body;

  if (!first_name || !last_name) {
    return res.status(400).json({ message: "Nome e cognome sono obbligatori" });
  }

  db.run(
    `
    INSERT INTO candidates (first_name, last_name, email, phone, notes)
    VALUES (?, ?, ?, ?, ?)
  `,
    [first_name, last_name, email || null, phone || null, notes || null],
    function (err) {
      if (err) return res.status(500).json({ message: "Errore DB" });
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
    `UPDATE candidates SET first_name = ?, last_name = ?, email = ?, phone = ?, notes = ?, suitability = ? WHERE id = ?`,
    [first_name, last_name, email || null, phone || null, notes || null, suitability || 'Da valutare', req.params.id],
    function (err) {
      if (err) return res.status(500).json({ message: 'Errore DB' });
      if (this.changes === 0) return res.status(404).json({ message: 'Candidato non trovato' });
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
    `UPDATE candidates SET suitability = ? WHERE id = ?`,
    [suitability, req.params.id],
    function (err) {
      if (err) return res.status(500).json({ message: 'Errore DB' });
      if (this.changes === 0) return res.status(404).json({ message: 'Candidato non trovato' });
      res.json({ updated: true });
    }
  );
});

export default router;
