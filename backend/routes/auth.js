import express from "express";
import db from "../db.js";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";

const router = express.Router();

// login
router.post("/login", (req, res) => {
  const { email, password } = req.body;

  db.get("SELECT * FROM users WHERE email = ?", [email], async (err, user) => {
    if (err) return res.status(500).json({ message: "Errore DB" });
    if (!user) return res.status(401).json({ message: "Credenziali non valide" });

    const match = await bcrypt.compare(password, user.password_hash);
    if (!match) return res.status(401).json({ message: "Credenziali non valide" });

    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      process.env.JWT_SECRET || "supersecret",
      { expiresIn: "8h" }
    );

    res.json({
      token,
      user: { id: user.id, email: user.email, role: user.role }
    });
  });
});

// endpoint per sapere chi è loggato
router.get("/me", (req, res) => {
  res.json({ user: req.user });
});

export default router;
