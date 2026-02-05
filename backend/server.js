import "dotenv/config";
import express from "express";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import path from "path";
import { fileURLToPath } from "url";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import "./db.js";
import db from "./db.js";
import { authMiddleware } from "./authMiddleware.js";
import candidatesRoutes from "./routes/candidates.js";
import interviewsRoutes from "./routes/interviews.js";
import documentsRoutes from "./routes/documents.js";
import auditRoutes from "./routes/audit.js";
import statsRoutes from "./routes/stats.js";
import usersRoutes from "./routes/users.js";
import roomsRoutes from "./routes/rooms.js";
import roomMeetingsRoutes from "./routes/roomMeetings.js";
import vehiclesRoutes from "./routes/vehicles.js";
import vehicleBookingsRoutes from "./routes/vehicleBookings.js";
import settingsRoutes from "./routes/settings.js";
import searchRoutes from "./routes/search.js";
import exportRoutes from "./routes/export.js";
import bookingRequestsRoutes from "./routes/bookingRequests.js";
import notificationsRoutes from "./routes/notifications.js";
import userPreferencesRoutes from "./routes/userPreferences.js";
import { startNotificationScheduler } from "./services/emailService.js";
import twoFactorRoutes, { verifyBackupCode, verifyTOTP } from "./routes/twoFactor.js";

// ===== SECURITY: Verifica JWT_SECRET obbligatorio =====
if (!process.env.JWT_SECRET || process.env.JWT_SECRET === "supersecret" || process.env.JWT_SECRET === "supersecretcambialo") {
  console.error("ERRORE CRITICO: JWT_SECRET non configurato o insicuro!");
  console.error("Imposta una chiave sicura nel file .env (almeno 32 caratteri casuali)");
  process.exit(1);
}

const app = express();
const PORT = process.env.PORT || 4000;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ===== SECURITY HEADERS con Helmet =====
// Nota: CSP disabilitata perché React in produzione usa script inline
// Per abilitarla, serve configurare React con nonce o hash degli script
app.use(helmet({
  contentSecurityPolicy: false, // Disabilitata per compatibilità con React build
  crossOriginEmbedderPolicy: false
}));

// ===== CORS =====
// In un deploy single-container (frontend servito dallo stesso server),
// le richieste API sono same-origin quindi CORS non è un problema.
// Permettiamo comunque richieste cross-origin per flessibilità.
app.use(cors({
  origin: true, // Permette tutte le origin (sicuro perché l'auth è via JWT)
  credentials: true
}));

// ===== RATE LIMITING =====
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minuti
  max: 500, // limite generale per IP
  message: { message: "Troppe richieste, riprova più tardi" },
  standardHeaders: true,
  legacyHeaders: false
});

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minuti
  max: 10, // max 10 tentativi login per IP
  message: { message: "Troppi tentativi di login, riprova tra 15 minuti" },
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true // non conta i login riusciti
});

app.use("/api", generalLimiter);

// ===== BODY SIZE LIMIT =====
app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: true, limit: "1mb" }));

// ===== ROTTE PUBBLICHE (senza autenticazione) =====

// Health check
app.get("/api/health", (req, res) => res.json({ status: "ok" }));

// Login - PUBBLICA (con rate limiting specifico)
app.post("/api/auth/login", loginLimiter, (req, res) => {
  const { identifier, password, deviceId } = req.body;

  if (!identifier || !password) {
    return res.status(400).json({ message: "Dati mancanti" });
  }

  const sql = `
    SELECT * FROM users
    WHERE email = ?
      OR (instr(email, '@') > 0 AND substr(email, 1, instr(email, '@') - 1) = ?)
  `;

  db.get(sql, [identifier, identifier], async (err, user) => {
    if (err) return res.status(500).json({ message: "Errore DB" });
    if (!user) return res.status(401).json({ message: "Credenziali non valide" });

    const match = await bcrypt.compare(password, user.password_hash);
    if (!match) return res.status(401).json({ message: "Credenziali non valide" });

    // Check if 2FA is enabled
    if (user.totp_enabled === 1) {
      // Check if device is trusted
      if (deviceId) {
        const trustedDevice = await new Promise((resolve) => {
          db.get(
            "SELECT * FROM trusted_devices WHERE user_id = ? AND device_id = ? AND expires_at > datetime('now')",
            [user.id, deviceId],
            (err, row) => resolve(err ? null : row)
          );
        });

        if (trustedDevice) {
          // Device is trusted, issue full token
          const token = jwt.sign(
            { id: user.id, email: user.email, role: user.role },
            process.env.JWT_SECRET,
            { expiresIn: "8h" }
          );
          return res.json({
            token,
            user: { id: user.id, email: user.email, role: user.role }
          });
        }
      }

      // 2FA required - issue temporary token
      const tempToken = jwt.sign(
        { id: user.id, email: user.email, role: user.role, pending2FA: true },
        process.env.JWT_SECRET,
        { expiresIn: "5m" }
      );

      return res.json({
        requires2FA: true,
        tempToken
      });
    }

    // No 2FA - issue full token
    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: "8h" }
    );

    res.json({
      token,
      user: { id: user.id, email: user.email, role: user.role }
    });
  });
});

