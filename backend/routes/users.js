import express from "express";
import bcrypt from "bcrypt";
import db from "../db.js";
import { requireRole } from "../rolesMiddleware.js";
import { logAudit } from "./audit.js";
import { sendEmail } from "../services/emailService.js";

const router = express.Router();

// Lista utenti (solo admin)
router.get("/", requireRole("admin"), (req, res) => {
  db.all(
    "SELECT id, email, role, totp_enabled, totp_required FROM users ORDER BY email",
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
    "SELECT id, email, role, totp_enabled, totp_required FROM users WHERE id = ?",
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

  if (!["admin", "secretary", "viewer"].includes(role)) {
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

  if (role && !["admin", "secretary", "viewer"].includes(role)) {
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

// Invia credenziali via email
router.post("/:id/send-credentials", requireRole("admin"), async (req, res) => {
  const { id } = req.params;
  const { password } = req.body;

  if (!password) {
    return res.status(400).json({ message: "Password obbligatoria per l'invio delle credenziali" });
  }

  db.get("SELECT id, email, role FROM users WHERE id = ?", [id], async (err, user) => {
    if (err) return res.status(500).json({ message: "Errore DB" });
    if (!user) return res.status(404).json({ message: "Utente non trovato" });

    // Traduci il ruolo per l'email
    const roleNames = {
      admin: "Amministratore",
      secretary: "Segreteria",
      viewer: "Visualizzatore"
    };

    const htmlContent = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #3B82F6;">Credenziali di Accesso</h2>
        <p>Ciao,</p>
        <p>Ecco le tue credenziali per accedere al portale:</p>
        <div style="background-color: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <p style="margin: 8px 0;"><strong>Email:</strong> ${user.email}</p>
          <p style="margin: 8px 0;"><strong>Password:</strong> <code style="background: #e5e7eb; padding: 2px 6px; border-radius: 4px;">${password}</code></p>
          <p style="margin: 8px 0;"><strong>Ruolo:</strong> ${roleNames[user.role] || user.role}</p>
        </div>
        <p style="color: #ef4444; font-size: 14px;">
          <strong>Importante:</strong> Ti consigliamo di cambiare la password al primo accesso.
        </p>
        <p style="color: #6b7280; font-size: 12px; margin-top: 30px;">
          Questo messaggio e stato generato automaticamente dal sistema.
        </p>
      </div>
    `;

    try {
      await sendEmail(user.email, "Credenziali di Accesso al Portale", htmlContent);

      logAudit(req.user.id, req.user.email, "send_credentials", "user", parseInt(id), { email: user.email });

      res.json({ sent: true, message: "Credenziali inviate con successo" });
    } catch (error) {
      console.error("Errore invio credenziali:", error);
      res.status(500).json({ message: "Errore nell'invio dell'email. Verifica la configurazione SMTP." });
    }
  });
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
