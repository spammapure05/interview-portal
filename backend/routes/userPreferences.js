import express from "express";
import db from "../db.js";

const router = express.Router();

// GET - Ottieni preferenze utente corrente
router.get("/", (req, res) => {
  db.get(
    "SELECT * FROM user_preferences WHERE user_id = ?",
    [req.user.id],
    (err, row) => {
      if (err) return res.status(500).json({ message: "Errore database" });

      // Se non esistono preferenze, ritorna i default
      if (!row) {
        return res.json({
          user_id: req.user.id,
          theme: "light",
          saved_filters: null,
          notifications_enabled: 1,
          email_notifications: 1
        });
      }

      // Parse saved_filters se è JSON
      if (row.saved_filters) {
        try {
          row.saved_filters = JSON.parse(row.saved_filters);
        } catch (e) {
          row.saved_filters = null;
        }
      }

      res.json(row);
    }
  );
});

// PUT - Aggiorna preferenze utente
router.put("/", (req, res) => {
  const { theme, saved_filters, notifications_enabled, email_notifications } = req.body;

  // Validazione tema
  const validThemes = ["light", "dark", "system"];
  if (theme && !validThemes.includes(theme)) {
    return res.status(400).json({ message: "Tema non valido" });
  }

  // Serializza saved_filters se è un oggetto
  const filtersJson = saved_filters ? JSON.stringify(saved_filters) : null;

  // Usa UPSERT (INSERT OR REPLACE)
  db.run(
    `INSERT INTO user_preferences (user_id, theme, saved_filters, notifications_enabled, email_notifications, updated_at)
     VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
     ON CONFLICT(user_id) DO UPDATE SET
       theme = COALESCE(excluded.theme, theme),
       saved_filters = COALESCE(excluded.saved_filters, saved_filters),
       notifications_enabled = COALESCE(excluded.notifications_enabled, notifications_enabled),
       email_notifications = COALESCE(excluded.email_notifications, email_notifications),
       updated_at = CURRENT_TIMESTAMP`,
    [
      req.user.id,
      theme || "light",
      filtersJson,
      notifications_enabled !== undefined ? (notifications_enabled ? 1 : 0) : 1,
      email_notifications !== undefined ? (email_notifications ? 1 : 0) : 1
    ],
    function (err) {
      if (err) return res.status(500).json({ message: "Errore database" });
      res.json({ success: true });
    }
  );
});

// PATCH - Aggiorna solo il tema
router.patch("/theme", (req, res) => {
  const { theme } = req.body;

  const validThemes = ["light", "dark", "system"];
  if (!theme || !validThemes.includes(theme)) {
    return res.status(400).json({ message: "Tema non valido. Usa: light, dark, system" });
  }

  db.run(
    `INSERT INTO user_preferences (user_id, theme, updated_at)
     VALUES (?, ?, CURRENT_TIMESTAMP)
     ON CONFLICT(user_id) DO UPDATE SET
       theme = excluded.theme,
       updated_at = CURRENT_TIMESTAMP`,
    [req.user.id, theme],
    function (err) {
      if (err) return res.status(500).json({ message: "Errore database" });
      res.json({ success: true, theme });
    }
  );
});

// PATCH - Salva/aggiorna un filtro
router.patch("/filters", (req, res) => {
  const { filter_name, filter_value } = req.body;

  if (!filter_name) {
    return res.status(400).json({ message: "Nome filtro richiesto" });
  }

  // Sanitizza il nome del filtro
  const safeName = String(filter_name).replace(/[^a-zA-Z0-9_-]/g, "").substring(0, 50);
  if (!safeName) {
    return res.status(400).json({ message: "Nome filtro non valido" });
  }

  // Prima ottieni i filtri esistenti
  db.get(
    "SELECT saved_filters FROM user_preferences WHERE user_id = ?",
    [req.user.id],
    (err, row) => {
      if (err) return res.status(500).json({ message: "Errore database" });

      let filters = {};
      if (row && row.saved_filters) {
        try {
          filters = JSON.parse(row.saved_filters);
        } catch (e) {
          filters = {};
        }
      }

      // Aggiorna o rimuovi il filtro
      if (filter_value === null || filter_value === undefined) {
        delete filters[safeName];
      } else {
        filters[safeName] = filter_value;
      }

      const filtersJson = JSON.stringify(filters);

      db.run(
        `INSERT INTO user_preferences (user_id, saved_filters, updated_at)
         VALUES (?, ?, CURRENT_TIMESTAMP)
         ON CONFLICT(user_id) DO UPDATE SET
           saved_filters = excluded.saved_filters,
           updated_at = CURRENT_TIMESTAMP`,
        [req.user.id, filtersJson],
        function (err) {
          if (err) return res.status(500).json({ message: "Errore database" });
          res.json({ success: true, filters });
        }
      );
    }
  );
});

// DELETE - Elimina un filtro salvato
router.delete("/filters/:name", (req, res) => {
  const { name } = req.params;

  db.get(
    "SELECT saved_filters FROM user_preferences WHERE user_id = ?",
    [req.user.id],
    (err, row) => {
      if (err) return res.status(500).json({ message: "Errore database" });

      if (!row || !row.saved_filters) {
        return res.json({ success: true, message: "Nessun filtro da eliminare" });
      }

      let filters = {};
      try {
        filters = JSON.parse(row.saved_filters);
      } catch (e) {
        return res.json({ success: true, message: "Nessun filtro valido" });
      }

      delete filters[name];
      const filtersJson = JSON.stringify(filters);

      db.run(
        "UPDATE user_preferences SET saved_filters = ?, updated_at = CURRENT_TIMESTAMP WHERE user_id = ?",
        [filtersJson, req.user.id],
        function (err) {
          if (err) return res.status(500).json({ message: "Errore database" });
          res.json({ success: true, filters });
        }
      );
    }
  );
});

export default router;
