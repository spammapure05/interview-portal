import express from "express";
import db from "../db.js";
import { requireRole } from "../rolesMiddleware.js";
import { logAudit } from "./audit.js";

const router = express.Router();

// Lista tutti i veicoli (tutti gli utenti autenticati)
router.get("/", (req, res) => {
  const { active } = req.query;
  let sql = "SELECT * FROM vehicles";
  const params = [];

  if (active === "true") {
    sql += " WHERE active = 1";
  }

  sql += " ORDER BY brand, model";

  db.all(sql, params, (err, rows) => {
    if (err) return res.status(500).json({ message: "Errore DB" });
    res.json(rows);
  });
});

// Dettaglio veicolo
router.get("/:id", (req, res) => {
  const { id } = req.params;
  db.get("SELECT * FROM vehicles WHERE id = ?", [id], (err, row) => {
    if (err) return res.status(500).json({ message: "Errore DB" });
    if (!row) return res.status(404).json({ message: "Veicolo non trovato" });
    res.json(row);
  });
});

// Crea nuovo veicolo (solo admin)
router.post("/", requireRole("admin"), (req, res) => {
  const { plate, brand, model, fuel_type, current_km, notes, color } = req.body;

  if (!plate || !brand || !model) {
    return res.status(400).json({ message: "Targa, marca e modello sono obbligatori" });
  }

  db.run(
    `INSERT INTO vehicles (plate, brand, model, fuel_type, current_km, notes, color)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [
      plate.toUpperCase(),
      brand,
      model,
      fuel_type || null,
      current_km || 0,
      notes || null,
      color || "#3B82F6"
    ],
    function (err) {
      if (err) {
        if (err.message.includes("UNIQUE constraint")) {
          return res.status(400).json({ message: "Targa già esistente" });
        }
        return res.status(500).json({ message: "Errore DB" });
      }

      logAudit(req.user.id, req.user.email, "create", "vehicle", this.lastID, { plate, brand, model });

      res.status(201).json({
        id: this.lastID,
        plate: plate.toUpperCase(),
        brand,
        model,
        fuel_type,
        current_km: current_km || 0,
        notes,
        color: color || "#3B82F6",
        active: 1
      });
    }
  );
});

// Modifica veicolo (solo admin)
router.put("/:id", requireRole("admin"), (req, res) => {
  const { id } = req.params;
  const { plate, brand, model, fuel_type, current_km, notes, color, active } = req.body;

  if (!plate || !brand || !model) {
    return res.status(400).json({ message: "Targa, marca e modello sono obbligatori" });
  }

  db.run(
    `UPDATE vehicles
     SET plate = ?, brand = ?, model = ?, fuel_type = ?, current_km = ?, notes = ?, color = ?, active = ?
     WHERE id = ?`,
    [
      plate.toUpperCase(),
      brand,
      model,
      fuel_type || null,
      current_km || 0,
      notes || null,
      color || "#3B82F6",
      active !== undefined ? active : 1,
      id
    ],
    function (err) {
      if (err) {
        if (err.message.includes("UNIQUE constraint")) {
          return res.status(400).json({ message: "Targa già esistente" });
        }
        return res.status(500).json({ message: "Errore DB" });
      }
      if (this.changes === 0) {
        return res.status(404).json({ message: "Veicolo non trovato" });
      }

      logAudit(req.user.id, req.user.email, "update", "vehicle", parseInt(id), { plate, brand, model, current_km });

      res.json({ updated: true });
    }
  );
});

// Aggiorna solo i chilometri (tutti possono farlo)
router.patch("/:id/km", (req, res) => {
  const { id } = req.params;
  const { current_km } = req.body;

  if (current_km === undefined) {
    return res.status(400).json({ message: "Chilometri obbligatori" });
  }

  db.run(
    "UPDATE vehicles SET current_km = ? WHERE id = ?",
    [current_km, id],
    function (err) {
      if (err) return res.status(500).json({ message: "Errore DB" });
      if (this.changes === 0) {
        return res.status(404).json({ message: "Veicolo non trovato" });
      }

      logAudit(req.user.id, req.user.email, "update_km", "vehicle", parseInt(id), { current_km });

      res.json({ updated: true });
    }
  );
});

// Elimina veicolo (solo admin)
router.delete("/:id", requireRole("admin"), (req, res) => {
  const { id } = req.params;

  // Prima verifica se ci sono prenotazioni future per questo veicolo
  db.get(
    "SELECT COUNT(*) as count FROM vehicle_bookings WHERE vehicle_id = ? AND start_time > datetime('now') AND returned = 0",
    [id],
    (err, result) => {
      if (err) return res.status(500).json({ message: "Errore DB" });

      if (result.count > 0) {
        return res.status(400).json({
          message: `Non è possibile eliminare il veicolo: ci sono ${result.count} prenotazioni attive`
        });
      }

      db.get("SELECT plate, brand, model FROM vehicles WHERE id = ?", [id], (err, vehicle) => {
        if (err) return res.status(500).json({ message: "Errore DB" });
        if (!vehicle) return res.status(404).json({ message: "Veicolo non trovato" });

        // Elimina prima le prenotazioni passate del veicolo
        db.run("DELETE FROM vehicle_bookings WHERE vehicle_id = ?", [id], (err) => {
          if (err) return res.status(500).json({ message: "Errore DB" });

          db.run("DELETE FROM vehicles WHERE id = ?", [id], function (err) {
            if (err) return res.status(500).json({ message: "Errore DB" });

            logAudit(req.user.id, req.user.email, "delete", "vehicle", parseInt(id), {
              plate: vehicle.plate,
              brand: vehicle.brand,
              model: vehicle.model
            });

            res.json({ deleted: true });
          });
        });
      });
    }
  );
});

export default router;
