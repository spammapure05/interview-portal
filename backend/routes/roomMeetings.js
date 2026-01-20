import express from "express";
import db from "../db.js";
import { logAudit } from "./audit.js";

const router = express.Router();

// Lista riunioni con filtri opzionali
router.get("/", (req, res) => {
  const { room_id, start_date, end_date } = req.query;

  let sql = `
    SELECT rm.*, r.name as room_name, r.color as room_color
    FROM room_meetings rm
    JOIN rooms r ON rm.room_id = r.id
    WHERE 1=1
  `;
  const params = [];

  if (room_id) {
    sql += " AND rm.room_id = ?";
    params.push(room_id);
  }

  if (start_date) {
    sql += " AND rm.end_time >= ?";
    params.push(start_date);
  }

  if (end_date) {
    sql += " AND rm.start_time <= ?";
    params.push(end_date);
  }

  sql += " ORDER BY rm.start_time";

  db.all(sql, params, (err, rows) => {
    if (err) return res.status(500).json({ message: "Errore DB" });
    res.json(rows);
  });
});

// Dettaglio riunione
router.get("/:id", (req, res) => {
  const { id } = req.params;
  db.get(
    `SELECT rm.*, r.name as room_name, r.color as room_color
     FROM room_meetings rm
     JOIN rooms r ON rm.room_id = r.id
     WHERE rm.id = ?`,
    [id],
    (err, row) => {
      if (err) return res.status(500).json({ message: "Errore DB" });
      if (!row) return res.status(404).json({ message: "Riunione non trovata" });
      res.json(row);
    }
  );
});

// Verifica conflitti (stessa sala, stesso orario)
function checkConflicts(roomId, startTime, endTime, excludeId = null) {
  return new Promise((resolve, reject) => {
    let sql = `
      SELECT id, title, start_time, end_time
      FROM room_meetings
      WHERE room_id = ?
        AND start_time < ?
        AND end_time > ?
    `;
    const params = [roomId, endTime, startTime];

    if (excludeId) {
      sql += " AND id != ?";
      params.push(excludeId);
    }

    db.all(sql, params, (err, rows) => {
      if (err) reject(err);
      else resolve(rows);
    });
  });
}

// Crea nuova riunione
router.post("/", async (req, res) => {
  const { room_id, title, description, start_time, end_time, organizer, participants } = req.body;

  if (!room_id || !title || !start_time || !end_time) {
    return res.status(400).json({ message: "Sala, titolo, ora inizio e ora fine sono obbligatori" });
  }

  // Valida che end_time sia dopo start_time
  if (new Date(end_time) <= new Date(start_time)) {
    return res.status(400).json({ message: "L'ora di fine deve essere successiva all'ora di inizio" });
  }

  try {
    // Verifica conflitti nella stessa sala
    const conflicts = await checkConflicts(room_id, start_time, end_time);
    if (conflicts.length > 0) {
      return res.status(409).json({
        message: "La sala è già occupata in questo orario",
        conflicts
      });
    }

    db.run(
      `INSERT INTO room_meetings (room_id, title, description, start_time, end_time, organizer, participants, created_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [room_id, title, description || null, start_time, end_time, organizer || null, participants || null, req.user.id],
      function (err) {
        if (err) return res.status(500).json({ message: "Errore DB" });

        logAudit(req.user.id, req.user.email, "create", "room_meeting", this.lastID, { room_id, title, start_time, end_time });

        // Recupera i dati della riunione creata con info sala
        db.get(
          `SELECT rm.*, r.name as room_name, r.color as room_color
           FROM room_meetings rm
           JOIN rooms r ON rm.room_id = r.id
           WHERE rm.id = ?`,
          [this.lastID],
          (err, row) => {
            if (err) return res.status(500).json({ message: "Errore DB" });
            res.status(201).json(row);
          }
        );
      }
    );
  } catch (err) {
    res.status(500).json({ message: "Errore server" });
  }
});

// Modifica riunione
router.put("/:id", async (req, res) => {
  const { id } = req.params;
  const { room_id, title, description, start_time, end_time, organizer, participants } = req.body;

  if (!room_id || !title || !start_time || !end_time) {
    return res.status(400).json({ message: "Sala, titolo, ora inizio e ora fine sono obbligatori" });
  }

  // Valida che end_time sia dopo start_time
  if (new Date(end_time) <= new Date(start_time)) {
    return res.status(400).json({ message: "L'ora di fine deve essere successiva all'ora di inizio" });
  }

  try {
    // Verifica conflitti nella stessa sala (escludendo la riunione corrente)
    const conflicts = await checkConflicts(room_id, start_time, end_time, parseInt(id));
    if (conflicts.length > 0) {
      return res.status(409).json({
        message: "La sala è già occupata in questo orario",
        conflicts
      });
    }

    db.run(
      `UPDATE room_meetings
       SET room_id = ?, title = ?, description = ?, start_time = ?, end_time = ?, organizer = ?, participants = ?
       WHERE id = ?`,
      [room_id, title, description || null, start_time, end_time, organizer || null, participants || null, id],
      function (err) {
        if (err) return res.status(500).json({ message: "Errore DB" });
        if (this.changes === 0) {
          return res.status(404).json({ message: "Riunione non trovata" });
        }

        logAudit(req.user.id, req.user.email, "update", "room_meeting", parseInt(id), { room_id, title, start_time, end_time });

        res.json({ updated: true });
      }
    );
  } catch (err) {
    res.status(500).json({ message: "Errore server" });
  }
});

// Elimina riunione
router.delete("/:id", (req, res) => {
  const { id } = req.params;

  db.get("SELECT title, room_id FROM room_meetings WHERE id = ?", [id], (err, meeting) => {
    if (err) return res.status(500).json({ message: "Errore DB" });
    if (!meeting) return res.status(404).json({ message: "Riunione non trovata" });

    db.run("DELETE FROM room_meetings WHERE id = ?", [id], function (err) {
      if (err) return res.status(500).json({ message: "Errore DB" });

      logAudit(req.user.id, req.user.email, "delete", "room_meeting", parseInt(id), { title: meeting.title });

      res.json({ deleted: true });
    });
  });
});

export default router;
