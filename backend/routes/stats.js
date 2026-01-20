import express from "express";
import db from "../db.js";
import { requireRole } from "../rolesMiddleware.js";

const router = express.Router();

// Statistiche generali
router.get("/", requireRole("admin"), (req, res) => {
  const stats = {};

  // Query multiple in parallelo
  const queries = [
    // Totale candidati
    new Promise((resolve, reject) => {
      db.get("SELECT COUNT(*) as total FROM candidates", (err, row) => {
        if (err) reject(err);
        else resolve({ totalCandidates: row.total });
      });
    }),

    // Candidati per idoneità
    new Promise((resolve, reject) => {
      db.all(
        `SELECT suitability, COUNT(*) as count FROM candidates GROUP BY suitability`,
        (err, rows) => {
          if (err) reject(err);
          else {
            const bySuitability = {};
            rows.forEach(r => {
              bySuitability[r.suitability || "Da valutare"] = r.count;
            });
            resolve({ candidatesBySuitability: bySuitability });
          }
        }
      );
    }),

    // Totale colloqui
    new Promise((resolve, reject) => {
      db.get("SELECT COUNT(*) as total FROM interviews", (err, row) => {
        if (err) reject(err);
        else resolve({ totalInterviews: row.total });
      });
    }),

    // Colloqui per stato
    new Promise((resolve, reject) => {
      db.all(
        `SELECT status, COUNT(*) as count FROM interviews GROUP BY status`,
        (err, rows) => {
          if (err) reject(err);
          else {
            const byStatus = {};
            rows.forEach(r => {
              byStatus[r.status] = r.count;
            });
            resolve({ interviewsByStatus: byStatus });
          }
        }
      );
    }),

    // Colloqui prossimi 7 giorni
    new Promise((resolve, reject) => {
      const now = new Date().toISOString();
      const nextWeek = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
      db.get(
        `SELECT COUNT(*) as count FROM interviews
         WHERE scheduled_at >= ? AND scheduled_at <= ? AND status = 'Programmato'`,
        [now, nextWeek],
        (err, row) => {
          if (err) reject(err);
          else resolve({ upcomingWeek: row.count });
        }
      );
    }),

    // Colloqui per mese (ultimi 6 mesi)
    new Promise((resolve, reject) => {
      const sixMonthsAgo = new Date();
      sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
      db.all(
        `SELECT strftime('%Y-%m', scheduled_at) as month, COUNT(*) as count
         FROM interviews
         WHERE scheduled_at >= ?
         GROUP BY month
         ORDER BY month`,
        [sixMonthsAgo.toISOString()],
        (err, rows) => {
          if (err) reject(err);
          else resolve({ interviewsByMonth: rows });
        }
      );
    }),

    // Tasso di idoneità
    new Promise((resolve, reject) => {
      db.get(
        `SELECT
          COUNT(CASE WHEN suitability = 'Idoneo' THEN 1 END) as idonei,
          COUNT(CASE WHEN suitability = 'Non idoneo' THEN 1 END) as nonIdonei,
          COUNT(CASE WHEN suitability = 'Da valutare' OR suitability IS NULL THEN 1 END) as daValutare
         FROM candidates`,
        (err, row) => {
          if (err) reject(err);
          else resolve({ suitabilityRates: row });
        }
      );
    }),

    // Ultime attività (audit)
    new Promise((resolve, reject) => {
      db.all(
        `SELECT * FROM audit_log ORDER BY created_at DESC LIMIT 10`,
        (err, rows) => {
          if (err) reject(err);
          else resolve({ recentActivity: rows });
        }
      );
    })
  ];

  Promise.all(queries)
    .then(results => {
      const merged = results.reduce((acc, obj) => ({ ...acc, ...obj }), {});
      res.json(merged);
    })
    .catch(err => {
      console.error("Errore stats:", err);
      res.status(500).json({ message: "Errore nel recupero statistiche" });
    });
});

// Export candidati in formato JSON (per CSV frontend)
router.get("/export/candidates", requireRole("admin", "secretary"), (req, res) => {
  const { suitability } = req.query;

  let sql = `SELECT c.*,
    (SELECT COUNT(*) FROM interviews WHERE candidate_id = c.id) as interview_count,
    (SELECT COUNT(*) FROM interviews WHERE candidate_id = c.id AND status = 'Completato') as completed_interviews
    FROM candidates c`;
  const params = [];

  if (suitability && suitability !== "all") {
    sql += " WHERE c.suitability = ?";
    params.push(suitability);
  }

  sql += " ORDER BY c.last_name, c.first_name";

  db.all(sql, params, (err, rows) => {
    if (err) return res.status(500).json({ message: "Errore DB" });
    res.json(rows);
  });
});

// Export colloqui in formato JSON (per CSV frontend)
router.get("/export/interviews", requireRole("admin", "secretary"), (req, res) => {
  const { status, from, to } = req.query;

  let sql = `SELECT i.*, c.first_name, c.last_name, c.email as candidate_email, c.phone as candidate_phone
    FROM interviews i
    JOIN candidates c ON i.candidate_id = c.id`;
  const params = [];
  const conditions = [];

  if (status && status !== "all") {
    conditions.push("i.status = ?");
    params.push(status);
  }
  if (from) {
    conditions.push("i.scheduled_at >= ?");
    params.push(from);
  }
  if (to) {
    conditions.push("i.scheduled_at <= ?");
    params.push(to);
  }

  if (conditions.length > 0) {
    sql += " WHERE " + conditions.join(" AND ");
  }

  sql += " ORDER BY i.scheduled_at DESC";

  db.all(sql, params, (err, rows) => {
    if (err) return res.status(500).json({ message: "Errore DB" });
    res.json(rows);
  });
});

export default router;
