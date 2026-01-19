import "dotenv/config";
import db from "./db.js";

db.all("SELECT id, email, role FROM users ORDER BY id", [], (err, rows) => {
  if (err) {
    console.error("Errore:", err.message);
    process.exit(1);
  }

  if (rows.length === 0) {
    console.log("Nessun utente trovato nel database.");
  } else {
    console.log("\n=== Lista Utenti ===\n");
    console.table(rows);
    console.log(`Totale: ${rows.length} utente/i\n`);
  }

  process.exit(0);
});
