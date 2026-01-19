import "dotenv/config";
import bcrypt from "bcrypt";
import db from "./db.js";

const email = process.argv[2];
const newPassword = process.argv[3];

if (!email || !newPassword) {
  console.log("Uso: node resetPassword.mjs <email> <nuova_password>");
  console.log("Esempio: node resetPassword.mjs admin@example.com nuovapass123");
  process.exit(1);
}

(async () => {
  // Verifica che l'utente esista
  db.get("SELECT id, email FROM users WHERE email = ?", [email], async (err, user) => {
    if (err) {
      console.error("Errore:", err.message);
      process.exit(1);
    }

    if (!user) {
      console.error(`Utente con email "${email}" non trovato.`);
      process.exit(1);
    }

    // Hash della nuova password
    const hash = await bcrypt.hash(newPassword, 10);

    // Aggiorna la password
    db.run("UPDATE users SET password_hash = ? WHERE email = ?", [hash, email], function (err) {
      if (err) {
        console.error("Errore aggiornando la password:", err.message);
        process.exit(1);
      }

      console.log(`Password aggiornata con successo per: ${email}`);
      process.exit(0);
    });
  });
})();
