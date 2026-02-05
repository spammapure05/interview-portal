import express from "express";
import * as OTPLib from "otplib";
import QRCode from "qrcode";

const authenticator = OTPLib.authenticator;
import bcrypt from "bcrypt";
import crypto from "crypto";
import db from "../db.js";
import { requireRole } from "../rolesMiddleware.js";

const router = express.Router();

// Configure TOTP settings
authenticator.options = {
  window: 1,  // Allow 30 seconds tolerance
  step: 30   // 30-second intervals
};

// Helper: generate backup codes
function generateBackupCodes(count = 10) {
  const codes = [];
  for (let i = 0; i < count; i++) {
    const part1 = crypto.randomBytes(2).toString("hex").toUpperCase();
    const part2 = crypto.randomBytes(2).toString("hex").toUpperCase();
    codes.push(`${part1}-${part2}`);
  }
  return codes;
}

// Helper: hash backup codes
async function hashBackupCodes(codes) {
  const hashed = await Promise.all(
    codes.map(code => bcrypt.hash(code.replace("-", ""), 10))
  );
  return hashed;
}

// Helper: verify backup code
async function verifyBackupCode(inputCode, hashedCodes) {
  const normalizedInput = inputCode.replace("-", "").toUpperCase();
  for (let i = 0; i < hashedCodes.length; i++) {
    const match = await bcrypt.compare(normalizedInput, hashedCodes[i]);
    if (match) {
      return i; // Return index of matched code
    }
  }
  return -1; // No match found
}

// GET /2fa/status - Get current 2FA status
router.get("/status", (req, res) => {
  const userId = req.user.id;

  db.get(
    "SELECT totp_enabled, backup_codes FROM users WHERE id = ?",
    [userId],
    (err, user) => {
      if (err) return res.status(500).json({ message: "Errore DB" });
      if (!user) return res.status(404).json({ message: "Utente non trovato" });

      // Count backup codes
      let backupCodesCount = 0;
      if (user.backup_codes) {
        try {
          const codes = JSON.parse(user.backup_codes);
          backupCodesCount = codes.length;
        } catch (e) {}
      }

      // Count trusted devices
      db.get(
        "SELECT COUNT(*) as count FROM trusted_devices WHERE user_id = ? AND expires_at > datetime('now')",
        [userId],
        (err, result) => {
          if (err) return res.status(500).json({ message: "Errore DB" });

          res.json({
            enabled: user.totp_enabled === 1,
            hasBackupCodes: backupCodesCount > 0,
            backupCodesCount,
            trustedDevicesCount: result?.count || 0
          });
        }
      );
    }
  );
});

