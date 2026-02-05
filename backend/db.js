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

  // Insert default notification templates with professional HTML design
  const interviewReminderHtml = `<!DOCTYPE html><html lang="it"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>Interview Portal</title></head><body style="margin: 0; padding: 0; background-color: #f8fafc; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color: #f8fafc;"><tr><td align="center" style="padding: 40px 20px;"><table role="presentation" width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 16px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06); overflow: hidden; max-width: 100%;"><tr><td style="background: linear-gradient(135deg, #4f46e5 0%, #4338ca 100%); padding: 32px 40px; text-align: center;"><h1 style="margin: 0; color: #ffffff; font-size: 24px; font-weight: 600; letter-spacing: -0.5px;">Interview Portal</h1></td></tr><tr><td style="padding: 40px;"><h2 style="margin: 0 0 8px 0; color: #0f172a; font-size: 22px; font-weight: 600;">Promemoria Colloquio</h2><p style="margin: 0 0 24px 0; color: #475569; font-size: 15px; line-height: 1.6;">Ti ricordiamo che hai un colloquio programmato.</p><table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color: #f8fafc; border-radius: 12px; margin: 24px 0; overflow: hidden; border: 1px solid #e2e8f0;"><tr><td style="background: linear-gradient(135deg, rgba(79,70,229,0.08) 0%, rgba(79,70,229,0.02) 100%); padding: 16px 20px; border-bottom: 1px solid #e2e8f0;"><h3 style="margin: 0; color: #4f46e5; font-size: 16px; font-weight: 600;">Dettagli Colloquio</h3></td></tr><tr><td style="padding: 12px 16px; border-bottom: 1px solid #e2e8f0;"><span style="color: #94a3b8; font-size: 13px; display: block; margin-bottom: 2px;">Candidato</span><span style="color: #0f172a; font-size: 15px; font-weight: 500;">{{candidate_name}}</span></td></tr><tr><td style="padding: 12px 16px; border-bottom: 1px solid #e2e8f0;"><span style="color: #94a3b8; font-size: 13px; display: block; margin-bottom: 2px;">Data</span><span style="color: #0f172a; font-size: 15px; font-weight: 500;">{{date}}</span></td></tr><tr><td style="padding: 12px 16px; border-bottom: 1px solid #e2e8f0;"><span style="color: #94a3b8; font-size: 13px; display: block; margin-bottom: 2px;">Orario</span><span style="color: #0f172a; font-size: 15px; font-weight: 500;">{{time}}</span></td></tr><tr><td style="padding: 12px 16px;"><span style="color: #94a3b8; font-size: 13px; display: block; margin-bottom: 2px;">Luogo</span><span style="color: #0f172a; font-size: 15px; font-weight: 500;">{{location}}</span></td></tr></table><p style="margin: 24px 0 0 0; color: #475569; font-size: 14px;">Cordiali saluti,<br><strong style="color: #0f172a;">Interview Portal</strong></p></td></tr><tr><td style="background-color: #f1f5f9; padding: 24px 40px; border-top: 1px solid #e2e8f0;"><p style="margin: 0; color: #94a3b8; font-size: 13px; text-align: center; line-height: 1.6;">Questa email &egrave; stata inviata automaticamente da Interview Portal.<br>Per assistenza, contatta l''amministratore del sistema.</p></td></tr></table></td></tr></table></body></html>`;

  const meetingReminderHtml = `<!DOCTYPE html><html lang="it"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>Interview Portal</title></head><body style="margin: 0; padding: 0; background-color: #f8fafc; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color: #f8fafc;"><tr><td align="center" style="padding: 40px 20px;"><table role="presentation" width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 16px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06); overflow: hidden; max-width: 100%;"><tr><td style="background: linear-gradient(135deg, #10b981 0%, #4338ca 100%); padding: 32px 40px; text-align: center;"><h1 style="margin: 0; color: #ffffff; font-size: 24px; font-weight: 600; letter-spacing: -0.5px;">Interview Portal</h1></td></tr><tr><td style="padding: 40px;"><h2 style="margin: 0 0 8px 0; color: #0f172a; font-size: 22px; font-weight: 600;">Promemoria Riunione</h2><p style="margin: 0 0 24px 0; color: #475569; font-size: 15px; line-height: 1.6;">Ti ricordiamo la riunione programmata.</p><table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color: #f8fafc; border-radius: 12px; margin: 24px 0; overflow: hidden; border: 1px solid #e2e8f0;"><tr><td style="background: linear-gradient(135deg, rgba(16,185,129,0.08) 0%, rgba(16,185,129,0.02) 100%); padding: 16px 20px; border-bottom: 1px solid #e2e8f0;"><h3 style="margin: 0; color: #10b981; font-size: 16px; font-weight: 600;">Dettagli Riunione</h3></td></tr><tr><td style="padding: 12px 16px; border-bottom: 1px solid #e2e8f0;"><span style="color: #94a3b8; font-size: 13px; display: block; margin-bottom: 2px;">Titolo</span><span style="color: #0f172a; font-size: 15px; font-weight: 500;">{{meeting_title}}</span></td></tr><tr><td style="padding: 12px 16px; border-bottom: 1px solid #e2e8f0;"><span style="color: #94a3b8; font-size: 13px; display: block; margin-bottom: 2px;">Sala</span><span style="color: #0f172a; font-size: 15px; font-weight: 500;">{{room_name}}</span></td></tr><tr><td style="padding: 12px 16px; border-bottom: 1px solid #e2e8f0;"><span style="color: #94a3b8; font-size: 13px; display: block; margin-bottom: 2px;">Data</span><span style="color: #0f172a; font-size: 15px; font-weight: 500;">{{date}}</span></td></tr><tr><td style="padding: 12px 16px; border-bottom: 1px solid #e2e8f0;"><span style="color: #94a3b8; font-size: 13px; display: block; margin-bottom: 2px;">Orario</span><span style="color: #0f172a; font-size: 15px; font-weight: 500;">{{start_time}} - {{end_time}}</span></td></tr><tr><td style="padding: 12px 16px;"><span style="color: #94a3b8; font-size: 13px; display: block; margin-bottom: 2px;">Note</span><span style="color: #0f172a; font-size: 15px; font-weight: 500;">{{description}}</span></td></tr></table><p style="margin: 24px 0 0 0; color: #475569; font-size: 14px;">Cordiali saluti,<br><strong style="color: #0f172a;">Interview Portal</strong></p></td></tr><tr><td style="background-color: #f1f5f9; padding: 24px 40px; border-top: 1px solid #e2e8f0;"><p style="margin: 0; color: #94a3b8; font-size: 13px; text-align: center; line-height: 1.6;">Questa email &egrave; stata inviata automaticamente da Interview Portal.<br>Per assistenza, contatta l''amministratore del sistema.</p></td></tr></table></td></tr></table></body></html>`;

  const vehicleReminderHtml = `<!DOCTYPE html><html lang="it"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>Interview Portal</title></head><body style="margin: 0; padding: 0; background-color: #f8fafc; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color: #f8fafc;"><tr><td align="center" style="padding: 40px 20px;"><table role="presentation" width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 16px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06); overflow: hidden; max-width: 100%;"><tr><td style="background: linear-gradient(135deg, #f59e0b 0%, #4338ca 100%); padding: 32px 40px; text-align: center;"><h1 style="margin: 0; color: #ffffff; font-size: 24px; font-weight: 600; letter-spacing: -0.5px;">Interview Portal</h1></td></tr><tr><td style="padding: 40px;"><h2 style="margin: 0 0 8px 0; color: #0f172a; font-size: 22px; font-weight: 600;">Promemoria Prenotazione Veicolo</h2><p style="margin: 0 0 24px 0; color: #475569; font-size: 15px; line-height: 1.6;">Ti ricordiamo la prenotazione del veicolo.</p><table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color: #f8fafc; border-radius: 12px; margin: 24px 0; overflow: hidden; border: 1px solid #e2e8f0;"><tr><td style="background: linear-gradient(135deg, rgba(245,158,11,0.08) 0%, rgba(245,158,11,0.02) 100%); padding: 16px 20px; border-bottom: 1px solid #e2e8f0;"><h3 style="margin: 0; color: #f59e0b; font-size: 16px; font-weight: 600;">Dettagli Prenotazione</h3></td></tr><tr><td style="padding: 12px 16px; border-bottom: 1px solid #e2e8f0;"><span style="color: #94a3b8; font-size: 13px; display: block; margin-bottom: 2px;">Veicolo</span><span style="color: #0f172a; font-size: 15px; font-weight: 500;">{{brand}} {{model}}</span></td></tr><tr><td style="padding: 12px 16px; border-bottom: 1px solid #e2e8f0;"><span style="color: #94a3b8; font-size: 13px; display: block; margin-bottom: 2px;">Targa</span><span style="color: #0f172a; font-size: 15px; font-weight: 500;">{{plate}}</span></td></tr><tr><td style="padding: 12px 16px; border-bottom: 1px solid #e2e8f0;"><span style="color: #94a3b8; font-size: 13px; display: block; margin-bottom: 2px;">Data</span><span style="color: #0f172a; font-size: 15px; font-weight: 500;">{{date}}</span></td></tr><tr><td style="padding: 12px 16px; border-bottom: 1px solid #e2e8f0;"><span style="color: #94a3b8; font-size: 13px; display: block; margin-bottom: 2px;">Orario</span><span style="color: #0f172a; font-size: 15px; font-weight: 500;">{{time}}</span></td></tr><tr><td style="padding: 12px 16px;"><span style="color: #94a3b8; font-size: 13px; display: block; margin-bottom: 2px;">Destinazione</span><span style="color: #0f172a; font-size: 15px; font-weight: 500;">{{destination}}</span></td></tr></table><p style="margin: 24px 0 0 0; color: #475569; font-size: 14px;">Cordiali saluti,<br><strong style="color: #0f172a;">Interview Portal</strong></p></td></tr><tr><td style="background-color: #f1f5f9; padding: 24px 40px; border-top: 1px solid #e2e8f0;"><p style="margin: 0; color: #94a3b8; font-size: 13px; text-align: center; line-height: 1.6;">Questa email &egrave; stata inviata automaticamente da Interview Portal.<br>Per assistenza, contatta l''amministratore del sistema.</p></td></tr></table></td></tr></table></body></html>`;

  db.run(`
    INSERT OR IGNORE INTO notification_templates (type, name, subject, body, hours_before)
    VALUES
      ('interview_reminder', 'Promemoria Colloquio', 'Promemoria: Colloquio programmato per {{candidate_name}}', ?, 24),
      ('meeting_reminder', 'Promemoria Riunione', 'Promemoria: Riunione "{{meeting_title}}" in {{room_name}}', ?, 24),
      ('vehicle_reminder', 'Promemoria Prenotazione Veicolo', 'Promemoria: Prenotazione veicolo {{plate}}', ?, 24)
  `, [interviewReminderHtml, meetingReminderHtml, vehicleReminderHtml], (err) => {});

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

              // Now insert the request templates with professional HTML
              const requestSubmittedHtml = `<!DOCTYPE html><html lang="it"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>Interview Portal</title></head><body style="margin: 0; padding: 0; background-color: #f8fafc; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color: #f8fafc;"><tr><td align="center" style="padding: 40px 20px;"><table role="presentation" width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 16px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1); overflow: hidden; max-width: 100%;"><tr><td style="background: linear-gradient(135deg, #f59e0b 0%, #4338ca 100%); padding: 32px 40px; text-align: center;"><h1 style="margin: 0; color: #ffffff; font-size: 24px; font-weight: 600;">Interview Portal</h1></td></tr><tr><td style="padding: 40px;"><div style="text-align: center; margin-bottom: 24px;"><span style="display: inline-block; padding: 6px 14px; background-color: #fef3c7; color: #92400e; border: 1px solid #fde68a; border-radius: 20px; font-size: 13px; font-weight: 600;">Nuova Richiesta</span></div><h2 style="margin: 0 0 8px 0; color: #0f172a; font-size: 22px; font-weight: 600; text-align: center;">Nuova Richiesta di Prenotazione</h2><p style="margin: 0 0 24px 0; color: #475569; font-size: 15px; line-height: 1.6; text-align: center;"><strong>{{requester_name}}</strong> ha inviato una nuova richiesta.</p><table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color: #f8fafc; border-radius: 12px; margin: 24px 0; border: 1px solid #e2e8f0;"><tr><td style="background: linear-gradient(135deg, rgba(245,158,11,0.08) 0%, rgba(245,158,11,0.02) 100%); padding: 16px 20px; border-bottom: 1px solid #e2e8f0;"><h3 style="margin: 0; color: #f59e0b; font-size: 16px; font-weight: 600;">Dettagli Richiesta</h3></td></tr><tr><td style="padding: 12px 16px; border-bottom: 1px solid #e2e8f0;"><span style="color: #94a3b8; font-size: 13px; display: block; margin-bottom: 2px;">Tipo</span><span style="color: #0f172a; font-size: 15px; font-weight: 500;">{{request_type}}</span></td></tr><tr><td style="padding: 12px 16px; border-bottom: 1px solid #e2e8f0;"><span style="color: #94a3b8; font-size: 13px; display: block; margin-bottom: 2px;">Data richiesta</span><span style="color: #0f172a; font-size: 15px; font-weight: 500;">{{date}}</span></td></tr><tr><td style="padding: 12px 16px; border-bottom: 1px solid #e2e8f0;"><span style="color: #94a3b8; font-size: 13px; display: block; margin-bottom: 2px;">Orario</span><span style="color: #0f172a; font-size: 15px; font-weight: 500;">{{start_time}} - {{end_time}}</span></td></tr><tr><td style="padding: 12px 16px;"><span style="color: #94a3b8; font-size: 13px; display: block; margin-bottom: 2px;">Dettagli</span><span style="color: #0f172a; font-size: 15px; font-weight: 500;">{{details}}</span></td></tr></table><p style="margin: 0; color: #475569; font-size: 14px; text-align: center;">Accedi al portale per gestire questa richiesta.</p></td></tr><tr><td style="background-color: #f1f5f9; padding: 24px 40px; border-top: 1px solid #e2e8f0;"><p style="margin: 0; color: #94a3b8; font-size: 13px; text-align: center; line-height: 1.6;">Questa email &egrave; stata inviata automaticamente da Interview Portal.</p></td></tr></table></td></tr></table></body></html>`;
              const requestApprovedHtml = `<!DOCTYPE html><html lang="it"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>Interview Portal</title></head><body style="margin: 0; padding: 0; background-color: #f8fafc; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color: #f8fafc;"><tr><td align="center" style="padding: 40px 20px;"><table role="presentation" width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 16px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1); overflow: hidden; max-width: 100%;"><tr><td style="background: linear-gradient(135deg, #10b981 0%, #4338ca 100%); padding: 32px 40px; text-align: center;"><h1 style="margin: 0; color: #ffffff; font-size: 24px; font-weight: 600;">Interview Portal</h1></td></tr><tr><td style="padding: 40px;"><div style="text-align: center; margin-bottom: 24px;"><span style="display: inline-block; padding: 6px 14px; background-color: #dcfce7; color: #166534; border: 1px solid #bbf7d0; border-radius: 20px; font-size: 13px; font-weight: 600;">Approvata</span></div><h2 style="margin: 0 0 8px 0; color: #0f172a; font-size: 22px; font-weight: 600; text-align: center;">Richiesta Approvata!</h2><p style="margin: 0 0 24px 0; color: #475569; font-size: 15px; line-height: 1.6; text-align: center;">La tua richiesta di prenotazione &egrave; stata approvata.</p><table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color: #f8fafc; border-radius: 12px; margin: 24px 0; border: 1px solid #e2e8f0;"><tr><td style="background: linear-gradient(135deg, rgba(16,185,129,0.08) 0%, rgba(16,185,129,0.02) 100%); padding: 16px 20px; border-bottom: 1px solid #e2e8f0;"><h3 style="margin: 0; color: #10b981; font-size: 16px; font-weight: 600;">Dettagli Prenotazione Confermata</h3></td></tr><tr><td style="padding: 12px 16px; border-bottom: 1px solid #e2e8f0;"><span style="color: #94a3b8; font-size: 13px; display: block; margin-bottom: 2px;">Tipo</span><span style="color: #0f172a; font-size: 15px; font-weight: 500;">{{request_type}}</span></td></tr><tr><td style="padding: 12px 16px; border-bottom: 1px solid #e2e8f0;"><span style="color: #94a3b8; font-size: 13px; display: block; margin-bottom: 2px;">Data</span><span style="color: #0f172a; font-size: 15px; font-weight: 500;">{{date}}</span></td></tr><tr><td style="padding: 12px 16px; border-bottom: 1px solid #e2e8f0;"><span style="color: #94a3b8; font-size: 13px; display: block; margin-bottom: 2px;">Orario</span><span style="color: #0f172a; font-size: 15px; font-weight: 500;">{{start_time}} - {{end_time}}</span></td></tr><tr><td style="padding: 12px 16px;"><span style="color: #94a3b8; font-size: 13px; display: block; margin-bottom: 2px;">Dettagli</span><span style="color: #0f172a; font-size: 15px; font-weight: 500;">{{details}}</span></td></tr></table><p style="margin: 24px 0 0 0; color: #475569; font-size: 14px;">Cordiali saluti,<br><strong style="color: #0f172a;">Interview Portal</strong></p></td></tr><tr><td style="background-color: #f1f5f9; padding: 24px 40px; border-top: 1px solid #e2e8f0;"><p style="margin: 0; color: #94a3b8; font-size: 13px; text-align: center; line-height: 1.6;">Questa email &egrave; stata inviata automaticamente da Interview Portal.</p></td></tr></table></td></tr></table></body></html>`;
              const requestRejectedHtml = `<!DOCTYPE html><html lang="it"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>Interview Portal</title></head><body style="margin: 0; padding: 0; background-color: #f8fafc; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color: #f8fafc;"><tr><td align="center" style="padding: 40px 20px;"><table role="presentation" width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 16px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1); overflow: hidden; max-width: 100%;"><tr><td style="background: linear-gradient(135deg, #ef4444 0%, #4338ca 100%); padding: 32px 40px; text-align: center;"><h1 style="margin: 0; color: #ffffff; font-size: 24px; font-weight: 600;">Interview Portal</h1></td></tr><tr><td style="padding: 40px;"><div style="text-align: center; margin-bottom: 24px;"><span style="display: inline-block; padding: 6px 14px; background-color: #fee2e2; color: #991b1b; border: 1px solid #fecaca; border-radius: 20px; font-size: 13px; font-weight: 600;">Rifiutata</span></div><h2 style="margin: 0 0 8px 0; color: #0f172a; font-size: 22px; font-weight: 600; text-align: center;">Richiesta Rifiutata</h2><p style="margin: 0 0 24px 0; color: #475569; font-size: 15px; line-height: 1.6; text-align: center;">Purtroppo la tua richiesta di prenotazione non &egrave; stata approvata.</p><table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color: #fef2f2; border-radius: 12px; margin: 24px 0; border: 1px solid #fecaca;"><tr><td style="padding: 20px;"><p style="margin: 0 0 8px 0; color: #ef4444; font-size: 13px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px;">Motivazione</p><p style="margin: 0; color: #0f172a; font-size: 15px; line-height: 1.6;">{{rejection_reason}}</p></td></tr></table><table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color: #f8fafc; border-radius: 12px; margin: 24px 0; border: 1px solid #e2e8f0;"><tr><td style="background: linear-gradient(135deg, rgba(239,68,68,0.08) 0%, rgba(239,68,68,0.02) 100%); padding: 16px 20px; border-bottom: 1px solid #e2e8f0;"><h3 style="margin: 0; color: #ef4444; font-size: 16px; font-weight: 600;">Dettagli Richiesta</h3></td></tr><tr><td style="padding: 12px 16px; border-bottom: 1px solid #e2e8f0;"><span style="color: #94a3b8; font-size: 13px; display: block; margin-bottom: 2px;">Tipo</span><span style="color: #0f172a; font-size: 15px; font-weight: 500;">{{request_type}}</span></td></tr><tr><td style="padding: 12px 16px;"><span style="color: #94a3b8; font-size: 13px; display: block; margin-bottom: 2px;">Data richiesta</span><span style="color: #0f172a; font-size: 15px; font-weight: 500;">{{date}}</span></td></tr></table><p style="margin: 24px 0 0 0; color: #475569; font-size: 14px;">Per ulteriori informazioni, contatta l''amministratore.<br><br>Cordiali saluti,<br><strong style="color: #0f172a;">Interview Portal</strong></p></td></tr><tr><td style="background-color: #f1f5f9; padding: 24px 40px; border-top: 1px solid #e2e8f0;"><p style="margin: 0; color: #94a3b8; font-size: 13px; text-align: center; line-height: 1.6;">Questa email &egrave; stata inviata automaticamente da Interview Portal.</p></td></tr></table></td></tr></table></body></html>`;
              const requestCounterHtml = `<!DOCTYPE html><html lang="it"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>Interview Portal</title></head><body style="margin: 0; padding: 0; background-color: #f8fafc; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color: #f8fafc;"><tr><td align="center" style="padding: 40px 20px;"><table role="presentation" width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 16px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1); overflow: hidden; max-width: 100%;"><tr><td style="background: linear-gradient(135deg, #2563eb 0%, #4338ca 100%); padding: 32px 40px; text-align: center;"><h1 style="margin: 0; color: #ffffff; font-size: 24px; font-weight: 600;">Interview Portal</h1></td></tr><tr><td style="padding: 40px;"><div style="text-align: center; margin-bottom: 24px;"><span style="display: inline-block; padding: 6px 14px; background-color: #dbeafe; color: #1e40af; border: 1px solid #bfdbfe; border-radius: 20px; font-size: 13px; font-weight: 600;">Controproposta</span></div><h2 style="margin: 0 0 8px 0; color: #0f172a; font-size: 22px; font-weight: 600; text-align: center;">Controproposta Ricevuta</h2><p style="margin: 0 0 24px 0; color: #475569; font-size: 15px; line-height: 1.6; text-align: center;">L''amministratore ha proposto una modifica alla tua richiesta.</p><table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin: 24px 0;"><tr><td width="48%" style="vertical-align: top;"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color: #f1f5f9; border-radius: 12px; border: 1px solid #e2e8f0;"><tr><td style="padding: 16px; border-bottom: 1px solid #e2e8f0;"><span style="color: #94a3b8; font-size: 12px; text-transform: uppercase; letter-spacing: 0.5px;">La tua richiesta</span></td></tr><tr><td style="padding: 16px;"><p style="margin: 0; color: #0f172a; font-size: 14px;">{{original_details}}</p></td></tr></table></td><td width="4%"></td><td width="48%" style="vertical-align: top;"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color: #dbeafe; border-radius: 12px; border: 1px solid #bfdbfe;"><tr><td style="padding: 16px; border-bottom: 1px solid #bfdbfe;"><span style="color: #1e40af; font-size: 12px; text-transform: uppercase; letter-spacing: 0.5px; font-weight: 600;">Controproposta</span></td></tr><tr><td style="padding: 16px;"><p style="margin: 0; color: #0f172a; font-size: 14px; font-weight: 500;">{{counter_details}}</p></td></tr></table></td></tr></table><table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color: #fef3c7; border-radius: 12px; margin: 24px 0; border: 1px solid #fde68a;"><tr><td style="padding: 20px;"><p style="margin: 0 0 8px 0; color: #92400e; font-size: 13px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px;">Motivazione</p><p style="margin: 0; color: #0f172a; font-size: 15px; line-height: 1.6;">{{counter_reason}}</p></td></tr></table><p style="margin: 0; color: #475569; font-size: 14px; text-align: center;">Accedi al portale per accettare o rifiutare la controproposta.</p></td></tr><tr><td style="background-color: #f1f5f9; padding: 24px 40px; border-top: 1px solid #e2e8f0;"><p style="margin: 0; color: #94a3b8; font-size: 13px; text-align: center; line-height: 1.6;">Questa email &egrave; stata inviata automaticamente da Interview Portal.</p></td></tr></table></td></tr></table></body></html>`;
              db.run(`
                INSERT OR IGNORE INTO notification_templates (type, name, subject, body, hours_before)
                VALUES
                  ('request_submitted', 'Nuova Richiesta', 'Nuova richiesta di prenotazione da {{requester_name}}', ?, 0),
                  ('request_approved', 'Richiesta Approvata', 'La tua richiesta di prenotazione è stata approvata', ?, 0),
                  ('request_rejected', 'Richiesta Rifiutata', 'La tua richiesta di prenotazione è stata rifiutata', ?, 0),
                  ('request_counter', 'Controproposta Ricevuta', 'Hai ricevuto una controproposta per la tua richiesta', ?, 0)
              `, [requestSubmittedHtml, requestApprovedHtml, requestRejectedHtml, requestCounterHtml], (err) => {
                if (err) console.error("Error inserting request templates:", err);
                else console.log("Request notification templates inserted successfully!");
              });
            });
          });
        });
      });
    } else {
      // Table already has the new constraint, just insert templates with professional HTML
      const requestSubmittedHtml2 = `<!DOCTYPE html><html lang="it"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>Interview Portal</title></head><body style="margin: 0; padding: 0; background-color: #f8fafc; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color: #f8fafc;"><tr><td align="center" style="padding: 40px 20px;"><table role="presentation" width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 16px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1); overflow: hidden; max-width: 100%;"><tr><td style="background: linear-gradient(135deg, #f59e0b 0%, #4338ca 100%); padding: 32px 40px; text-align: center;"><h1 style="margin: 0; color: #ffffff; font-size: 24px; font-weight: 600;">Interview Portal</h1></td></tr><tr><td style="padding: 40px;"><div style="text-align: center; margin-bottom: 24px;"><span style="display: inline-block; padding: 6px 14px; background-color: #fef3c7; color: #92400e; border: 1px solid #fde68a; border-radius: 20px; font-size: 13px; font-weight: 600;">Nuova Richiesta</span></div><h2 style="margin: 0 0 8px 0; color: #0f172a; font-size: 22px; font-weight: 600; text-align: center;">Nuova Richiesta di Prenotazione</h2><p style="margin: 0 0 24px 0; color: #475569; font-size: 15px; line-height: 1.6; text-align: center;"><strong>{{requester_name}}</strong> ha inviato una nuova richiesta.</p><table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color: #f8fafc; border-radius: 12px; margin: 24px 0; border: 1px solid #e2e8f0;"><tr><td style="background: linear-gradient(135deg, rgba(245,158,11,0.08) 0%, rgba(245,158,11,0.02) 100%); padding: 16px 20px; border-bottom: 1px solid #e2e8f0;"><h3 style="margin: 0; color: #f59e0b; font-size: 16px; font-weight: 600;">Dettagli Richiesta</h3></td></tr><tr><td style="padding: 12px 16px; border-bottom: 1px solid #e2e8f0;"><span style="color: #94a3b8; font-size: 13px; display: block; margin-bottom: 2px;">Tipo</span><span style="color: #0f172a; font-size: 15px; font-weight: 500;">{{request_type}}</span></td></tr><tr><td style="padding: 12px 16px; border-bottom: 1px solid #e2e8f0;"><span style="color: #94a3b8; font-size: 13px; display: block; margin-bottom: 2px;">Data richiesta</span><span style="color: #0f172a; font-size: 15px; font-weight: 500;">{{date}}</span></td></tr><tr><td style="padding: 12px 16px; border-bottom: 1px solid #e2e8f0;"><span style="color: #94a3b8; font-size: 13px; display: block; margin-bottom: 2px;">Orario</span><span style="color: #0f172a; font-size: 15px; font-weight: 500;">{{start_time}} - {{end_time}}</span></td></tr><tr><td style="padding: 12px 16px;"><span style="color: #94a3b8; font-size: 13px; display: block; margin-bottom: 2px;">Dettagli</span><span style="color: #0f172a; font-size: 15px; font-weight: 500;">{{details}}</span></td></tr></table><p style="margin: 0; color: #475569; font-size: 14px; text-align: center;">Accedi al portale per gestire questa richiesta.</p></td></tr><tr><td style="background-color: #f1f5f9; padding: 24px 40px; border-top: 1px solid #e2e8f0;"><p style="margin: 0; color: #94a3b8; font-size: 13px; text-align: center; line-height: 1.6;">Questa email &egrave; stata inviata automaticamente da Interview Portal.</p></td></tr></table></td></tr></table></body></html>`;
      const requestApprovedHtml2 = `<!DOCTYPE html><html lang="it"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>Interview Portal</title></head><body style="margin: 0; padding: 0; background-color: #f8fafc; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color: #f8fafc;"><tr><td align="center" style="padding: 40px 20px;"><table role="presentation" width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 16px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1); overflow: hidden; max-width: 100%;"><tr><td style="background: linear-gradient(135deg, #10b981 0%, #4338ca 100%); padding: 32px 40px; text-align: center;"><h1 style="margin: 0; color: #ffffff; font-size: 24px; font-weight: 600;">Interview Portal</h1></td></tr><tr><td style="padding: 40px;"><div style="text-align: center; margin-bottom: 24px;"><span style="display: inline-block; padding: 6px 14px; background-color: #dcfce7; color: #166534; border: 1px solid #bbf7d0; border-radius: 20px; font-size: 13px; font-weight: 600;">Approvata</span></div><h2 style="margin: 0 0 8px 0; color: #0f172a; font-size: 22px; font-weight: 600; text-align: center;">Richiesta Approvata!</h2><p style="margin: 0 0 24px 0; color: #475569; font-size: 15px; line-height: 1.6; text-align: center;">La tua richiesta di prenotazione &egrave; stata approvata.</p><table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color: #f8fafc; border-radius: 12px; margin: 24px 0; border: 1px solid #e2e8f0;"><tr><td style="background: linear-gradient(135deg, rgba(16,185,129,0.08) 0%, rgba(16,185,129,0.02) 100%); padding: 16px 20px; border-bottom: 1px solid #e2e8f0;"><h3 style="margin: 0; color: #10b981; font-size: 16px; font-weight: 600;">Dettagli Prenotazione Confermata</h3></td></tr><tr><td style="padding: 12px 16px; border-bottom: 1px solid #e2e8f0;"><span style="color: #94a3b8; font-size: 13px; display: block; margin-bottom: 2px;">Tipo</span><span style="color: #0f172a; font-size: 15px; font-weight: 500;">{{request_type}}</span></td></tr><tr><td style="padding: 12px 16px; border-bottom: 1px solid #e2e8f0;"><span style="color: #94a3b8; font-size: 13px; display: block; margin-bottom: 2px;">Data</span><span style="color: #0f172a; font-size: 15px; font-weight: 500;">{{date}}</span></td></tr><tr><td style="padding: 12px 16px; border-bottom: 1px solid #e2e8f0;"><span style="color: #94a3b8; font-size: 13px; display: block; margin-bottom: 2px;">Orario</span><span style="color: #0f172a; font-size: 15px; font-weight: 500;">{{start_time}} - {{end_time}}</span></td></tr><tr><td style="padding: 12px 16px;"><span style="color: #94a3b8; font-size: 13px; display: block; margin-bottom: 2px;">Dettagli</span><span style="color: #0f172a; font-size: 15px; font-weight: 500;">{{details}}</span></td></tr></table><p style="margin: 24px 0 0 0; color: #475569; font-size: 14px;">Cordiali saluti,<br><strong style="color: #0f172a;">Interview Portal</strong></p></td></tr><tr><td style="background-color: #f1f5f9; padding: 24px 40px; border-top: 1px solid #e2e8f0;"><p style="margin: 0; color: #94a3b8; font-size: 13px; text-align: center; line-height: 1.6;">Questa email &egrave; stata inviata automaticamente da Interview Portal.</p></td></tr></table></td></tr></table></body></html>`;
      const requestRejectedHtml2 = `<!DOCTYPE html><html lang="it"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>Interview Portal</title></head><body style="margin: 0; padding: 0; background-color: #f8fafc; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color: #f8fafc;"><tr><td align="center" style="padding: 40px 20px;"><table role="presentation" width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 16px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1); overflow: hidden; max-width: 100%;"><tr><td style="background: linear-gradient(135deg, #ef4444 0%, #4338ca 100%); padding: 32px 40px; text-align: center;"><h1 style="margin: 0; color: #ffffff; font-size: 24px; font-weight: 600;">Interview Portal</h1></td></tr><tr><td style="padding: 40px;"><div style="text-align: center; margin-bottom: 24px;"><span style="display: inline-block; padding: 6px 14px; background-color: #fee2e2; color: #991b1b; border: 1px solid #fecaca; border-radius: 20px; font-size: 13px; font-weight: 600;">Rifiutata</span></div><h2 style="margin: 0 0 8px 0; color: #0f172a; font-size: 22px; font-weight: 600; text-align: center;">Richiesta Rifiutata</h2><p style="margin: 0 0 24px 0; color: #475569; font-size: 15px; line-height: 1.6; text-align: center;">Purtroppo la tua richiesta di prenotazione non &egrave; stata approvata.</p><table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color: #fef2f2; border-radius: 12px; margin: 24px 0; border: 1px solid #fecaca;"><tr><td style="padding: 20px;"><p style="margin: 0 0 8px 0; color: #ef4444; font-size: 13px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px;">Motivazione</p><p style="margin: 0; color: #0f172a; font-size: 15px; line-height: 1.6;">{{rejection_reason}}</p></td></tr></table><table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color: #f8fafc; border-radius: 12px; margin: 24px 0; border: 1px solid #e2e8f0;"><tr><td style="background: linear-gradient(135deg, rgba(239,68,68,0.08) 0%, rgba(239,68,68,0.02) 100%); padding: 16px 20px; border-bottom: 1px solid #e2e8f0;"><h3 style="margin: 0; color: #ef4444; font-size: 16px; font-weight: 600;">Dettagli Richiesta</h3></td></tr><tr><td style="padding: 12px 16px; border-bottom: 1px solid #e2e8f0;"><span style="color: #94a3b8; font-size: 13px; display: block; margin-bottom: 2px;">Tipo</span><span style="color: #0f172a; font-size: 15px; font-weight: 500;">{{request_type}}</span></td></tr><tr><td style="padding: 12px 16px;"><span style="color: #94a3b8; font-size: 13px; display: block; margin-bottom: 2px;">Data richiesta</span><span style="color: #0f172a; font-size: 15px; font-weight: 500;">{{date}}</span></td></tr></table><p style="margin: 24px 0 0 0; color: #475569; font-size: 14px;">Per ulteriori informazioni, contatta l''amministratore.<br><br>Cordiali saluti,<br><strong style="color: #0f172a;">Interview Portal</strong></p></td></tr><tr><td style="background-color: #f1f5f9; padding: 24px 40px; border-top: 1px solid #e2e8f0;"><p style="margin: 0; color: #94a3b8; font-size: 13px; text-align: center; line-height: 1.6;">Questa email &egrave; stata inviata automaticamente da Interview Portal.</p></td></tr></table></td></tr></table></body></html>`;
      const requestCounterHtml2 = `<!DOCTYPE html><html lang="it"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>Interview Portal</title></head><body style="margin: 0; padding: 0; background-color: #f8fafc; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color: #f8fafc;"><tr><td align="center" style="padding: 40px 20px;"><table role="presentation" width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 16px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1); overflow: hidden; max-width: 100%;"><tr><td style="background: linear-gradient(135deg, #2563eb 0%, #4338ca 100%); padding: 32px 40px; text-align: center;"><h1 style="margin: 0; color: #ffffff; font-size: 24px; font-weight: 600;">Interview Portal</h1></td></tr><tr><td style="padding: 40px;"><div style="text-align: center; margin-bottom: 24px;"><span style="display: inline-block; padding: 6px 14px; background-color: #dbeafe; color: #1e40af; border: 1px solid #bfdbfe; border-radius: 20px; font-size: 13px; font-weight: 600;">Controproposta</span></div><h2 style="margin: 0 0 8px 0; color: #0f172a; font-size: 22px; font-weight: 600; text-align: center;">Controproposta Ricevuta</h2><p style="margin: 0 0 24px 0; color: #475569; font-size: 15px; line-height: 1.6; text-align: center;">L''amministratore ha proposto una modifica alla tua richiesta.</p><table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin: 24px 0;"><tr><td width="48%" style="vertical-align: top;"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color: #f1f5f9; border-radius: 12px; border: 1px solid #e2e8f0;"><tr><td style="padding: 16px; border-bottom: 1px solid #e2e8f0;"><span style="color: #94a3b8; font-size: 12px; text-transform: uppercase; letter-spacing: 0.5px;">La tua richiesta</span></td></tr><tr><td style="padding: 16px;"><p style="margin: 0; color: #0f172a; font-size: 14px;">{{original_details}}</p></td></tr></table></td><td width="4%"></td><td width="48%" style="vertical-align: top;"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color: #dbeafe; border-radius: 12px; border: 1px solid #bfdbfe;"><tr><td style="padding: 16px; border-bottom: 1px solid #bfdbfe;"><span style="color: #1e40af; font-size: 12px; text-transform: uppercase; letter-spacing: 0.5px; font-weight: 600;">Controproposta</span></td></tr><tr><td style="padding: 16px;"><p style="margin: 0; color: #0f172a; font-size: 14px; font-weight: 500;">{{counter_details}}</p></td></tr></table></td></tr></table><table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color: #fef3c7; border-radius: 12px; margin: 24px 0; border: 1px solid #fde68a;"><tr><td style="padding: 20px;"><p style="margin: 0 0 8px 0; color: #92400e; font-size: 13px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px;">Motivazione</p><p style="margin: 0; color: #0f172a; font-size: 15px; line-height: 1.6;">{{counter_reason}}</p></td></tr></table><p style="margin: 0; color: #475569; font-size: 14px; text-align: center;">Accedi al portale per accettare o rifiutare la controproposta.</p></td></tr><tr><td style="background-color: #f1f5f9; padding: 24px 40px; border-top: 1px solid #e2e8f0;"><p style="margin: 0; color: #94a3b8; font-size: 13px; text-align: center; line-height: 1.6;">Questa email &egrave; stata inviata automaticamente da Interview Portal.</p></td></tr></table></td></tr></table></body></html>`;
      db.run(`
        INSERT OR IGNORE INTO notification_templates (type, name, subject, body, hours_before)
        VALUES
          ('request_submitted', 'Nuova Richiesta', 'Nuova richiesta di prenotazione da {{requester_name}}', ?, 0),
          ('request_approved', 'Richiesta Approvata', 'La tua richiesta di prenotazione è stata approvata', ?, 0),
          ('request_rejected', 'Richiesta Rifiutata', 'La tua richiesta di prenotazione è stata rifiutata', ?, 0),
          ('request_counter', 'Controproposta Ricevuta', 'Hai ricevuto una controproposta per la tua richiesta', ?, 0)
      `, [requestSubmittedHtml2, requestApprovedHtml2, requestRejectedHtml2, requestCounterHtml2], (err) => {});
    }
  });

  // ===== NOTIFICHE IN-APP =====
  db.run(`
    CREATE TABLE IF NOT EXISTS in_app_notifications (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      type TEXT NOT NULL,
      title TEXT NOT NULL,
      message TEXT NOT NULL,
      link TEXT,
      read INTEGER DEFAULT 0,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(user_id) REFERENCES users(id)
    )
  `);

  // Indice per query veloci sulle notifiche non lette
  db.run(`CREATE INDEX IF NOT EXISTS idx_notifications_user_read ON in_app_notifications(user_id, read)`);

  // ===== PREFERENZE UTENTE =====
  db.run(`
    CREATE TABLE IF NOT EXISTS user_preferences (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER UNIQUE NOT NULL,
      theme TEXT DEFAULT 'light' CHECK(theme IN ('light', 'dark', 'system')),
      saved_filters TEXT,
      notifications_enabled INTEGER DEFAULT 1,
      email_notifications INTEGER DEFAULT 1,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(user_id) REFERENCES users(id)
    )
  `);

  // ===== 2FA - TWO FACTOR AUTHENTICATION =====
  // Migration: add 2FA columns to users
  db.run(`ALTER TABLE users ADD COLUMN totp_secret TEXT`, (err) => {});
  db.run(`ALTER TABLE users ADD COLUMN totp_enabled INTEGER DEFAULT 0`, (err) => {});
  db.run(`ALTER TABLE users ADD COLUMN backup_codes TEXT`, (err) => {});

  // Trusted devices for 2FA
  db.run(`
    CREATE TABLE IF NOT EXISTS trusted_devices (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      device_id TEXT NOT NULL,
      device_name TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      expires_at TEXT NOT NULL,
      FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
    )
  `);

  db.run(`CREATE INDEX IF NOT EXISTS idx_trusted_devices_user ON trusted_devices(user_id)`);
  db.run(`CREATE INDEX IF NOT EXISTS idx_trusted_devices_device ON trusted_devices(device_id)`);
});

export default db;
