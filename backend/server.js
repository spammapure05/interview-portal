import "dotenv/config";
import express from "express";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";
import "./db.js";
import { authMiddleware } from "./authMiddleware.js";
import authRoutes from "./routes/auth.js";
import candidatesRoutes from "./routes/candidates.js";
import interviewsRoutes from "./routes/interviews.js";

const app = express();
const PORT = process.env.PORT || 4000;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

app.use(cors());
app.use(express.json());

// Rotte pubbliche
app.use("/api/auth", authRoutes);
app.get("/api/health", (req, res) => res.json({ status: "ok" }));

// Rotte protette
app.use("/api", authMiddleware);
app.get("/api/health", (req, res) => res.json({ status: "ok" }));

app.use("/api/candidates", candidatesRoutes);
app.use("/api/interviews", interviewsRoutes);

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
});
