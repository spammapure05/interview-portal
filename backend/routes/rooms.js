import express from "express";
import db from "../db.js";
import { requireRole } from "../rolesMiddleware.js";
import { logAudit } from "./audit.js";

const router = express.Router();

// Lista tutte le sale (tutti gli utenti autenticati)
router.get("/", (req, res) => {
  const { active } = req.query;
  let sql = "SELECT * FROM rooms";
  const params = [];

  if (active === "true") {
    sql += " WHERE active = 1";
  }

  sql += " ORDER BY name";

  db.all(sql, params, (err, rows) => {
    if (err) return res.status(500).json({ message: "Errore DB" });
    res.json(rows);
  });
});

// Dettaglio sala
router.get("/:id", (req, res) => {
  const { id } = req.params;
  db.get("SELECT * FROM rooms WHERE id = ?", [id], (err, row) => {
    if (err) return res.status(500).json({ message: "Errore DB" });
    if (!row) return res.status(404).json({ message: "Sala non trovata" });
    res.json(row);
  });
});

// Crea nuova sala (solo admin)
router.post("/", requireRole("admin"), (req, res) => {
  const { name, capacity, description, color } = req.body;

  if (!name) {
    return res.status(400).json({ message: "Il nome è obbligatorio" });
  }

  db.run(
    `INSERT INTO rooms (name, capacity, description, color) VALUES (?, ?, ?, ?)`,
    [name, capacity || null, description || null, color || "#3B82F6"],
    function (err) {
      if (err) {
        if (err.message.includes("UNIQUE constraint")) {
          return res.status(400).json({ message: "Nome sala già esistente" });
        }
        return res.status(500).json({ message: "Errore DB" });
      }

      logAudit(req.user.id, req.user.email, "create", "room", this.lastID, { name, capacity });

      res.status(201).json({
        id: this.lastID,
        name,
        capacity,
        description,
        color: color || "#3B82F6",
        active: 1
      });
    }
  );
});

// Modifica sala (solo admin)
router.put("/:id", requireRole("admin"), (req, res) => {
  const { id } = req.params;
  const { name, capacity, description, color, active } = req.body;

  if (!name) {
    return res.status(400).json({ message: "Il nome è obbligatorio" });
  }

  db.run(
    `UPDATE rooms SET name = ?, capacity = ?, description = ?, color = ?, active = ? WHERE id = ?`,
    [name, capacity || null, description || null, color || "#3B82F6", active !== undefined ? active : 1, id],
    function (err) {
      if (err) {
        if (err.message.includes("UNIQUE constraint")) {
          return res.status(400).json({ message: "Nome sala già esistente" });
        }
        return res.status(500).json({ message: "Errore DB" });
      }
      if (this.changes === 0) {
        return res.status(404).json({ message: "Sala non trovata" });
      }

      logAudit(req.user.id, req.user.email, "update", "room", parseInt(id), { name, capacity, active });

      res.json({ updated: true });
    }
  );
});

// Elimina sala (solo admin)
router.delete("/:id", requireRole("admin"), (req, res) => {
  const { id } = req.params;

  // Prima verifica se ci sono riunioni future per questa sala
  db.get(
    "SELECT COUNT(*) as count FROM room_meetings WHERE room_id = ? AND start_time > datetime('now')",
    [id],
    (err, result) => {
      if (err) return res.status(500).json({ message: "Errore DB" });

      if (result.count > 0) {
        return res.status(400).json({
          message: `Non è possibile eliminare la sala: ci sono ${result.count} riunioni future programmate`
        });
      }

      db.get("SELECT name FROM rooms WHERE id = ?", [id], (err, room) => {
        if (err) return res.status(500).json({ message: "Errore DB" });
        if (!room) return res.status(404).json({ message: "Sala non trovata" });

        // Elimina prima le riunioni passate della sala
        db.run("DELETE FROM room_meetings WHERE room_id = ?", [id], (err) => {
          if (err) return res.status(500).json({ message: "Errore DB" });

          db.run("DELETE FROM rooms WHERE id = ?", [id], function (err) {
            if (err) return res.status(500).json({ message: "Errore DB" });

            logAudit(req.user.id, req.user.email, "delete", "room", parseInt(id), { name: room.name });

            res.json({ deleted: true });
          });
        });
      });
    }
  );
});

export default router;
