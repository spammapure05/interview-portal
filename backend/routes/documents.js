import express from "express";
import multer from "multer";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import db from "../db.js";
import { requireRole } from "../rolesMiddleware.js";

const router = express.Router();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Directory per i documenti
const uploadsDir = path.join(__dirname, "..", "uploads");
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Configurazione multer
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname);
    cb(null, `doc-${uniqueSuffix}${ext}`);
  }
});

const fileFilter = (req, file, cb) => {
  const allowedTypes = [
    "application/pdf",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "image/jpeg",
    "image/png"
  ];
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error("Tipo file non supportato. Usa PDF, DOC, DOCX, JPG o PNG."), false);
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB max
});

// Lista documenti di un candidato
router.get("/candidate/:candidateId", requireRole("admin", "secretary"), (req, res) => {
  const { candidateId } = req.params;
  db.all(
    `SELECT d.*, u.email as uploader_email
     FROM documents d
     LEFT JOIN users u ON d.uploaded_by = u.id
     WHERE d.candidate_id = ?
     ORDER BY d.uploaded_at DESC`,
    [candidateId],
    (err, rows) => {
      if (err) return res.status(500).json({ message: "Errore DB" });
      res.json(rows);
    }
  );
});

// Upload documento
router.post("/candidate/:candidateId", requireRole("admin", "secretary"), upload.single("file"), (req, res) => {
  const { candidateId } = req.params;
  const { category } = req.body;
  const file = req.file;

  if (!file) {
    return res.status(400).json({ message: "Nessun file caricato" });
  }

  const docCategory = category || "other";

  db.run(
    `INSERT INTO documents (candidate_id, filename, original_name, mime_type, size, uploaded_by, category)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [candidateId, file.filename, file.originalname, file.mimetype, file.size, req.user.id, docCategory],
    function (err) {
      if (err) {
        // Rimuovi file se errore DB
        fs.unlinkSync(path.join(uploadsDir, file.filename));
        return res.status(500).json({ message: "Errore DB" });
      }

      // Log audit
      db.run(
        `INSERT INTO audit_log (user_id, user_email, action, entity_type, entity_id, details)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [req.user.id, req.user.email, "upload", "document", this.lastID, JSON.stringify({ filename: file.originalname, candidate_id: candidateId })]
      );

      res.status(201).json({
        id: this.lastID,
        filename: file.filename,
        original_name: file.originalname
      });
    }
  );
});

// Preview documento (inline)
router.get("/:id/preview", requireRole("admin", "secretary"), (req, res) => {
  const { id } = req.params;
  db.get("SELECT * FROM documents WHERE id = ?", [id], (err, doc) => {
    if (err) return res.status(500).json({ message: "Errore DB" });
    if (!doc) return res.status(404).json({ message: "Documento non trovato" });

    const filePath = path.join(uploadsDir, doc.filename);
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ message: "File non trovato" });
    }

    // Set content-disposition to inline for preview
    res.setHeader("Content-Type", doc.mime_type);
    res.setHeader("Content-Disposition", `inline; filename="${doc.original_name}"`);
    res.sendFile(filePath);
  });
});

// Download documento
router.get("/:id/download", requireRole("admin", "secretary"), (req, res) => {
  const { id } = req.params;
  db.get("SELECT * FROM documents WHERE id = ?", [id], (err, doc) => {
    if (err) return res.status(500).json({ message: "Errore DB" });
    if (!doc) return res.status(404).json({ message: "Documento non trovato" });

    const filePath = path.join(uploadsDir, doc.filename);
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ message: "File non trovato" });
    }

    res.download(filePath, doc.original_name);
  });
});

// Update document category
router.patch("/:id", requireRole("admin", "secretary"), (req, res) => {
  const { id } = req.params;
  const { category } = req.body;

  if (!category) {
    return res.status(400).json({ message: "Categoria obbligatoria" });
  }

  db.run(
    "UPDATE documents SET category = ? WHERE id = ?",
    [category, id],
    function(err) {
      if (err) return res.status(500).json({ message: "Errore DB" });
      if (this.changes === 0) return res.status(404).json({ message: "Documento non trovato" });
      res.json({ message: "Categoria aggiornata" });
    }
  );
});

// Elimina documento
router.delete("/:id", requireRole("admin"), (req, res) => {
  const { id } = req.params;
  db.get("SELECT * FROM documents WHERE id = ?", [id], (err, doc) => {
    if (err) return res.status(500).json({ message: "Errore DB" });
    if (!doc) return res.status(404).json({ message: "Documento non trovato" });

    const filePath = path.join(uploadsDir, doc.filename);

    db.run("DELETE FROM documents WHERE id = ?", [id], function (err) {
      if (err) return res.status(500).json({ message: "Errore DB" });

      // Rimuovi file fisico
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }

      // Log audit
      db.run(
        `INSERT INTO audit_log (user_id, user_email, action, entity_type, entity_id, details)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [req.user.id, req.user.email, "delete", "document", id, JSON.stringify({ filename: doc.original_name })]
      );

      res.json({ deleted: true });
    });
  });
});

export default router;
