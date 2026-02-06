import express from "express";
import db from "../db.js";
import { requireRole } from "../rolesMiddleware.js";
import { logAudit } from "./audit.js";

const router = express.Router();

// ===== SCORECARD TEMPLATES =====

// Get all templates
router.get("/templates", requireRole("admin", "secretary"), (req, res) => {
  const { active_only } = req.query;

  let sql = `SELECT * FROM scorecard_templates`;
  if (active_only === "true") {
    sql += ` WHERE is_active = 1`;
  }
  sql += ` ORDER BY name`;

  db.all(sql, (err, rows) => {
    if (err) return res.status(500).json({ message: "Errore DB" });
    res.json(rows);
  });
});

// Get single template with all categories, criteria, and questions
router.get("/templates/:id", requireRole("admin", "secretary"), (req, res) => {
  const templateId = req.params.id;

  db.get(
    `SELECT * FROM scorecard_templates WHERE id = ?`,
    [templateId],
    (err, template) => {
      if (err) return res.status(500).json({ message: "Errore DB" });
      if (!template) return res.status(404).json({ message: "Template non trovato" });

      // Get categories with criteria
      db.all(
        `SELECT sc.*, GROUP_CONCAT(scr.id || '::' || scr.name || '::' || COALESCE(scr.description, '') || '::' || COALESCE(scr.description_low, '') || '::' || COALESCE(scr.description_high, '') || '::' || scr.order_index, '|||') as criteria_raw
         FROM scorecard_categories sc
         LEFT JOIN scorecard_criteria scr ON scr.category_id = sc.id
         WHERE sc.template_id = ?
         GROUP BY sc.id
         ORDER BY sc.order_index`,
        [templateId],
        (err, categories) => {
          if (err) return res.status(500).json({ message: "Errore DB" });

          // Parse criteria from concatenated string
          const parsedCategories = categories.map((cat) => {
            const criteria = cat.criteria_raw
              ? cat.criteria_raw.split("|||").map((c) => {
                  const [id, name, description, description_low, description_high, order_index] = c.split("::");
                  return {
                    id: parseInt(id),
                    name,
                    description: description || null,
                    description_low: description_low || null,
                    description_high: description_high || null,
                    order_index: parseInt(order_index),
                  };
                }).filter(c => c.id).sort((a, b) => a.order_index - b.order_index)
              : [];
            return {
              id: cat.id,
              name: cat.name,
              weight: cat.weight,
              order_index: cat.order_index,
              criteria,
            };
          });

          // Get questions
          db.all(
            `SELECT * FROM interview_questions WHERE template_id = ? ORDER BY order_index`,
            [templateId],
            (err, questions) => {
              if (err) return res.status(500).json({ message: "Errore DB" });

              res.json({
                ...template,
                categories: parsedCategories,
                questions,
              });
            }
          );
        }
      );
    }
  );
});

// Create template (admin only)
router.post("/templates", requireRole("admin"), (req, res) => {
  const { name, department, description, categories, questions } = req.body;

  if (!name) {
    return res.status(400).json({ message: "Nome obbligatorio" });
  }

  db.run(
    `INSERT INTO scorecard_templates (name, department, description) VALUES (?, ?, ?)`,
    [name, department || null, description || null],
    function (err) {
      if (err) {
        if (err.message.includes("UNIQUE")) {
          return res.status(400).json({ message: "Nome già esistente" });
        }
        return res.status(500).json({ message: "Errore DB" });
      }

      const templateId = this.lastID;

      // Insert categories and criteria if provided
      if (categories && Array.isArray(categories)) {
        categories.forEach((cat, catIndex) => {
          db.run(
            `INSERT INTO scorecard_categories (template_id, name, weight, order_index) VALUES (?, ?, ?, ?)`,
            [templateId, cat.name, cat.weight || 1.0, catIndex],
            function (err) {
              if (err) return;
              const categoryId = this.lastID;

              if (cat.criteria && Array.isArray(cat.criteria)) {
                cat.criteria.forEach((crit, critIndex) => {
                  db.run(
                    `INSERT INTO scorecard_criteria (category_id, name, description, description_low, description_high, order_index)
                     VALUES (?, ?, ?, ?, ?, ?)`,
                    [categoryId, crit.name, crit.description || null, crit.description_low || null, crit.description_high || null, critIndex]
                  );
                });
              }
            }
          );
        });
      }

      // Insert questions if provided
      if (questions && Array.isArray(questions)) {
        questions.forEach((q, idx) => {
          db.run(
            `INSERT INTO interview_questions (template_id, question, category, order_index) VALUES (?, ?, ?, ?)`,
            [templateId, q.question, q.category || "general", idx]
          );
        });
      }

      logAudit(req.user.id, req.user.email, "create", "scorecard_template", templateId, { name });

      res.status(201).json({ id: templateId });
    }
  );
});

