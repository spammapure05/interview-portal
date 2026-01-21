import express from "express";
import db from "../db.js";

const router = express.Router();

// GET - Lista notifiche dell'utente corrente
router.get("/", (req, res) => {
  const { unread_only, limit = 50 } = req.query;
  const parsedLimit = Math.min(parseInt(limit, 10) || 50, 100);

  let sql = `
    SELECT * FROM in_app_notifications
    WHERE user_id = ?
  `;
  const params = [req.user.id];

  if (unread_only === "true") {
    sql += " AND read = 0";
  }

  sql += " ORDER BY created_at DESC LIMIT ?";
  params.push(parsedLimit);

  db.all(sql, params, (err, rows) => {
    if (err) return res.status(500).json({ message: "Errore database" });
    res.json(rows);
  });
});

// GET - Conteggio notifiche non lette
router.get("/count", (req, res) => {
  db.get(
    "SELECT COUNT(*) as count FROM in_app_notifications WHERE user_id = ? AND read = 0",
    [req.user.id],
    (err, row) => {
      if (err) return res.status(500).json({ message: "Errore database" });
      res.json({ count: row.count });
    }
  );
});

// PUT - Segna notifica come letta
router.put("/:id/read", (req, res) => {
  const { id } = req.params;
  const notificationId = parseInt(id, 10);

  if (isNaN(notificationId) || notificationId <= 0) {
    return res.status(400).json({ message: "ID notifica non valido" });
  }

  db.run(
    "UPDATE in_app_notifications SET read = 1 WHERE id = ? AND user_id = ?",
    [notificationId, req.user.id],
    function (err) {
      if (err) return res.status(500).json({ message: "Errore database" });
      if (this.changes === 0) {
        return res.status(404).json({ message: "Notifica non trovata" });
      }
      res.json({ success: true });
    }
  );
});

// PUT - Segna tutte le notifiche come lette
router.put("/read-all", (req, res) => {
  db.run(
    "UPDATE in_app_notifications SET read = 1 WHERE user_id = ? AND read = 0",
    [req.user.id],
    function (err) {
      if (err) return res.status(500).json({ message: "Errore database" });
      res.json({ success: true, updated: this.changes });
    }
  );
});

// DELETE - Elimina una notifica
router.delete("/:id", (req, res) => {
  const { id } = req.params;
  const notificationId = parseInt(id, 10);

  if (isNaN(notificationId) || notificationId <= 0) {
    return res.status(400).json({ message: "ID notifica non valido" });
  }

  db.run(
    "DELETE FROM in_app_notifications WHERE id = ? AND user_id = ?",
    [notificationId, req.user.id],
    function (err) {
      if (err) return res.status(500).json({ message: "Errore database" });
      if (this.changes === 0) {
        return res.status(404).json({ message: "Notifica non trovata" });
      }
      res.json({ success: true });
    }
  );
});

// DELETE - Elimina tutte le notifiche lette
router.delete("/", (req, res) => {
  db.run(
    "DELETE FROM in_app_notifications WHERE user_id = ? AND read = 1",
    [req.user.id],
    function (err) {
      if (err) return res.status(500).json({ message: "Errore database" });
      res.json({ success: true, deleted: this.changes });
    }
  );
});

// ===== HELPER per creare notifiche (usato da altri moduli) =====
export function createNotification(userId, type, title, message, link = null) {
  return new Promise((resolve, reject) => {
    db.run(
      `INSERT INTO in_app_notifications (user_id, type, title, message, link)
       VALUES (?, ?, ?, ?, ?)`,
      [userId, type, title, message, link],
      function (err) {
        if (err) reject(err);
        else resolve(this.lastID);
      }
    );
  });
}

// Helper per notificare multipli utenti
export function notifyUsers(userIds, type, title, message, link = null) {
  const promises = userIds.map(userId =>
    createNotification(userId, type, title, message, link)
  );
  return Promise.all(promises);
}

// Helper per notificare utenti per ruolo
export function notifyByRole(roles, type, title, message, link = null) {
  return new Promise((resolve, reject) => {
    const placeholders = roles.map(() => "?").join(",");
    db.all(
      `SELECT id FROM users WHERE role IN (${placeholders})`,
      roles,
      async (err, users) => {
        if (err) return reject(err);
        const userIds = users.map(u => u.id);
        try {
          await notifyUsers(userIds, type, title, message, link);
          resolve(userIds.length);
        } catch (e) {
          reject(e);
        }
      }
    );
  });
}

export default router;
