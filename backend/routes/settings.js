import express from "express";
import db from "../db.js";
import { authenticateToken, requireAdmin } from "../middleware/auth.js";

const router = express.Router();

// Get SMTP configuration (admin only)
router.get("/smtp", authenticateToken, requireAdmin, (req, res) => {
  db.get("SELECT * FROM smtp_config WHERE id = 1", (err, row) => {
    if (err) return res.status(500).json({ message: "Errore database" });

    if (!row) {
      return res.json({
        host: "",
        port: 587,
        secure: false,
        username: "",
        password: "",
        from_email: "",
        from_name: "Interview Portal",
        enabled: false
      });
    }

    // Don't send password in plain text - just indicate if it's set
    res.json({
      ...row,
      secure: !!row.secure,
      enabled: !!row.enabled,
      password: row.password ? "********" : ""
    });
  });
});

// Update SMTP configuration (admin only)
router.put("/smtp", authenticateToken, requireAdmin, (req, res) => {
  const { host, port, secure, username, password, from_email, from_name, enabled } = req.body;

  if (!host || !from_email) {
    return res.status(400).json({ message: "Host e email mittente sono obbligatori" });
  }

  // Check if config exists
  db.get("SELECT id, password FROM smtp_config WHERE id = 1", (err, existing) => {
    if (err) return res.status(500).json({ message: "Errore database" });

    // Keep existing password if not changed
    const finalPassword = password === "********" ? existing?.password : password;

    if (existing) {
      db.run(
        `UPDATE smtp_config SET
          host = ?, port = ?, secure = ?, username = ?, password = ?,
          from_email = ?, from_name = ?, enabled = ?,
          updated_at = CURRENT_TIMESTAMP, updated_by = ?
        WHERE id = 1`,
        [host, port || 587, secure ? 1 : 0, username, finalPassword, from_email, from_name || "Interview Portal", enabled ? 1 : 0, req.user.id],
        function(err) {
          if (err) return res.status(500).json({ message: "Errore salvataggio" });
          res.json({ message: "Configurazione SMTP salvata" });
        }
      );
    } else {
      db.run(
        `INSERT INTO smtp_config (id, host, port, secure, username, password, from_email, from_name, enabled, updated_by)
         VALUES (1, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [host, port || 587, secure ? 1 : 0, username, finalPassword, from_email, from_name || "Interview Portal", enabled ? 1 : 0, req.user.id],
        function(err) {
          if (err) return res.status(500).json({ message: "Errore salvataggio" });
          res.json({ message: "Configurazione SMTP salvata" });
        }
      );
    }
  });
});

// Test SMTP connection (admin only)
router.post("/smtp/test", authenticateToken, requireAdmin, async (req, res) => {
  const { test_email } = req.body;

  if (!test_email) {
    return res.status(400).json({ message: "Email di test obbligatoria" });
  }

  db.get("SELECT * FROM smtp_config WHERE id = 1", async (err, config) => {
    if (err) return res.status(500).json({ message: "Errore database" });
    if (!config) return res.status(400).json({ message: "Configurazione SMTP non presente" });

    try {
      // Dynamic import of nodemailer
      const nodemailer = await import("nodemailer");

      const transporter = nodemailer.default.createTransport({
        host: config.host,
        port: config.port,
        secure: !!config.secure,
        auth: config.username ? {
          user: config.username,
          pass: config.password
        } : undefined
      });

      await transporter.verify();

      await transporter.sendMail({
        from: `"${config.from_name}" <${config.from_email}>`,
        to: test_email,
        subject: "Test connessione SMTP - Interview Portal",
        html: `
          <h2>Test SMTP riuscito!</h2>
          <p>La configurazione SMTP è corretta e funzionante.</p>
          <p>Questo è un messaggio di test inviato da Interview Portal.</p>
        `
      });

      res.json({ message: "Email di test inviata con successo" });
    } catch (error) {
      console.error("SMTP test error:", error);
      res.status(500).json({ message: `Errore SMTP: ${error.message}` });
    }
  });
});

// Get all notification templates
router.get("/templates", authenticateToken, requireAdmin, (req, res) => {
  db.all("SELECT * FROM notification_templates ORDER BY type", (err, rows) => {
    if (err) return res.status(500).json({ message: "Errore database" });
    res.json(rows.map(r => ({ ...r, enabled: !!r.enabled })));
  });
});

// Get single notification template
router.get("/templates/:type", authenticateToken, requireAdmin, (req, res) => {
  db.get("SELECT * FROM notification_templates WHERE type = ?", [req.params.type], (err, row) => {
    if (err) return res.status(500).json({ message: "Errore database" });
    if (!row) return res.status(404).json({ message: "Template non trovato" });
    res.json({ ...row, enabled: !!row.enabled });
  });
});

// Update notification template
router.put("/templates/:type", authenticateToken, requireAdmin, (req, res) => {
  const { name, subject, body, enabled, hours_before } = req.body;

  if (!name || !subject || !body) {
    return res.status(400).json({ message: "Nome, oggetto e corpo sono obbligatori" });
  }

  db.run(
    `UPDATE notification_templates SET
      name = ?, subject = ?, body = ?, enabled = ?, hours_before = ?,
      updated_at = CURRENT_TIMESTAMP, updated_by = ?
    WHERE type = ?`,
    [name, subject, body, enabled ? 1 : 0, hours_before || 24, req.user.id, req.params.type],
    function(err) {
      if (err) return res.status(500).json({ message: "Errore salvataggio" });
      if (this.changes === 0) return res.status(404).json({ message: "Template non trovato" });
      res.json({ message: "Template salvato" });
    }
  );
});

export default router;