// Update template (admin only)
router.put("/templates/:id", requireRole("admin"), (req, res) => {
  const { name, department, description, is_active, categories, questions } = req.body;
  const templateId = req.params.id;

  const fields = [];
  const params = [];

  if (name !== undefined) {
    fields.push("name = ?");
    params.push(name);
  }
  if (department !== undefined) {
    fields.push("department = ?");
    params.push(department);
  }
  if (description !== undefined) {
    fields.push("description = ?");
    params.push(description);
  }
  if (is_active !== undefined) {
    fields.push("is_active = ?");
    params.push(is_active ? 1 : 0);
  }

  fields.push("updated_at = datetime('now')");
  params.push(templateId);

  db.run(
    `UPDATE scorecard_templates SET ${fields.join(", ")} WHERE id = ?`,
    params,
    function (err) {
      if (err) {
        if (err.message.includes("UNIQUE")) {
          return res.status(400).json({ message: "Nome già esistente" });
        }
        return res.status(500).json({ message: "Errore DB" });
      }
      if (this.changes === 0) {
        return res.status(404).json({ message: "Template non trovato" });
      }

      // If categories provided, replace all
      if (categories && Array.isArray(categories)) {
        // Delete old categories (cascade will delete criteria)
        db.run(`DELETE FROM scorecard_categories WHERE template_id = ?`, [templateId], (err) => {
          if (err) return;

          categories.forEach((cat, catIndex) => {
            db.run(
              `INSERT INTO scorecard_categories (template_id, name, weight, order_index) VALUES (?, ?, ?, ?)`,
              [templateId, cat.name, cat.weight || 1.0, catIndex],
              function (err) {
                if (err) return;
                const categoryId = this.lastID;

                if (cat.criteria && Array.isArray(cat.criteria)) {
                  cat.criteria.forEach((crit, critIndex) => {
                    db.run(
                      `INSERT INTO scorecard_criteria (category_id, name, description, description_low, description_high, order_index)
                       VALUES (?, ?, ?, ?, ?, ?)`,
                      [categoryId, crit.name, crit.description || null, crit.description_low || null, crit.description_high || null, critIndex]
                    );
                  });
                }
              }
            );
          });
        });
      }

      // If questions provided, replace all
      if (questions && Array.isArray(questions)) {
        db.run(`DELETE FROM interview_questions WHERE template_id = ?`, [templateId], (err) => {
          if (err) return;

          questions.forEach((q, idx) => {
            db.run(
              `INSERT INTO interview_questions (template_id, question, category, order_index) VALUES (?, ?, ?, ?)`,
              [templateId, q.question, q.category || "general", idx]
            );
          });
        });
      }

      res.json({ updated: true });
    }
  );
});

// Delete template (admin only)
router.delete("/templates/:id", requireRole("admin"), (req, res) => {
  const templateId = req.params.id;

  // Check if template is in use
  db.get(
    `SELECT COUNT(*) as count FROM interview_verdicts WHERE template_id = ?`,
    [templateId],
    (err, row) => {
      if (err) return res.status(500).json({ message: "Errore DB" });

      if (row.count > 0) {
        return res.status(400).json({
          message: `Template in uso in ${row.count} colloqui. Disattivalo invece di eliminarlo.`,
        });
      }

      db.run(`DELETE FROM scorecard_templates WHERE id = ?`, [templateId], function (err) {
        if (err) return res.status(500).json({ message: "Errore DB" });
        if (this.changes === 0) {
          return res.status(404).json({ message: "Template non trovato" });
        }
        res.json({ deleted: true });
      });
    }
  );
});

// ===== INTERVIEW SCORING =====

