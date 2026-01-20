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
      notes TEXT,
      suitability TEXT DEFAULT 'Da valutare' CHECK(suitability IN ('Da valutare', 'Idoneo', 'Non idoneo'))
    )
  `);

  // Migration: add suitability column if not exists
  db.run(`ALTER TABLE candidates ADD COLUMN suitability TEXT DEFAULT 'Da valutare'`, (err) => {
    // Ignore error if column already exists
  });

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

  // Documenti candidati
  db.run(`
    CREATE TABLE IF NOT EXISTS documents (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      candidate_id INTEGER NOT NULL,
      filename TEXT NOT NULL,
      original_name TEXT NOT NULL,
      mime_type TEXT,
      size INTEGER,
      uploaded_by INTEGER,
      uploaded_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(candidate_id) REFERENCES candidates(id),
      FOREIGN KEY(uploaded_by) REFERENCES users(id)
    )
  `);

  // Audit log
  db.run(`
    CREATE TABLE IF NOT EXISTS audit_log (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER,
      user_email TEXT,
      action TEXT NOT NULL,
      entity_type TEXT NOT NULL,
      entity_id INTEGER,
      details TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(user_id) REFERENCES users(id)
    )
  `);

  // Migration: add created_at to candidates
  db.run(`ALTER TABLE candidates ADD COLUMN created_at TEXT DEFAULT CURRENT_TIMESTAMP`, (err) => {});
  db.run(`ALTER TABLE candidates ADD COLUMN updated_at TEXT`, (err) => {});

  // Sale meeting
  db.run(`
    CREATE TABLE IF NOT EXISTS rooms (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      capacity INTEGER,
      description TEXT,
      color TEXT DEFAULT '#3B82F6',
      active INTEGER DEFAULT 1,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Riunioni nelle sale
  db.run(`
    CREATE TABLE IF NOT EXISTS room_meetings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      room_id INTEGER NOT NULL,
      title TEXT NOT NULL,
      description TEXT,
      start_time TEXT NOT NULL,
      end_time TEXT NOT NULL,
      organizer TEXT,
      participants TEXT,
      created_by INTEGER,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(room_id) REFERENCES rooms(id),
      FOREIGN KEY(created_by) REFERENCES users(id)
    )
  `);

  // Veicoli aziendali
  db.run(`
    CREATE TABLE IF NOT EXISTS vehicles (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      plate TEXT NOT NULL UNIQUE,
      brand TEXT NOT NULL,
      model TEXT NOT NULL,
      fuel_type TEXT,
      current_km INTEGER DEFAULT 0,
      notes TEXT,
      color TEXT DEFAULT '#3B82F6',
      active INTEGER DEFAULT 1,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Prenotazioni veicoli
  db.run(`
    CREATE TABLE IF NOT EXISTS vehicle_bookings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      vehicle_id INTEGER NOT NULL,
      driver_name TEXT NOT NULL,
      destination TEXT,
      purpose TEXT,
      start_time TEXT NOT NULL,
      end_time TEXT,
      km_start INTEGER,
      km_end INTEGER,
      returned INTEGER DEFAULT 0,
      return_notes TEXT,
      notes TEXT,
      created_by INTEGER,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(vehicle_id) REFERENCES vehicles(id),
      FOREIGN KEY(created_by) REFERENCES users(id)
    )
  `);
});

export default db;
