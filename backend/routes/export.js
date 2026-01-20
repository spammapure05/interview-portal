import express from "express";
import db from "../db.js";

const router = express.Router();

// Helper to convert array to CSV
function toCSV(data, columns) {
  if (!data || data.length === 0) return "";

  const header = columns.map(c => c.label).join(";");
  const rows = data.map(row =>
    columns.map(c => {
      let value = row[c.key];
      if (value === null || value === undefined) value = "";
      // Escape quotes and wrap in quotes if contains semicolon or newline
      value = String(value).replace(/"/g, '""');
      if (value.includes(";") || value.includes("\n") || value.includes('"')) {
        value = `"${value}"`;
      }
      return value;
    }).join(";")
  );

  return [header, ...rows].join("\n");
}

// Export candidates
router.get("/candidates", (req, res) => {
  const query = `
    SELECT
      c.*,
      (SELECT COUNT(*) FROM interviews WHERE candidate_id = c.id) as interview_count,
      (SELECT scheduled_at FROM interviews WHERE candidate_id = c.id ORDER BY scheduled_at DESC LIMIT 1) as last_interview
    FROM candidates c
    ORDER BY c.last_name, c.first_name
  `;

  db.all(query, (err, rows) => {
    if (err) return res.status(500).json({ message: "Errore database" });

    const columns = [
      { key: "id", label: "ID" },
      { key: "first_name", label: "Nome" },
      { key: "last_name", label: "Cognome" },
      { key: "email", label: "Email" },
      { key: "phone", label: "Telefono" },
      { key: "suitability", label: "Idoneità" },
      { key: "notes", label: "Note" },
      { key: "interview_count", label: "N. Colloqui" },
      { key: "last_interview", label: "Ultimo Colloquio" },
      { key: "created_at", label: "Data Creazione" }
    ];

    const csv = toCSV(rows, columns);
    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader("Content-Disposition", "attachment; filename=candidati.csv");
    res.send("\uFEFF" + csv); // BOM for Excel
  });
});

// Export interviews
router.get("/interviews", (req, res) => {
  const query = `
    SELECT
      i.*,
      c.first_name,
      c.last_name,
      c.email as candidate_email,
      c.phone as candidate_phone
    FROM interviews i
    JOIN candidates c ON i.candidate_id = c.id
    ORDER BY i.scheduled_at DESC
  `;

  db.all(query, (err, rows) => {
    if (err) return res.status(500).json({ message: "Errore database" });

    const columns = [
      { key: "id", label: "ID" },
      { key: "first_name", label: "Nome Candidato" },
      { key: "last_name", label: "Cognome Candidato" },
      { key: "candidate_email", label: "Email" },
      { key: "candidate_phone", label: "Telefono" },
      { key: "scheduled_at", label: "Data/Ora" },
      { key: "location", label: "Luogo" },
      { key: "status", label: "Stato" },
      { key: "feedback", label: "Feedback" },
      { key: "strengths", label: "Punti di Forza" },
      { key: "weaknesses", label: "Aree di Miglioramento" }
    ];

    const csv = toCSV(rows, columns);
    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader("Content-Disposition", "attachment; filename=colloqui.csv");
    res.send("\uFEFF" + csv);
  });
});

// Export meetings
router.get("/meetings", (req, res) => {
  const query = `
    SELECT
      m.*,
      r.name as room_name
    FROM room_meetings m
    JOIN rooms r ON m.room_id = r.id
    ORDER BY m.start_time DESC
  `;

  db.all(query, (err, rows) => {
    if (err) return res.status(500).json({ message: "Errore database" });

    const columns = [
      { key: "id", label: "ID" },
      { key: "title", label: "Titolo" },
      { key: "room_name", label: "Sala" },
      { key: "start_time", label: "Inizio" },
      { key: "end_time", label: "Fine" },
      { key: "organizer", label: "Organizzatore" },
      { key: "participants", label: "Partecipanti" },
      { key: "description", label: "Descrizione" }
    ];

    const csv = toCSV(rows, columns);
    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader("Content-Disposition", "attachment; filename=riunioni.csv");
    res.send("\uFEFF" + csv);
  });
});

// Export vehicle bookings
router.get("/vehicle-bookings", (req, res) => {
  const query = `
    SELECT
      b.*,
      v.plate,
      v.brand,
      v.model
    FROM vehicle_bookings b
    JOIN vehicles v ON b.vehicle_id = v.id
    ORDER BY b.start_time DESC
  `;

  db.all(query, (err, rows) => {
    if (err) return res.status(500).json({ message: "Errore database" });

    const columns = [
      { key: "id", label: "ID" },
      { key: "plate", label: "Targa" },
      { key: "brand", label: "Marca" },
      { key: "model", label: "Modello" },
      { key: "driver_name", label: "Conducente" },
      { key: "destination", label: "Destinazione" },
      { key: "purpose", label: "Scopo" },
      { key: "start_time", label: "Partenza" },
      { key: "end_time", label: "Rientro" },
      { key: "km_start", label: "Km Partenza" },
      { key: "km_end", label: "Km Rientro" },
      { key: "returned", label: "Restituito" },
      { key: "notes", label: "Note" }
    ];

    // Format returned field
    rows = rows.map(r => ({ ...r, returned: r.returned ? "Sì" : "No" }));

    const csv = toCSV(rows, columns);
    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader("Content-Disposition", "attachment; filename=prenotazioni_veicoli.csv");
    res.send("\uFEFF" + csv);
  });
});

// Export statistics summary
router.get("/stats", (req, res) => {
  const stats = {};

  const queries = [
    {
      name: "candidati_per_idoneita",
      sql: `SELECT suitability as categoria, COUNT(*) as totale FROM candidates GROUP BY suitability`
    },
    {
      name: "colloqui_per_stato",
      sql: `SELECT status as stato, COUNT(*) as totale FROM interviews GROUP BY status`
    },
    {
      name: "colloqui_per_mese",
      sql: `SELECT strftime('%Y-%m', scheduled_at) as mese, COUNT(*) as totale FROM interviews GROUP BY strftime('%Y-%m', scheduled_at) ORDER BY mese`
    },
    {
      name: "riunioni_per_sala",
      sql: `SELECT r.name as sala, COUNT(*) as totale FROM room_meetings m JOIN rooms r ON m.room_id = r.id GROUP BY r.name`
    },
    {
      name: "utilizzo_veicoli",
      sql: `SELECT v.plate as targa, v.brand as marca, v.model as modello, COUNT(*) as prenotazioni, SUM(CASE WHEN b.km_end IS NOT NULL AND b.km_start IS NOT NULL THEN b.km_end - b.km_start ELSE 0 END) as km_totali FROM vehicle_bookings b JOIN vehicles v ON b.vehicle_id = v.id GROUP BY v.id`
    }
  ];

  let completed = 0;

  queries.forEach(q => {
    db.all(q.sql, (err, rows) => {
      stats[q.name] = err ? [] : rows;
      completed++;

      if (completed === queries.length) {
        // Create CSV with multiple sections
        let csv = "REPORT STATISTICHE\n\n";

        csv += "=== CANDIDATI PER IDONEITÀ ===\n";
        csv += "Categoria;Totale\n";
        stats.candidati_per_idoneita.forEach(r => {
          csv += `${r.categoria || "N/A"};${r.totale}\n`;
        });

        csv += "\n=== COLLOQUI PER STATO ===\n";
        csv += "Stato;Totale\n";
        stats.colloqui_per_stato.forEach(r => {
          csv += `${r.stato || "N/A"};${r.totale}\n`;
        });

        csv += "\n=== COLLOQUI PER MESE ===\n";
        csv += "Mese;Totale\n";
        stats.colloqui_per_mese.forEach(r => {
          csv += `${r.mese};${r.totale}\n`;
        });

        csv += "\n=== RIUNIONI PER SALA ===\n";
        csv += "Sala;Totale\n";
        stats.riunioni_per_sala.forEach(r => {
          csv += `${r.sala};${r.totale}\n`;
        });

        csv += "\n=== UTILIZZO VEICOLI ===\n";
        csv += "Targa;Marca;Modello;Prenotazioni;Km Totali\n";
        stats.utilizzo_veicoli.forEach(r => {
          csv += `${r.targa};${r.marca};${r.modello};${r.prenotazioni};${r.km_totali || 0}\n`;
        });

        res.setHeader("Content-Type", "text/csv; charset=utf-8");
        res.setHeader("Content-Disposition", "attachment; filename=statistiche.csv");
        res.send("\uFEFF" + csv);
      }
    });
  });
});

export default router;