// Get scorecard for an interview
router.get("/interviews/:interviewId", requireRole("admin", "secretary"), (req, res) => {
  const interviewId = req.params.interviewId;

  // Get interview with template info
  db.get(
    `SELECT i.*, c.first_name, c.last_name, c.position_applied,
            st.id as template_id, st.name as template_name
     FROM interviews i
     JOIN candidates c ON c.id = i.candidate_id
     LEFT JOIN scorecard_templates st ON st.id = i.scorecard_template_id
     WHERE i.id = ?`,
    [interviewId],
    (err, interview) => {
      if (err) return res.status(500).json({ message: "Errore DB" });
      if (!interview) return res.status(404).json({ message: "Colloquio non trovato" });

      // Get existing scores
      db.all(
        `SELECT * FROM interview_scores WHERE interview_id = ?`,
        [interviewId],
        (err, scores) => {
          if (err) return res.status(500).json({ message: "Errore DB" });

          // Get verdict if exists
          db.get(
            `SELECT * FROM interview_verdicts WHERE interview_id = ?`,
            [interviewId],
            (err, verdict) => {
              if (err) return res.status(500).json({ message: "Errore DB" });

              res.json({
                interview,
                scores: scores.reduce((acc, s) => {
                  acc[s.criteria_id] = { score: s.score, notes: s.notes };
                  return acc;
                }, {}),
                verdict,
              });
            }
          );
        }
      );
    }
  );
});

// Set template for interview
router.patch("/interviews/:interviewId/template", requireRole("admin"), (req, res) => {
  const { template_id } = req.body;
  const interviewId = req.params.interviewId;

  db.run(
    `UPDATE interviews SET scorecard_template_id = ? WHERE id = ?`,
    [template_id, interviewId],
    function (err) {
      if (err) return res.status(500).json({ message: "Errore DB" });
      if (this.changes === 0) {
        return res.status(404).json({ message: "Colloquio non trovato" });
      }
      res.json({ updated: true });
    }
  );
});

// Save scores for interview
router.post("/interviews/:interviewId/scores", requireRole("admin"), (req, res) => {
  const { scores } = req.body; // { criteria_id: { score, notes } }
  const interviewId = req.params.interviewId;

  if (!scores || typeof scores !== "object") {
    return res.status(400).json({ message: "Formato scores non valido" });
  }

  // Delete existing scores for this interview
  db.run(`DELETE FROM interview_scores WHERE interview_id = ?`, [interviewId], (err) => {
    if (err) return res.status(500).json({ message: "Errore DB" });

    // Insert new scores
    const entries = Object.entries(scores);
    if (entries.length === 0) {
      return res.json({ saved: true, count: 0 });
    }

    let completed = 0;
    let errors = 0;

    entries.forEach(([criteriaId, data]) => {
      if (data.score !== undefined && data.score !== null) {
        db.run(
          `INSERT INTO interview_scores (interview_id, criteria_id, score, notes) VALUES (?, ?, ?, ?)`,
          [interviewId, parseInt(criteriaId), data.score, data.notes || null],
          (err) => {
            if (err) errors++;
            completed++;
            if (completed === entries.length) {
              if (errors > 0) {
                res.status(500).json({ message: "Errori nel salvataggio" });
              } else {
                res.json({ saved: true, count: entries.length });
              }
            }
          }
        );
      } else {
        completed++;
        if (completed === entries.length) {
          res.json({ saved: true, count: entries.length });
        }
      }
    });
  });
});

// Save verdict for interview
router.post("/interviews/:interviewId/verdict", requireRole("admin"), (req, res) => {
  const { recommendation, final_notes, template_id } = req.body;
  const interviewId = req.params.interviewId;

  if (!recommendation) {
    return res.status(400).json({ message: "Raccomandazione obbligatoria" });
  }

  // Calculate total score from existing scores
  db.all(
    `SELECT iss.score, sc.weight, scat.weight as cat_weight
     FROM interview_scores iss
     JOIN scorecard_criteria sc ON sc.id = iss.criteria_id
     JOIN scorecard_categories scat ON scat.id = sc.category_id
     WHERE iss.interview_id = ?`,
    [interviewId],
    (err, scores) => {
      if (err) return res.status(500).json({ message: "Errore DB" });

      // Calculate weighted average
      let totalWeight = 0;
      let weightedSum = 0;
      scores.forEach((s) => {
        const weight = (s.cat_weight || 1);
        weightedSum += s.score * weight;
        totalWeight += weight;
      });
      const totalScore = totalWeight > 0 ? Math.round((weightedSum / totalWeight) * 100) / 100 : null;

      // Insert or replace verdict
      db.run(
        `INSERT OR REPLACE INTO interview_verdicts (interview_id, template_id, recommendation, total_score, final_notes, created_by, completed_at)
         VALUES (?, ?, ?, ?, ?, ?, datetime('now'))`,
        [interviewId, template_id || null, recommendation, totalScore, final_notes || null, req.user.id],
        function (err) {
          if (err) return res.status(500).json({ message: "Errore DB" });

          logAudit(req.user.id, req.user.email, "create", "interview_verdict", this.lastID, {
            interview_id: interviewId,
            recommendation,
            total_score: totalScore
          });

          res.json({ saved: true, total_score: totalScore });
        }
      );
    }
  );
});

