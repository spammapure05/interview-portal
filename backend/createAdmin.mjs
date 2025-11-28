import "dotenv/config";
import bcrypt from "bcrypt";
import db from "./db.js";

const email = process.argv[2] || "admin@example.com";
const password = process.argv[3] || "admin123";

(async () => {
  const hash = await bcrypt.hash(password, 10);

  db.run(
    `INSERT INTO users (email, password_hash, role) VALUES (?, ?, 'admin')`,
    [email, hash],
    function (err) {
      if (err) {
        console.error("Errore creando admin:", err.message);
        process.exit(1);
      }
      console.log(`Admin creato: ${email} / ${password}`);
      process.exit(0);
    }
  );
})();
