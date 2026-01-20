import db from "../db.js";

let nodemailer = null;

// Lazy load nodemailer
async function getNodemailer() {
  if (!nodemailer) {
    nodemailer = await import("nodemailer");
  }
  return nodemailer.default;
}

// Get SMTP config from database
function getSmtpConfig() {
  return new Promise((resolve, reject) => {
    db.get("SELECT * FROM smtp_config WHERE id = 1 AND enabled = 1", (err, row) => {
      if (err) reject(err);
      else resolve(row);
    });
  });
}

// Get notification template
function getTemplate(type) {
  return new Promise((resolve, reject) => {
    db.get("SELECT * FROM notification_templates WHERE type = ? AND enabled = 1", [type], (err, row) => {
      if (err) reject(err);
      else resolve(row);
    });
  });
}

// Replace template variables
function processTemplate(template, data) {
  let subject = template.subject;
  let body = template.body;

  Object.keys(data).forEach(key => {
    const regex = new RegExp(`{{${key}}}`, "g");
    subject = subject.replace(regex, data[key] || "");
    body = body.replace(regex, data[key] || "");
  });

  return { subject, body };
}

// Send email
async function sendEmail(to, subject, html) {
  const config = await getSmtpConfig();
  if (!config) {
    console.log("SMTP not configured or disabled");
    return false;
  }

  try {
    const nm = await getNodemailer();
    const transporter = nm.createTransport({
      host: config.host,
      port: config.port,
      secure: !!config.secure,
      auth: config.username ? {
        user: config.username,
        pass: config.password
      } : undefined
    });

    await transporter.sendMail({
      from: `"${config.from_name}" <${config.from_email}>`,
      to,
      subject,
      html
    });

    return true;
  } catch (error) {
    console.error("Email send error:", error);
    throw error;
  }
}