// Get candidate comparison (compare candidates by their interview scores)
router.get("/compare", requireRole("admin"), (req, res) => {
  const { candidate_ids, template_id } = req.query;

  if (!candidate_ids) {
    return res.status(400).json({ message: "candidate_ids richiesti" });
  }

  const ids = candidate_ids.split(",").map((id) => parseInt(id));

  let sql = `
    SELECT c.id as candidate_id, c.first_name, c.last_name, c.position_applied,
           sc.id as criteria_id, sc.name as criteria_name,
           scat.name as category_name, scat.weight as category_weight,
           AVG(iss.score) as avg_score,
           iv.recommendation, iv.total_score
    FROM candidates c
    LEFT JOIN interviews i ON i.candidate_id = c.id
    LEFT JOIN interview_verdicts iv ON iv.interview_id = i.id
    LEFT JOIN interview_scores iss ON iss.interview_id = i.id
    LEFT JOIN scorecard_criteria sc ON sc.id = iss.criteria_id
    LEFT JOIN scorecard_categories scat ON scat.id = sc.category_id
    WHERE c.id IN (${ids.map(() => "?").join(",")})
  `;

  const params = [...ids];

  if (template_id) {
    sql += ` AND i.scorecard_template_id = ?`;
    params.push(template_id);
  }

  sql += ` GROUP BY c.id, sc.id ORDER BY c.last_name, scat.order_index, sc.order_index`;

  db.all(sql, params, (err, rows) => {
    if (err) return res.status(500).json({ message: "Errore DB" });

    // Group by candidate
    const candidates = {};
    rows.forEach((row) => {
      if (!candidates[row.candidate_id]) {
        candidates[row.candidate_id] = {
          id: row.candidate_id,
          name: `${row.first_name} ${row.last_name}`,
          position: row.position_applied,
          recommendation: row.recommendation,
          total_score: row.total_score,
          scores: {},
        };
      }
      if (row.criteria_id) {
        candidates[row.candidate_id].scores[row.criteria_name] = {
          score: row.avg_score,
          category: row.category_name,
        };
      }
    });

    res.json(Object.values(candidates));
  });
});

// Scorecard statistics
router.get("/stats", requireRole("admin"), (req, res) => {
  const queries = [
    // Templates usage
    new Promise((resolve, reject) => {
      db.all(
        `SELECT st.name, COUNT(iv.id) as usage_count
         FROM scorecard_templates st
         LEFT JOIN interview_verdicts iv ON iv.template_id = st.id
         GROUP BY st.id
         ORDER BY usage_count DESC`,
        (err, rows) => {
          if (err) reject(err);
          else resolve({ templateUsage: rows });
        }
      );
    }),
    // Average scores by template
    new Promise((resolve, reject) => {
      db.all(
        `SELECT st.name, ROUND(AVG(iv.total_score), 2) as avg_score, COUNT(iv.id) as count
         FROM scorecard_templates st
         JOIN interview_verdicts iv ON iv.template_id = st.id
         GROUP BY st.id`,
        (err, rows) => {
          if (err) reject(err);
          else resolve({ avgScoresByTemplate: rows });
        }
      );
    }),
    // Recommendation distribution
    new Promise((resolve, reject) => {
      db.all(
        `SELECT recommendation, COUNT(*) as count
         FROM interview_verdicts
         GROUP BY recommendation`,
        (err, rows) => {
          if (err) reject(err);
          else {
            const dist = {};
            rows.forEach((r) => {
              dist[r.recommendation] = r.count;
            });
            resolve({ recommendationDistribution: dist });
          }
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
      console.error("Scorecard stats error:", err);
      res.status(500).json({ message: "Errore nel recupero statistiche" });
    });
});

export default router;
