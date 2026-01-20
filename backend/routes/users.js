import express from "express";
import bcrypt from "bcrypt";
import db from "../db.js";
import { requireRole } from "../rolesMiddleware.js";
import { logAudit } from "./audit.js";

const router = express.Router();

// Lista utenti (solo admin)
router.get("/", requireRole("admin"), (req, res) => {
  db.all(
    "SELECT id, email, role FROM users ORDER BY email",
    (err, rows) => {
      if (err) return res.status(500).json({ message: "Errore DB" });
      res.json(rows);
    }
  );
});

// Dettaglio utente
router.get("/:id", requireRole("admin"), (req, res) => {
  const { id } = req.params;
  db.get(
    "SELECT id, email, role FROM users WHERE id = ?",
    [id],
    (err, row) => {
      if (err) return res.status(500).json({ message: "Errore DB" });
      if (!row) return res.status(404).json({ message: "Utente non trovato" });
      res.json(row);
    }
  );
});

// Crea nuovo utente
router.post("/", requireRole("admin"), async (req, res) => {
  const { email, password, role } = req.body;

  if (!email || !password) {
    return res.status(400).json({ message: "Email e password sono obbligatori" });
  }

  if (!["admin", "secretary"].includes(role)) {
    return res.status(400).json({ message: "Ruolo non valido" });
  }

  try {
    const hashedPassword = await bcrypt.hash(password, 10);

    db.run(
      "INSERT INTO users (email, password_hash, role) VALUES (?, ?, ?)",
      [email.toLowerCase(), hashedPassword, role],
      function (err) {
        if (err) {
          if (err.message.includes("UNIQUE constraint")) {
            return res.status(400).json({ message: "Email già esistente" });
          }
          return res.status(500).json({ message: "Errore DB" });
        }

        logAudit(req.user.id, req.user.email, "create", "user", this.lastID, { email, role });

        res.status(201).json({ id: this.lastID, email, role });
      }
    );
  } catch (err) {
    res.status(500).json({ message: "Errore server" });
  }
});

// Modifica utente
router.put("/:id", requireRole("admin"), async (req, res) => {
  const { id } = req.params;
  const { email, password, role } = req.body;

  if (!email) {
    return res.status(400).json({ message: "Email è obbligatoria" });
  }

  if (role && !["admin", "secretary"].includes(role)) {
    return res.status(400).json({ message: "Ruolo non valido" });
  }

  try {
    // Se password fornita, hashala
    let updateQuery, params;
    if (password) {
      const hashedPassword = await bcrypt.hash(password, 10);
      updateQuery = "UPDATE users SET email = ?, password_hash = ?, role = ? WHERE id = ?";
      params = [email.toLowerCase(), hashedPassword, role, id];
    } else {
      updateQuery = "UPDATE users SET email = ?, role = ? WHERE id = ?";
      params = [email.toLowerCase(), role, id];
    }

    db.run(updateQuery, params, function (err) {
      if (err) {
        if (err.message.includes("UNIQUE constraint")) {
          return res.status(400).json({ message: "Email già esistente" });
        }
        return res.status(500).json({ message: "Errore DB" });
      }
      if (this.changes === 0) {
        return res.status(404).json({ message: "Utente non trovato" });
      }

      logAudit(req.user.id, req.user.email, "update", "user", parseInt(id), { email, role, passwordChanged: !!password });

      res.json({ updated: true });
    });
  } catch (err) {
    res.status(500).json({ message: "Errore server" });
  }
});

// Elimina utente
router.delete("/:id", requireRole("admin"), (req, res) => {
  const { id } = req.params;

  // Non permettere di eliminare se stessi
  if (parseInt(id) === req.user.id) {
    return res.status(400).json({ message: "Non puoi eliminare il tuo account" });
  }

  db.get("SELECT email FROM users WHERE id = ?", [id], (err, user) => {
    if (err) return res.status(500).json({ message: "Errore DB" });
    if (!user) return res.status(404).json({ message: "Utente non trovato" });

    db.run("DELETE FROM users WHERE id = ?", [id], function (err) {
      if (err) return res.status(500).json({ message: "Errore DB" });

      logAudit(req.user.id, req.user.email, "delete", "user", parseInt(id), { email: user.email });

      res.json({ deleted: true });
    });
  });
});

export default router;
