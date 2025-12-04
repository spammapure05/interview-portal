import sqlite3 from "sqlite3";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// directory persistente per il DB
const dataDir = path.join(__dirname, "data");

// se non esiste, la creo
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

// file del DB nella cartella data
const dbPath = process.env.DB_PATH || path.join(__dirname, "database.sqlite");

const db = new sqlite3.Database(dbPath);


db.serialize(() => {
  // Utenti
  db.run(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL CHECK(role IN ('admin', 'secretary'))
    )
  `);

  // Candidati
  db.run(`
    CREATE TABLE IF NOT EXISTS candidates (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      first_name TEXT NOT NULL,
      last_name TEXT NOT NULL,
      email TEXT,
      phone TEXT,
      notes TEXT
    )
  `);

  // Colloqui
  db.run(`
    CREATE TABLE IF NOT EXISTS interviews (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      candidate_id INTEGER NOT NULL,
      scheduled_at TEXT NOT NULL,
      location TEXT,
      status TEXT DEFAULT 'Programmato',
      feedback TEXT,
      strengths TEXT,
      weaknesses TEXT,
      created_by INTEGER,
      updated_by INTEGER,
      FOREIGN KEY(candidate_id) REFERENCES candidates(id),
      FOREIGN KEY(created_by) REFERENCES users(id),
      FOREIGN KEY(updated_by) REFERENCES users(id)
    )
  `);
});

export default db;
