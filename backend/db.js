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

  // Configurazione SMTP
  db.run(`
    CREATE TABLE IF NOT EXISTS smtp_config (
      id INTEGER PRIMARY KEY CHECK (id = 1),
      host TEXT NOT NULL,
      port INTEGER NOT NULL DEFAULT 587,
      secure INTEGER DEFAULT 0,
      username TEXT,
      password TEXT,
      from_email TEXT NOT NULL,
      from_name TEXT DEFAULT 'Interview Portal',
      enabled INTEGER DEFAULT 0,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_by INTEGER,
      FOREIGN KEY(updated_by) REFERENCES users(id)
    )
  `);

  // Template notifiche
  db.run(`
    CREATE TABLE IF NOT EXISTS notification_templates (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      type TEXT NOT NULL UNIQUE CHECK(type IN ('interview_reminder', 'meeting_reminder', 'vehicle_reminder', 'request_submitted', 'request_approved', 'request_rejected', 'request_counter')),
      name TEXT NOT NULL,
      subject TEXT NOT NULL,
      body TEXT NOT NULL,
      enabled INTEGER DEFAULT 1,
      hours_before INTEGER DEFAULT 24,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_by INTEGER,
      FOREIGN KEY(updated_by) REFERENCES users(id)
    )
  `);

  // Notifiche programmate (coda)
  db.run(`
    CREATE TABLE IF NOT EXISTS scheduled_notifications (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      template_type TEXT NOT NULL,
      entity_type TEXT NOT NULL,
      entity_id INTEGER NOT NULL,
      recipient_email TEXT NOT NULL,
      recipient_name TEXT,
      scheduled_for TEXT NOT NULL,
      sent INTEGER DEFAULT 0,
      sent_at TEXT,
      error TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Migration: add viewer role - Check if migration needed
  db.get("SELECT sql FROM sqlite_master WHERE type='table' AND name='users'", (err, row) => {
    if (err) return;

    // Check if the current users table has the viewer role in CHECK constraint
    if (row && row.sql && !row.sql.includes("'viewer'")) {
      console.log("Migrating users table to support viewer role...");

      // Create new table with viewer role
      db.run(`
        CREATE TABLE IF NOT EXISTS users_new (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          email TEXT UNIQUE NOT NULL,
          password_hash TEXT NOT NULL,
          role TEXT NOT NULL CHECK(role IN ('admin', 'secretary', 'viewer')),
          permissions TEXT DEFAULT '{}',
          active INTEGER DEFAULT 1,
          created_at TEXT DEFAULT CURRENT_TIMESTAMP
        )
      `, (err) => {
        if (err) {
          console.error("Error creating users_new:", err);
          return;
        }

        // Copy data from old table
        db.run(`
          INSERT OR IGNORE INTO users_new (id, email, password_hash, role)
          SELECT id, email, password_hash, role FROM users
        `, (err) => {
          if (err) {
            console.error("Error copying users data:", err);
            return;
          }

          // Drop old table
          db.run(`DROP TABLE IF EXISTS users`, (err) => {
            if (err) {
              console.error("Error dropping old users table:", err);
              return;
            }

            // Rename new table
            db.run(`ALTER TABLE users_new RENAME TO users`, (err) => {
              if (err) {
                console.error("Error renaming users_new:", err);
                return;
              }
              console.log("Users table migration completed successfully!");
            });
          });
        });
      });
    }
  });

  // Migration: add category to documents
  db.run(`ALTER TABLE documents ADD COLUMN category TEXT DEFAULT 'other'`, (err) => {});

  // Migration: add notification_email to vehicle_bookings
  db.run(`ALTER TABLE vehicle_bookings ADD COLUMN notification_email TEXT`, (err) => {});

  // Migration: add notification_email to room_meetings
  db.run(`ALTER TABLE room_meetings ADD COLUMN notification_email TEXT`, (err) => {});

  // Migration: add external_email to room_meetings (for booking on behalf of external users)
  db.run(`ALTER TABLE room_meetings ADD COLUMN external_email TEXT`, (err) => {});

  // Migration: add external_email to vehicle_bookings (for booking on behalf of external users)
  db.run(`ALTER TABLE vehicle_bookings ADD COLUMN external_email TEXT`, (err) => {});

  // Insert default notification templates
  db.run(`
    INSERT OR IGNORE INTO notification_templates (type, name, subject, body, hours_before)
    VALUES
      ('interview_reminder', 'Promemoria Colloquio', 'Promemoria: Colloquio programmato per {{candidate_name}}',
       '<h2>Promemoria Colloquio</h2><p>Ti ricordiamo che è programmato un colloquio con <strong>{{candidate_name}}</strong>.</p><p><strong>Data:</strong> {{date}}</p><p><strong>Ora:</strong> {{time}}</p><p><strong>Luogo:</strong> {{location}}</p><p>Cordiali saluti,<br>Interview Portal</p>', 24),
      ('meeting_reminder', 'Promemoria Riunione', 'Promemoria: Riunione "{{meeting_title}}" in {{room_name}}',
       '<h2>Promemoria Riunione</h2><p>Ti ricordiamo la riunione <strong>{{meeting_title}}</strong>.</p><p><strong>Data:</strong> {{date}}</p><p><strong>Ora:</strong> {{start_time}} - {{end_time}}</p><p><strong>Sala:</strong> {{room_name}}</p><p>{{description}}</p><p>Cordiali saluti,<br>Interview Portal</p>', 24),
      ('vehicle_reminder', 'Promemoria Prenotazione Veicolo', 'Promemoria: Prenotazione veicolo {{plate}}',
       '<h2>Promemoria Prenotazione Veicolo</h2><p>Ti ricordiamo la prenotazione del veicolo.</p><p><strong>Veicolo:</strong> {{brand}} {{model}} ({{plate}})</p><p><strong>Data:</strong> {{date}}</p><p><strong>Ora:</strong> {{time}}</p><p><strong>Destinazione:</strong> {{destination}}</p><p>Cordiali saluti,<br>Interview Portal</p>', 24)
  `, (err) => {});

  // Migration: add parking_location to vehicles
  db.run(`ALTER TABLE vehicles ADD COLUMN parking_location TEXT`, (err) => {});

  // Richieste prenotazione (workflow approvazione)
  db.run(`
    CREATE TABLE IF NOT EXISTS booking_requests (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      request_type TEXT NOT NULL CHECK(request_type IN ('room', 'vehicle')),
      requester_id INTEGER NOT NULL,
      requester_email TEXT NOT NULL,
      requester_name TEXT,
      status TEXT DEFAULT 'pending' CHECK(status IN ('pending', 'approved', 'rejected', 'counter_proposed', 'counter_accepted', 'counter_rejected', 'cancelled')),
      -- Per richieste sala
      room_id INTEGER,
      meeting_title TEXT,
      meeting_description TEXT,
      -- Per richieste veicolo
      vehicle_id INTEGER,
      driver_name TEXT,
      destination TEXT,
      purpose TEXT,
      -- Date/orari richiesti
      requested_start TEXT NOT NULL,
      requested_end TEXT,
      -- Controproposta admin
      counter_room_id INTEGER,
      counter_vehicle_id INTEGER,
      counter_start TEXT,
      counter_end TEXT,
      counter_reason TEXT,
      -- Gestione risposta
      admin_id INTEGER,
      admin_notes TEXT,
      rejection_reason TEXT,
      -- Timestamps
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
      responded_at TEXT,
      FOREIGN KEY(requester_id) REFERENCES users(id),
      FOREIGN KEY(room_id) REFERENCES rooms(id),
      FOREIGN KEY(vehicle_id) REFERENCES vehicles(id),
      FOREIGN KEY(counter_room_id) REFERENCES rooms(id),
      FOREIGN KEY(counter_vehicle_id) REFERENCES vehicles(id),
      FOREIGN KEY(admin_id) REFERENCES users(id)
    )
  `);

  // Migration: update notification_templates to support request types
  db.get("SELECT sql FROM sqlite_master WHERE type='table' AND name='notification_templates'", (err, row) => {
    if (err) return;

    // Check if the current table has the request types in CHECK constraint
    if (row && row.sql && !row.sql.includes("'request_submitted'")) {
      console.log("Migrating notification_templates table to support request types...");

      // Create new table with extended CHECK constraint
      db.run(`
        CREATE TABLE IF NOT EXISTS notification_templates_new (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          type TEXT NOT NULL UNIQUE CHECK(type IN ('interview_reminder', 'meeting_reminder', 'vehicle_reminder', 'request_submitted', 'request_approved', 'request_rejected', 'request_counter')),
          name TEXT NOT NULL,
          subject TEXT NOT NULL,
          body TEXT NOT NULL,
          enabled INTEGER DEFAULT 1,
          hours_before INTEGER DEFAULT 24,
          updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
          updated_by INTEGER,
          FOREIGN KEY(updated_by) REFERENCES users(id)
        )
      `, (err) => {
        if (err) {
          console.error("Error creating notification_templates_new:", err);
          return;
        }

        // Copy data from old table
        db.run(`
          INSERT OR IGNORE INTO notification_templates_new (id, type, name, subject, body, enabled, hours_before, updated_at, updated_by)
          SELECT id, type, name, subject, body, enabled, hours_before, updated_at, updated_by FROM notification_templates
        `, (err) => {
          if (err) {
            console.error("Error copying notification_templates data:", err);
            return;
          }

          // Drop old table
          db.run(`DROP TABLE IF EXISTS notification_templates`, (err) => {
            if (err) {
              console.error("Error dropping old notification_templates table:", err);
              return;
            }

            // Rename new table
            db.run(`ALTER TABLE notification_templates_new RENAME TO notification_templates`, (err) => {
              if (err) {
                console.error("Error renaming notification_templates_new:", err);
                return;
              }
              console.log("notification_templates table migration completed successfully!");

              // Now insert the request templates
              db.run(`
                INSERT OR IGNORE INTO notification_templates (type, name, subject, body, hours_before)
                VALUES
                  ('request_submitted', 'Nuova Richiesta', 'Nuova richiesta di prenotazione da {{requester_name}}',
                   '<h2>Nuova Richiesta di Prenotazione</h2><p><strong>{{requester_name}}</strong> ha inviato una richiesta di prenotazione.</p><p><strong>Tipo:</strong> {{request_type}}</p><p><strong>Data richiesta:</strong> {{date}}</p><p><strong>Ora:</strong> {{start_time}} - {{end_time}}</p><p>{{details}}</p><p>Accedi al portale per gestire la richiesta.</p>', 0),
                  ('request_approved', 'Richiesta Approvata', 'La tua richiesta di prenotazione è stata approvata',
                   '<h2>Richiesta Approvata</h2><p>La tua richiesta di prenotazione è stata <strong>approvata</strong>.</p><p><strong>Tipo:</strong> {{request_type}}</p><p><strong>Data:</strong> {{date}}</p><p><strong>Ora:</strong> {{start_time}} - {{end_time}}</p><p>{{details}}</p><p>Cordiali saluti,<br>Interview Portal</p>', 0),
                  ('request_rejected', 'Richiesta Rifiutata', 'La tua richiesta di prenotazione è stata rifiutata',
                   '<h2>Richiesta Rifiutata</h2><p>La tua richiesta di prenotazione è stata <strong>rifiutata</strong>.</p><p><strong>Motivo:</strong> {{rejection_reason}}</p><p><strong>Tipo:</strong> {{request_type}}</p><p><strong>Data richiesta:</strong> {{date}}</p><p>Per ulteriori informazioni, contatta l''amministratore.</p><p>Cordiali saluti,<br>Interview Portal</p>', 0),
                  ('request_counter', 'Controproposta Ricevuta', 'Hai ricevuto una controproposta per la tua richiesta',
                   '<h2>Controproposta Ricevuta</h2><p>L''amministratore ha proposto una modifica alla tua richiesta.</p><p><strong>Proposta originale:</strong> {{original_details}}</p><p><strong>Controproposta:</strong> {{counter_details}}</p><p><strong>Motivo:</strong> {{counter_reason}}</p><p>Accedi al portale per accettare o rifiutare la controproposta.</p>', 0)
              `, (err) => {
                if (err) console.error("Error inserting request templates:", err);
                else console.log("Request notification templates inserted successfully!");
              });
            });
          });
        });
      });
    } else {
      // Table already has the new constraint, just insert templates
      db.run(`
        INSERT OR IGNORE INTO notification_templates (type, name, subject, body, hours_before)
        VALUES
          ('request_submitted', 'Nuova Richiesta', 'Nuova richiesta di prenotazione da {{requester_name}}',
           '<h2>Nuova Richiesta di Prenotazione</h2><p><strong>{{requester_name}}</strong> ha inviato una richiesta di prenotazione.</p><p><strong>Tipo:</strong> {{request_type}}</p><p><strong>Data richiesta:</strong> {{date}}</p><p><strong>Ora:</strong> {{start_time}} - {{end_time}}</p><p>{{details}}</p><p>Accedi al portale per gestire la richiesta.</p>', 0),
          ('request_approved', 'Richiesta Approvata', 'La tua richiesta di prenotazione è stata approvata',
           '<h2>Richiesta Approvata</h2><p>La tua richiesta di prenotazione è stata <strong>approvata</strong>.</p><p><strong>Tipo:</strong> {{request_type}}</p><p><strong>Data:</strong> {{date}}</p><p><strong>Ora:</strong> {{start_time}} - {{end_time}}</p><p>{{details}}</p><p>Cordiali saluti,<br>Interview Portal</p>', 0),
          ('request_rejected', 'Richiesta Rifiutata', 'La tua richiesta di prenotazione è stata rifiutata',
           '<h2>Richiesta Rifiutata</h2><p>La tua richiesta di prenotazione è stata <strong>rifiutata</strong>.</p><p><strong>Motivo:</strong> {{rejection_reason}}</p><p><strong>Tipo:</strong> {{request_type}}</p><p><strong>Data richiesta:</strong> {{date}}</p><p>Per ulteriori informazioni, contatta l''amministratore.</p><p>Cordiali saluti,<br>Interview Portal</p>', 0),
          ('request_counter', 'Controproposta Ricevuta', 'Hai ricevuto una controproposta per la tua richiesta',
           '<h2>Controproposta Ricevuta</h2><p>L''amministratore ha proposto una modifica alla tua richiesta.</p><p><strong>Proposta originale:</strong> {{original_details}}</p><p><strong>Controproposta:</strong> {{counter_details}}</p><p><strong>Motivo:</strong> {{counter_reason}}</p><p>Accedi al portale per accettare o rifiutare la controproposta.</p>', 0)
      `, (err) => {});
    }
  });
});

export default db;