// Verify 2FA - PUBBLICA (con rate limiting)
const verify2FALimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { message: "Troppi tentativi, riprova tra 15 minuti" },
  standardHeaders: true,
  legacyHeaders: false
});

app.post("/api/auth/verify-2fa", verify2FALimiter, async (req, res) => {
  const { tempToken, code, trustDevice, deviceId, deviceName } = req.body;

  if (!tempToken || !code) {
    return res.status(400).json({ message: "Dati mancanti" });
  }

  try {
    // Verify temp token
    const decoded = jwt.verify(tempToken, process.env.JWT_SECRET);

    if (!decoded.pending2FA) {
      return res.status(400).json({ message: "Token non valido" });
    }

    // Get user data
    const user = await new Promise((resolve, reject) => {
      db.get(
        "SELECT id, email, role, totp_secret, backup_codes FROM users WHERE id = ?",
        [decoded.id],
        (err, row) => {
          if (err) reject(err);
          else resolve(row);
        }
      );
    });

    if (!user) {
      return res.status(401).json({ message: "Utente non trovato" });
    }

    // Check if it's a backup code (8 chars with optional dash)
    const normalizedCode = code.replace("-", "").toUpperCase();
    const isBackupCode = normalizedCode.length === 8 && /^[A-Z0-9]+$/.test(normalizedCode);

    let isValid = false;

    if (isBackupCode && user.backup_codes) {
      // Try backup code
      const hashedCodes = JSON.parse(user.backup_codes);
      const matchIndex = await verifyBackupCode(code, hashedCodes);

      if (matchIndex >= 0) {
        isValid = true;
        // Remove used backup code
        hashedCodes.splice(matchIndex, 1);
        await new Promise((resolve) => {
          db.run(
            "UPDATE users SET backup_codes = ? WHERE id = ?",
            [JSON.stringify(hashedCodes), user.id],
            () => resolve()
          );
        });
      }
    } else {
      // Try TOTP code
      isValid = verifyTOTP(code, user.totp_secret);
    }

    if (!isValid) {
      return res.status(401).json({ message: "Codice non valido" });
    }

    // If trustDevice is true, save the device
    if (trustDevice && deviceId) {
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 30); // 30 days

      await new Promise((resolve) => {
        db.run(
          `INSERT OR REPLACE INTO trusted_devices (user_id, device_id, device_name, expires_at)
           VALUES (?, ?, ?, ?)`,
          [user.id, deviceId, deviceName || "Dispositivo", expiresAt.toISOString()],
          () => resolve()
        );
      });
    }

    // Issue full token
    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: "8h" }
    );

    res.json({
      token,
      user: { id: user.id, email: user.email, role: user.role }
    });
  } catch (err) {
    if (err.name === "TokenExpiredError") {
      return res.status(401).json({ message: "Sessione scaduta, effettua nuovamente il login" });
    }
    console.error("Error in verify-2fa:", err);
    return res.status(401).json({ message: "Token non valido" });
  }
});

// ===== MIDDLEWARE AUTENTICAZIONE =====
// Tutte le rotte /api/* successive richiedono autenticazione
app.use("/api", authMiddleware);

// ===== ROTTE PROTETTE (richiedono autenticazione) =====

// Chi sono - PROTETTA
app.get("/api/auth/me", (req, res) => {
  res.json({ user: req.user });
});

// Altre rotte protette
app.use("/api/candidates", candidatesRoutes);
app.use("/api/interviews", interviewsRoutes);
app.use("/api/documents", documentsRoutes);
app.use("/api/audit", auditRoutes);
app.use("/api/stats", statsRoutes);
app.use("/api/users", usersRoutes);
app.use("/api/rooms", roomsRoutes);
app.use("/api/room-meetings", roomMeetingsRoutes);
app.use("/api/vehicles", vehiclesRoutes);
app.use("/api/vehicle-bookings", vehicleBookingsRoutes);
app.use("/api/settings", settingsRoutes);
app.use("/api/search", searchRoutes);
app.use("/api/export", exportRoutes);
app.use("/api/booking-requests", bookingRequestsRoutes);
app.use("/api/notifications", notificationsRoutes);
app.use("/api/preferences", userPreferencesRoutes);
app.use("/api/2fa", twoFactorRoutes);

// Static frontend (per deploy in un solo container)
const publicDir = path.join(__dirname, "public");
app.use(express.static(publicDir));
app.get("*", (req, res) => {
  if (req.path.startsWith("/api")) {
    return res.status(404).json({ message: "Not Found" });
  }
  res.sendFile(path.join(publicDir, "index.html"));
});

app.listen(PORT, () => {
  console.log(`Backend in ascolto sulla porta ${PORT}`);
  // Start notification scheduler (check every 5 minutes)
  startNotificationScheduler(5);
});
