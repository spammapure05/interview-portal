import express from "express";
import db from "../db.js";
import { requireRole } from "../rolesMiddleware.js";
import { logAudit } from "./audit.js";

const router = express.Router();

// ===== PIPELINE STAGES =====

// Get all pipeline stages
router.get("/stages", requireRole("admin", "secretary"), (req, res) => {
  db.all(
    `SELECT * FROM pipeline_stages WHERE is_active = 1 ORDER BY order_index ASC`,
    (err, rows) => {
      if (err) return res.status(500).json({ message: "Errore DB" });
      res.json(rows);
    }
  );
});

// Get all stages including inactive (admin only)
router.get("/stages/all", requireRole("admin"), (req, res) => {
  db.all(
    `SELECT * FROM pipeline_stages ORDER BY order_index ASC`,
    (err, rows) => {
      if (err) return res.status(500).json({ message: "Errore DB" });
      res.json(rows);
    }
  );
});

// Create new stage (admin only)
router.post("/stages", requireRole("admin"), (req, res) => {
  const { name, description, color, order_index } = req.body;

  if (!name) {
    return res.status(400).json({ message: "Nome obbligatorio" });
  }

  db.run(
    `INSERT INTO pipeline_stages (name, description, color, order_index)
     VALUES (?, ?, ?, ?)`,
    [name, description || null, color || "#3B82F6", order_index || 0],
    function (err) {
      if (err) {
        if (err.message.includes("UNIQUE")) {
          return res.status(400).json({ message: "Nome già esistente" });
        }
        return res.status(500).json({ message: "Errore DB" });
      }
      res.status(201).json({ id: this.lastID });
    }
  );
});

// Update stage (admin only)
router.put("/stages/:id", requireRole("admin"), (req, res) => {
  const { name, description, color, order_index, is_active } = req.body;

  const fields = [];
  const params = [];

  if (name !== undefined) {
    fields.push("name = ?");
    params.push(name);
  }
  if (description !== undefined) {
    fields.push("description = ?");
    params.push(description);
  }
  if (color !== undefined) {
    fields.push("color = ?");
    params.push(color);
  }
  if (order_index !== undefined) {
    fields.push("order_index = ?");
    params.push(order_index);
  }
  if (is_active !== undefined) {
    fields.push("is_active = ?");
    params.push(is_active ? 1 : 0);
  }

  if (fields.length === 0) {
    return res.status(400).json({ message: "Nessun campo da aggiornare" });
  }

  params.push(req.params.id);

  db.run(
    `UPDATE pipeline_stages SET ${fields.join(", ")} WHERE id = ?`,
    params,
    function (err) {
      if (err) {
        if (err.message.includes("UNIQUE")) {
          return res.status(400).json({ message: "Nome già esistente" });
        }
        return res.status(500).json({ message: "Errore DB" });
      }
      if (this.changes === 0) {
        return res.status(404).json({ message: "Stage non trovato" });
      }
      res.json({ updated: true });
    }
  );
});

// Reorder stages (admin only)
router.put("/stages/reorder", requireRole("admin"), (req, res) => {
  const { order } = req.body; // array of { id, order_index }

  if (!Array.isArray(order)) {
    return res.status(400).json({ message: "Formato non valido" });
  }

  const promises = order.map(
    (item) =>
      new Promise((resolve, reject) => {
        db.run(
          `UPDATE pipeline_stages SET order_index = ? WHERE id = ?`,
          [item.order_index, item.id],
          (err) => {
            if (err) reject(err);
            else resolve();
          }
        );
      })
  );

  Promise.all(promises)
    .then(() => res.json({ updated: true }))
    .catch((err) => res.status(500).json({ message: "Errore DB" }));
});

// ===== CANDIDATES IN PIPELINE =====

// Get candidates grouped by pipeline stage (Kanban view)
router.get("/kanban", requireRole("admin", "secretary"), (req, res) => {
  const { position } = req.query;

  let candidateSql = `
    SELECT c.id, c.first_name, c.last_name, c.email, c.phone, c.position_applied,
           c.pipeline_stage_id, c.suitability, c.created_at,
           (SELECT COUNT(*) FROM interviews WHERE candidate_id = c.id) as interview_count,
           (SELECT MAX(scheduled_at) FROM interviews WHERE candidate_id = c.id) as next_interview,
           (SELECT AVG(total_score) FROM interview_verdicts iv
            JOIN interviews i ON iv.interview_id = i.id
            WHERE i.candidate_id = c.id) as avg_score
    FROM candidates c
    WHERE 1=1
  `;
  const params = [];

  if (position) {
    candidateSql += " AND c.position_applied = ?";
    params.push(position);
  }

  candidateSql += " ORDER BY c.created_at DESC";

  // Get stages first
  db.all(
    `SELECT * FROM pipeline_stages WHERE is_active = 1 ORDER BY order_index ASC`,
    (err, stages) => {
      if (err) return res.status(500).json({ message: "Errore DB" });

      // Get candidates
      db.all(candidateSql, params, (err, candidates) => {
        if (err) return res.status(500).json({ message: "Errore DB" });

        // Group candidates by stage
        const kanban = stages.map((stage) => ({
          ...stage,
          candidates: candidates.filter(
            (c) => c.pipeline_stage_id === stage.id ||
                   (c.pipeline_stage_id === null && stage.order_index === 0)
          ),
        }));

        res.json(kanban);
      });
    }
  );
});

