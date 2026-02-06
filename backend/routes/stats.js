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

// ===== STATISTICHE AVANZATE PER DASHBOARD =====

// Stats avanzate per grafici
router.get("/advanced", requireRole("admin"), (req, res) => {
  const queries = [
    // Candidati per mese (ultimi 12 mesi)
    new Promise((resolve, reject) => {
      const twelveMonthsAgo = new Date();
      twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 12);
      db.all(
        `SELECT strftime('%Y-%m', created_at) as month, COUNT(*) as count
         FROM candidates
         WHERE created_at >= ?
         GROUP BY month
         ORDER BY month`,
        [twelveMonthsAgo.toISOString()],
        (err, rows) => {
          if (err) reject(err);
          else resolve({ candidatesByMonth: rows });
        }
      );
    }),

    // Colloqui per settimana (ultime 8 settimane)
    new Promise((resolve, reject) => {
      const eightWeeksAgo = new Date();
      eightWeeksAgo.setDate(eightWeeksAgo.getDate() - 56);
      db.all(
        `SELECT strftime('%Y-%W', scheduled_at) as week, COUNT(*) as count
         FROM interviews
         WHERE scheduled_at >= ?
         GROUP BY week
         ORDER BY week`,
        [eightWeeksAgo.toISOString()],
        (err, rows) => {
          if (err) reject(err);
          else resolve({ interviewsByWeek: rows });
        }
      );
    }),

    // Pipeline funnel
    new Promise((resolve, reject) => {
      db.all(
        `SELECT ps.name, ps.color, ps.order_index, COUNT(c.id) as count
         FROM pipeline_stages ps
         LEFT JOIN candidates c ON c.pipeline_stage_id = ps.id
         WHERE ps.is_active = 1
         GROUP BY ps.id
         ORDER BY ps.order_index`,
        (err, rows) => {
          if (err) reject(err);
          else resolve({ pipelineFunnel: rows });
        }
      );
    }),

    // Conversion rate (% candidati che passano da Nuovo a Assunto)
    new Promise((resolve, reject) => {
      db.get(
        `SELECT
          (SELECT COUNT(*) FROM candidates WHERE pipeline_stage_id = 1 OR pipeline_stage_id IS NULL) as nuovo,
          (SELECT COUNT(*) FROM candidates WHERE pipeline_stage_id = 6) as assunti,
          (SELECT COUNT(*) FROM candidates) as totale`,
        (err, row) => {
          if (err) reject(err);
          else {
            const conversionRate = row.totale > 0
              ? Math.round((row.assunti / row.totale) * 1000) / 10
              : 0;
            resolve({
              conversionMetrics: {
                ...row,
                conversionRate
              }
            });
          }
        }
      );
    }),

    // Candidati per posizione
    new Promise((resolve, reject) => {
      db.all(
        `SELECT position_applied, COUNT(*) as count
         FROM candidates
         WHERE position_applied IS NOT NULL AND position_applied != ''
         GROUP BY position_applied
         ORDER BY count DESC
         LIMIT 10`,
        (err, rows) => {
          if (err) reject(err);
          else resolve({ candidatesByPosition: rows });
        }
      );
    }),

    // Tempo medio di assunzione (giorni da creazione a stage "Assunto")
    new Promise((resolve, reject) => {
      db.get(
        `SELECT ROUND(AVG(julianday(updated_at) - julianday(created_at)), 1) as avg_days
         FROM candidates
         WHERE pipeline_stage_id = 6`,
        (err, row) => {
          if (err) reject(err);
          else resolve({ avgTimeToHire: row?.avg_days || null });
        }
      );
    }),

    // Colloqui oggi
    new Promise((resolve, reject) => {
      const today = new Date().toISOString().split('T')[0];
      db.get(
        `SELECT COUNT(*) as count FROM interviews
         WHERE date(scheduled_at) = date(?)`,
        [today],
        (err, row) => {
          if (err) reject(err);
          else resolve({ interviewsToday: row.count });
        }
      );
    }),

    // Score medio delle valutazioni
    new Promise((resolve, reject) => {
      db.get(
        `SELECT ROUND(AVG(total_score), 2) as avg_score, COUNT(*) as count
         FROM interview_verdicts`,
        (err, row) => {
          if (err) reject(err);
          else resolve({ avgInterviewScore: row });
        }
      );
    }),

    // Distribuzione raccomandazioni
    new Promise((resolve, reject) => {
      db.all(
        `SELECT recommendation, COUNT(*) as count
         FROM interview_verdicts
         GROUP BY recommendation`,
        (err, rows) => {
          if (err) reject(err);
          else {
            const dist = {};
            rows.forEach(r => {
              dist[r.recommendation] = r.count;
            });
            resolve({ recommendationDistribution: dist });
          }
        }
      );
    }),

    // Heatmap colloqui per giorno settimana e ora
    new Promise((resolve, reject) => {
      db.all(
        `SELECT
          strftime('%w', scheduled_at) as day_of_week,
          strftime('%H', scheduled_at) as hour,
          COUNT(*) as count
         FROM interviews
         WHERE scheduled_at >= datetime('now', '-3 months')
         GROUP BY day_of_week, hour`,
        (err, rows) => {
          if (err) reject(err);
          else resolve({ interviewHeatmap: rows });
        }
      );
    }),

    // Confronto mese attuale vs precedente
    new Promise((resolve, reject) => {
      const now = new Date();
      const thisMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
      const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const lastMonthStr = `${lastMonth.getFullYear()}-${String(lastMonth.getMonth() + 1).padStart(2, '0')}`;

      db.get(
        `SELECT
          (SELECT COUNT(*) FROM candidates WHERE strftime('%Y-%m', created_at) = ?) as this_month_candidates,
          (SELECT COUNT(*) FROM candidates WHERE strftime('%Y-%m', created_at) = ?) as last_month_candidates,
          (SELECT COUNT(*) FROM interviews WHERE strftime('%Y-%m', scheduled_at) = ?) as this_month_interviews,
          (SELECT COUNT(*) FROM interviews WHERE strftime('%Y-%m', scheduled_at) = ?) as last_month_interviews`,
        [thisMonth, lastMonthStr, thisMonth, lastMonthStr],
        (err, row) => {
          if (err) reject(err);
          else {
            const candidatesTrend = row.last_month_candidates > 0
              ? Math.round(((row.this_month_candidates - row.last_month_candidates) / row.last_month_candidates) * 100)
              : 0;
            const interviewsTrend = row.last_month_interviews > 0
              ? Math.round(((row.this_month_interviews - row.last_month_interviews) / row.last_month_interviews) * 100)
              : 0;
            resolve({
              monthComparison: {
                ...row,
                candidatesTrend,
                interviewsTrend
              }
            });
          }
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
      console.error("Errore stats avanzate:", err);
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