// Schedule a notification
export function scheduleNotification(templateType, entityType, entityId, recipientEmail, recipientName, scheduledFor) {
  return new Promise((resolve, reject) => {
    db.run(
      `INSERT INTO scheduled_notifications (template_type, entity_type, entity_id, recipient_email, recipient_name, scheduled_for)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [templateType, entityType, entityId, recipientEmail, recipientName, scheduledFor],
      function(err) {
        if (err) reject(err);
        else resolve(this.lastID);
      }
    );
  });
}

// Cancel scheduled notifications for an entity
export function cancelNotifications(entityType, entityId) {
  return new Promise((resolve, reject) => {
    db.run(
      `DELETE FROM scheduled_notifications WHERE entity_type = ? AND entity_id = ? AND sent = 0`,
      [entityType, entityId],
      function(err) {
        if (err) reject(err);
        else resolve(this.changes);
      }
    );
  });
}

// Process pending notifications
async function processPendingNotifications() {
  const now = new Date().toISOString();

  return new Promise((resolve, reject) => {
    db.all(
      `SELECT * FROM scheduled_notifications WHERE sent = 0 AND scheduled_for <= ?`,
      [now],
      async (err, notifications) => {
        if (err) {
          console.error("Error fetching notifications:", err);
          return reject(err);
        }

        for (const notification of notifications) {
          try {
            const template = await getTemplate(notification.template_type);
            if (!template) {
              // Template disabled, mark as sent to avoid retry
              db.run(`UPDATE scheduled_notifications SET sent = 1, error = 'Template disabled' WHERE id = ?`, [notification.id]);
              continue;
            }

            // Get entity data based on type
            const entityData = await getEntityData(notification.entity_type, notification.entity_id);
            if (!entityData) {
              db.run(`UPDATE scheduled_notifications SET sent = 1, error = 'Entity not found' WHERE id = ?`, [notification.id]);
              continue;
            }

            const { subject, body } = processTemplate(template, {
              ...entityData,
              recipient_name: notification.recipient_name
            });

            await sendEmail(notification.recipient_email, subject, body);

            db.run(
              `UPDATE scheduled_notifications SET sent = 1, sent_at = CURRENT_TIMESTAMP WHERE id = ?`,
              [notification.id]
            );
          } catch (error) {
            console.error(`Error processing notification ${notification.id}:`, error);
            db.run(
              `UPDATE scheduled_notifications SET error = ? WHERE id = ?`,
              [error.message, notification.id]
            );
          }
        }

        resolve(notifications.length);
      }
    );
  });
}

// Get entity data for template
function getEntityData(entityType, entityId) {
  return new Promise((resolve, reject) => {
    let query;
    switch (entityType) {
      case "interview":
        query = `
          SELECT i.*, c.first_name, c.last_name, c.email as candidate_email
          FROM interviews i
          JOIN candidates c ON i.candidate_id = c.id
          WHERE i.id = ?
        `;
        break;
      case "meeting":
        query = `
          SELECT m.*, r.name as room_name, r.color as room_color
          FROM room_meetings m
          JOIN rooms r ON m.room_id = r.id
          WHERE m.id = ?
        `;
        break;
      case "vehicle":
        query = `
          SELECT b.*, v.plate, v.brand, v.model, v.color as vehicle_color
          FROM vehicle_bookings b
          JOIN vehicles v ON b.vehicle_id = v.id
          WHERE b.id = ?
        `;
        break;
      default:
        return resolve(null);
    }

    db.get(query, [entityId], (err, row) => {
      if (err) return reject(err);
      if (!row) return resolve(null);

      // Format data for templates
      let data = {};
      switch (entityType) {
        case "interview":
          const interviewDate = new Date(row.scheduled_at);
          data = {
            candidate_name: `${row.first_name} ${row.last_name}`,
            candidate_email: row.candidate_email,
            date: interviewDate.toLocaleDateString("it-IT", { weekday: "long", day: "numeric", month: "long", year: "numeric" }),
            time: interviewDate.toLocaleTimeString("it-IT", { hour: "2-digit", minute: "2-digit" }),
            location: row.location || "Non specificato",
            status: row.status
          };
          break;
        case "meeting":
          const meetingStart = new Date(row.start_time);
          const meetingEnd = new Date(row.end_time);
          data = {
            meeting_title: row.title,
            room_name: row.room_name,
            date: meetingStart.toLocaleDateString("it-IT", { weekday: "long", day: "numeric", month: "long", year: "numeric" }),
            start_time: meetingStart.toLocaleTimeString("it-IT", { hour: "2-digit", minute: "2-digit" }),
            end_time: meetingEnd.toLocaleTimeString("it-IT", { hour: "2-digit", minute: "2-digit" }),
            description: row.description || "",
            organizer: row.organizer || ""
          };
          break;
        case "vehicle":
          const vehicleDate = new Date(row.start_time);
          data = {
            plate: row.plate,
            brand: row.brand,
            model: row.model,
            driver_name: row.driver_name,
            date: vehicleDate.toLocaleDateString("it-IT", { weekday: "long", day: "numeric", month: "long", year: "numeric" }),
            time: vehicleDate.toLocaleTimeString("it-IT", { hour: "2-digit", minute: "2-digit" }),
            destination: row.destination || "Non specificata"
          };
          break;
      }

      resolve(data);
    });
  });
}

// Start the notification scheduler
let schedulerInterval = null;

export function startNotificationScheduler(intervalMinutes = 5) {
  if (schedulerInterval) {
    clearInterval(schedulerInterval);
  }

  console.log(`Starting notification scheduler (every ${intervalMinutes} minutes)`);

  // Run immediately
  processPendingNotifications().catch(console.error);

  // Then run at interval
  schedulerInterval = setInterval(() => {
    processPendingNotifications().catch(console.error);
  }, intervalMinutes * 60 * 1000);
}

export function stopNotificationScheduler() {
  if (schedulerInterval) {
    clearInterval(schedulerInterval);
    schedulerInterval = null;
    console.log("Notification scheduler stopped");
  }
}

export { sendEmail, getTemplate, processTemplate };