// Move candidate to different stage
router.patch("/candidates/:id/stage", requireRole("admin", "secretary"), (req, res) => {
  const { stage_id } = req.body;
  const candidateId = req.params.id;

  if (stage_id === undefined) {
    return res.status(400).json({ message: "stage_id obbligatorio" });
  }

  // Verify stage exists
  db.get(
    `SELECT id, name FROM pipeline_stages WHERE id = ? AND is_active = 1`,
    [stage_id],
    (err, stage) => {
      if (err) return res.status(500).json({ message: "Errore DB" });
      if (!stage) return res.status(404).json({ message: "Stage non trovato" });

      // Update candidate
      db.run(
        `UPDATE candidates SET pipeline_stage_id = ?, updated_at = datetime('now') WHERE id = ?`,
        [stage_id, candidateId],
        function (err) {
          if (err) return res.status(500).json({ message: "Errore DB" });
          if (this.changes === 0) {
            return res.status(404).json({ message: "Candidato non trovato" });
          }

          logAudit(req.user.id, req.user.email, "pipeline_move", "candidate", parseInt(candidateId), {
            new_stage: stage.name,
            stage_id: stage_id
          });

          res.json({ updated: true, stage_name: stage.name });
        }
      );
    }
  );
});

// Update candidate position applied
router.patch("/candidates/:id/position", requireRole("admin", "secretary"), (req, res) => {
  const { position_applied } = req.body;
  const candidateId = req.params.id;

  db.run(
    `UPDATE candidates SET position_applied = ?, updated_at = datetime('now') WHERE id = ?`,
    [position_applied || null, candidateId],
    function (err) {
      if (err) return res.status(500).json({ message: "Errore DB" });
      if (this.changes === 0) {
        return res.status(404).json({ message: "Candidato non trovato" });
      }
      res.json({ updated: true });
    }
  );
});

// Get distinct positions for filtering
router.get("/positions", requireRole("admin", "secretary"), (req, res) => {
  db.all(
    `SELECT DISTINCT position_applied FROM candidates WHERE position_applied IS NOT NULL ORDER BY position_applied`,
    (err, rows) => {
      if (err) return res.status(500).json({ message: "Errore DB" });
      res.json(rows.map((r) => r.position_applied));
    }
  );
});

// Pipeline statistics
router.get("/stats", requireRole("admin"), (req, res) => {
  const queries = [
    // Candidates per stage
    new Promise((resolve, reject) => {
      db.all(
        `SELECT ps.id, ps.name, ps.color, ps.order_index, COUNT(c.id) as count
         FROM pipeline_stages ps
         LEFT JOIN candidates c ON c.pipeline_stage_id = ps.id
         WHERE ps.is_active = 1
         GROUP BY ps.id
         ORDER BY ps.order_index`,
        (err, rows) => {
          if (err) reject(err);
          else resolve({ byStage: rows });
        }
      );
    }),
    // Conversion funnel
    new Promise((resolve, reject) => {
      db.all(
        `SELECT ps.name, ps.order_index,
                COUNT(c.id) as count,
                ROUND(COUNT(c.id) * 100.0 / NULLIF((SELECT COUNT(*) FROM candidates), 0), 1) as percentage
         FROM pipeline_stages ps
         LEFT JOIN candidates c ON c.pipeline_stage_id = ps.id
         WHERE ps.is_active = 1
         GROUP BY ps.id
         ORDER BY ps.order_index`,
        (err, rows) => {
          if (err) reject(err);
          else resolve({ funnel: rows });
        }
      );
    }),
    // Average time in each stage (simplified - days since created_at for candidates in each stage)
    new Promise((resolve, reject) => {
      db.all(
        `SELECT ps.name, ps.order_index,
                ROUND(AVG(julianday('now') - julianday(c.created_at)), 1) as avg_days
         FROM pipeline_stages ps
         LEFT JOIN candidates c ON c.pipeline_stage_id = ps.id
         WHERE ps.is_active = 1
         GROUP BY ps.id
         ORDER BY ps.order_index`,
        (err, rows) => {
          if (err) reject(err);
          else resolve({ avgTimeInStage: rows });
        }
      );
    }),
  ];

  Promise.all(queries)
    .then((results) => {
      const merged = results.reduce((acc, obj) => ({ ...acc, ...obj }), {});
      res.json(merged);
    })
    .catch((err) => {
      console.error("Pipeline stats error:", err);
      res.status(500).json({ message: "Errore nel recupero statistiche" });
    });
});

export default router;