// POST /2fa/setup - Generate TOTP secret and QR code
router.post("/setup", async (req, res) => {
  const userId = req.user.id;
  const userEmail = req.user.email;

  try {
    // Check if 2FA is already enabled
    const user = await new Promise((resolve, reject) => {
      db.get("SELECT totp_enabled FROM users WHERE id = ?", [userId], (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });

    if (user?.totp_enabled === 1) {
      return res.status(400).json({ message: "2FA già attiva. Disattivala prima di configurarla nuovamente." });
    }

    // Generate new secret
    const secret = authenticator.generateSecret();

    // Generate QR code
    const otpauth = authenticator.keyuri(userEmail, "DCS Group Portal", secret);
    const qrCode = await QRCode.toDataURL(otpauth);

    res.json({
      secret,
      qrCode,
      manualEntry: secret
    });
  } catch (err) {
    console.error("Error in 2FA setup:", err);
    res.status(500).json({ message: "Errore durante la configurazione 2FA" });
  }
});

// POST /2fa/enable - Verify TOTP and enable 2FA
router.post("/enable", async (req, res) => {
  const userId = req.user.id;
  const { code, secret } = req.body;

  if (!code || !secret) {
    return res.status(400).json({ message: "Codice e secret richiesti" });
  }

  try {
    // Verify the TOTP code
    const isValid = authenticator.verify({ token: code, secret });
    if (!isValid) {
      return res.status(400).json({ message: "Codice non valido. Riprova." });
    }

    // Generate backup codes
    const backupCodes = generateBackupCodes(10);
    const hashedCodes = await hashBackupCodes(backupCodes);

    // Save to database
    await new Promise((resolve, reject) => {
      db.run(
        "UPDATE users SET totp_secret = ?, totp_enabled = 1, backup_codes = ? WHERE id = ?",
        [secret, JSON.stringify(hashedCodes), userId],
        function (err) {
          if (err) reject(err);
          else resolve(this.changes);
        }
      );
    });

    // Log to audit
    db.run(
      "INSERT INTO audit_log (user_id, user_email, action, entity_type, entity_id, details) VALUES (?, ?, ?, ?, ?, ?)",
      [userId, req.user.email, "enable", "2fa", userId, JSON.stringify({ action: "2FA enabled" })]
    );

    res.json({
      success: true,
      backupCodes // Plain text codes - show only once!
    });
  } catch (err) {
    console.error("Error enabling 2FA:", err);
    res.status(500).json({ message: "Errore durante l'attivazione 2FA" });
  }
});

// POST /2fa/disable - Disable 2FA
router.post("/disable", async (req, res) => {
  const userId = req.user.id;
  const { password, code } = req.body;

  if (!password || !code) {
    return res.status(400).json({ message: "Password e codice richiesti" });
  }

  try {
    // Get user data
    const user = await new Promise((resolve, reject) => {
      db.get(
        "SELECT password_hash, totp_secret, totp_enabled FROM users WHERE id = ?",
        [userId],
        (err, row) => {
          if (err) reject(err);
          else resolve(row);
        }
      );
    });

    if (!user || user.totp_enabled !== 1) {
      return res.status(400).json({ message: "2FA non attiva" });
    }

    // Verify password
    const passwordMatch = await bcrypt.compare(password, user.password_hash);
    if (!passwordMatch) {
      return res.status(400).json({ message: "Password non corretta" });
    }

    // Verify TOTP code
    const isValid = authenticator.verify({ token: code, secret: user.totp_secret });
    if (!isValid) {
      return res.status(400).json({ message: "Codice 2FA non valido" });
    }

    // Disable 2FA
    await new Promise((resolve, reject) => {
      db.run(
        "UPDATE users SET totp_secret = NULL, totp_enabled = 0, backup_codes = NULL WHERE id = ?",
        [userId],
        function (err) {
          if (err) reject(err);
          else resolve(this.changes);
        }
      );
    });

    // Remove all trusted devices
    await new Promise((resolve, reject) => {
      db.run("DELETE FROM trusted_devices WHERE user_id = ?", [userId], (err) => {
        if (err) reject(err);
        else resolve();
      });
    });

    // Log to audit
    db.run(
      "INSERT INTO audit_log (user_id, user_email, action, entity_type, entity_id, details) VALUES (?, ?, ?, ?, ?, ?)",
      [userId, req.user.email, "disable", "2fa", userId, JSON.stringify({ action: "2FA disabled" })]
    );

    res.json({ success: true });
  } catch (err) {
    console.error("Error disabling 2FA:", err);
    res.status(500).json({ message: "Errore durante la disattivazione 2FA" });
  }
});

// POST /2fa/regenerate-backup-codes - Generate new backup codes
router.post("/regenerate-backup-codes", async (req, res) => {
  const userId = req.user.id;
  const { password } = req.body;

  if (!password) {
    return res.status(400).json({ message: "Password richiesta" });
  }

  try {
    // Get user data
    const user = await new Promise((resolve, reject) => {
      db.get(
        "SELECT password_hash, totp_enabled FROM users WHERE id = ?",
        [userId],
        (err, row) => {
          if (err) reject(err);
          else resolve(row);
        }
      );
    });

    if (!user || user.totp_enabled !== 1) {
      return res.status(400).json({ message: "2FA non attiva" });
    }

    // Verify password
    const passwordMatch = await bcrypt.compare(password, user.password_hash);
    if (!passwordMatch) {
      return res.status(400).json({ message: "Password non corretta" });
    }

    // Generate new backup codes
    const backupCodes = generateBackupCodes(10);
    const hashedCodes = await hashBackupCodes(backupCodes);

    // Save to database
    await new Promise((resolve, reject) => {
      db.run(
        "UPDATE users SET backup_codes = ? WHERE id = ?",
        [JSON.stringify(hashedCodes), userId],
        function (err) {
          if (err) reject(err);
          else resolve(this.changes);
        }
      );
    });

    // Log to audit
    db.run(
      "INSERT INTO audit_log (user_id, user_email, action, entity_type, entity_id, details) VALUES (?, ?, ?, ?, ?, ?)",
      [userId, req.user.email, "regenerate", "backup_codes", userId, JSON.stringify({ action: "Backup codes regenerated" })]
    );

    res.json({
      success: true,
      backupCodes
    });
  } catch (err) {
    console.error("Error regenerating backup codes:", err);
    res.status(500).json({ message: "Errore durante la rigenerazione dei codici" });
  }
});

// GET /2fa/trusted-devices - List trusted devices
router.get("/trusted-devices", (req, res) => {
  const userId = req.user.id;

  db.all(
    `SELECT id, device_name, created_at, expires_at
     FROM trusted_devices
     WHERE user_id = ? AND expires_at > datetime('now')
     ORDER BY created_at DESC`,
    [userId],
    (err, devices) => {
      if (err) return res.status(500).json({ message: "Errore DB" });
      res.json(devices || []);
    }
  );
});

// DELETE /2fa/trusted-devices/:id - Remove a trusted device
router.delete("/trusted-devices/:id", (req, res) => {
  const userId = req.user.id;
  const deviceId = req.params.id;

  db.run(
    "DELETE FROM trusted_devices WHERE id = ? AND user_id = ?",
    [deviceId, userId],
    function (err) {
      if (err) return res.status(500).json({ message: "Errore DB" });
      if (this.changes === 0) {
        return res.status(404).json({ message: "Dispositivo non trovato" });
      }
      res.json({ success: true });
    }
  );
});

// POST /admin/2fa/reset/:userId - Admin resets user's 2FA
router.post("/admin/reset/:userId", requireRole("admin"), async (req, res) => {
  const targetUserId = req.params.userId;
  const adminId = req.user.id;

  try {
    // Get target user info
    const targetUser = await new Promise((resolve, reject) => {
      db.get("SELECT email, totp_enabled FROM users WHERE id = ?", [targetUserId], (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });

    if (!targetUser) {
      return res.status(404).json({ message: "Utente non trovato" });
    }

    if (targetUser.totp_enabled !== 1) {
      return res.status(400).json({ message: "L'utente non ha 2FA attiva" });
    }

    // Reset 2FA
    await new Promise((resolve, reject) => {
      db.run(
        "UPDATE users SET totp_secret = NULL, totp_enabled = 0, backup_codes = NULL WHERE id = ?",
        [targetUserId],
        function (err) {
          if (err) reject(err);
          else resolve(this.changes);
        }
      );
    });

    // Remove all trusted devices
    await new Promise((resolve, reject) => {
      db.run("DELETE FROM trusted_devices WHERE user_id = ?", [targetUserId], (err) => {
        if (err) reject(err);
        else resolve();
      });
    });

    // Log to audit
    db.run(
      "INSERT INTO audit_log (user_id, user_email, action, entity_type, entity_id, details) VALUES (?, ?, ?, ?, ?, ?)",
      [adminId, req.user.email, "admin_reset", "2fa", parseInt(targetUserId), JSON.stringify({
        target_user_email: targetUser.email,
        action: "Admin reset 2FA"
      })]
    );

    res.json({ success: true });
  } catch (err) {
    console.error("Error resetting 2FA:", err);
    res.status(500).json({ message: "Errore durante il reset 2FA" });
  }
});

// Export helper functions for use in auth routes
export { verifyBackupCode };

export default router;
