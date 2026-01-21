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
  const { identifier, password } = req.body;

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
