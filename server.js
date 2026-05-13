const express = require("express");
const multer = require("multer");
const cors = require("cors");
const fs = require("fs");
const path = require("path");
const { DatabaseSync } = require("node:sqlite");

const app = express();
const PORT = process.env.PORT || 3000;
const DB_FILE = process.env.DB_FILE || path.join(__dirname, "campusbytes.sqlite");
const LEGACY_PAPERS_DIR = path.join(__dirname, "papers");
const MAX_FILE_SIZE_MB = Number(process.env.MAX_FILE_SIZE_MB || 10);

const db = new DatabaseSync(DB_FILE);

db.exec(`
  CREATE TABLE IF NOT EXISTS papers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    semester INTEGER NOT NULL CHECK (semester BETWEEN 1 AND 8),
    subject TEXT NOT NULL,
    category TEXT NOT NULL,
    year INTEGER NOT NULL,
    filename TEXT NOT NULL,
    mime_type TEXT NOT NULL DEFAULT 'application/pdf',
    size_bytes INTEGER NOT NULL,
    file_data BLOB NOT NULL,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  );

  CREATE UNIQUE INDEX IF NOT EXISTS idx_papers_unique_meta
    ON papers (semester, subject, category, year, filename);
`);

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: MAX_FILE_SIZE_MB * 1024 * 1024
  },
  fileFilter: (req, file, cb) => {
    const isPdf = file.mimetype === "application/pdf" || file.originalname.toLowerCase().endsWith(".pdf");
    cb(isPdf ? null : new Error("Only PDF files are allowed."), isPdf);
  }
});

const eventClients = new Set();

app.use(cors());
app.use(express.json());
app.use(express.static(__dirname));

function normalizeText(value) {
  return String(value || "").trim();
}

function toPositiveInteger(value) {
  const number = Number(value);
  return Number.isInteger(number) ? number : null;
}

function validatePaperFields(body) {
  const semester = toPositiveInteger(body.semester);
  const year = toPositiveInteger(body.year);
  const subject = normalizeText(body.subject);
  const category = normalizeText(body.category);

  if (!semester || semester < 1 || semester > 8) {
    return { error: "Semester must be a number between 1 and 8." };
  }

  if (subject.length < 3) {
    return { error: "Subject name must be at least 3 characters." };
  }

  if (!["Internal", "External", "Practical"].includes(category)) {
    return { error: "Category must be Internal, External, or Practical." };
  }

  if (!year || year < 2000 || year > new Date().getFullYear() + 1) {
    return { error: "Year is outside the allowed range." };
  }

  return { semester, subject, category, year };
}

function buildSafeFilename({ semester, subject, category, year }, originalName = "paper.pdf") {
  const safeSubject = subject
    .replace(/\s+/g, "_")
    .replace(/[^\w-]/g, "")
    .replace(/_+/g, "_")
    .replace(/^_+|_+$/g, "");
  const ext = path.extname(originalName).toLowerCase() === ".pdf" ? ".pdf" : ".pdf";

  return `SEM${semester}_${safeSubject}_${category}_${year}${ext}`;
}

function parseLegacyFilename(filename) {
  const nameOnly = path.basename(filename, ".pdf");
  const parts = nameOnly.split("_");
  if (parts.length < 4) return null;

  const semester = toPositiveInteger(parts[0].replace(/^SEM/i, ""));
  const year = toPositiveInteger(parts.at(-1));
  const category = parts.at(-2);
  const subject = parts.slice(1, -2).join(" ");

  if (!semester || !year || !subject || !category) return null;
  return { semester, subject, category, year };
}

function rowToPaper(row) {
  return {
    id: row.id,
    semester: row.semester,
    subject: row.subject,
    category: row.category,
    year: row.year,
    filename: row.filename,
    file: `api/papers/${row.id}/file`,
    sizeBytes: row.size_bytes,
    createdAt: row.created_at
  };
}

function listPapers() {
  return db
    .prepare(`
      SELECT id, semester, subject, category, year, filename, size_bytes, created_at
      FROM papers
      ORDER BY year DESC, semester ASC, subject COLLATE NOCASE ASC, category COLLATE NOCASE ASC
    `)
    .all()
    .map(rowToPaper);
}

function sendPaperEvent(res, type, payload = {}) {
  res.write(`event: ${type}\n`);
  res.write(`data: ${JSON.stringify({ type, ...payload })}\n\n`);
}

function broadcastPaperLibrary(type = "papers:update") {
  const papers = listPapers();
  for (const client of eventClients) {
    sendPaperEvent(client, type, { papers, total: papers.length, updatedAt: new Date().toISOString() });
  }
}

function paperExists(filename) {
  return Boolean(db.prepare("SELECT id FROM papers WHERE filename = ? LIMIT 1").get(filename));
}

function importLegacyPapersIfEmpty() {
  const count = db.prepare("SELECT COUNT(*) AS total FROM papers").get().total;
  if (count > 0 || !fs.existsSync(LEGACY_PAPERS_DIR)) return;

  const insert = db.prepare(`
    INSERT INTO papers (semester, subject, category, year, filename, mime_type, size_bytes, file_data)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const files = fs.readdirSync(LEGACY_PAPERS_DIR).filter((file) => file.toLowerCase().endsWith(".pdf"));
  let imported = 0;

  for (const filename of files) {
    const parsed = parseLegacyFilename(filename);
    if (!parsed || paperExists(filename)) continue;

    const filePath = path.join(LEGACY_PAPERS_DIR, filename);
    const fileData = fs.readFileSync(filePath);
    insert.run(
      parsed.semester,
      parsed.subject,
      parsed.category,
      parsed.year,
      filename,
      "application/pdf",
      fileData.length,
      fileData
    );
    imported += 1;
  }

  if (imported > 0) {
    console.log(`Imported ${imported} legacy paper(s) into ${DB_FILE}.`);
  }
}

app.get("/api/health", (req, res) => {
  res.json({ ok: true, database: path.basename(DB_FILE), papers: listPapers().length });
});

app.get("/api/papers", (req, res) => {
  res.json(listPapers());
});

app.get("/api/papers/events", (req, res) => {
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache, no-transform");
  res.setHeader("Connection", "keep-alive");
  res.flushHeaders?.();

  eventClients.add(res);
  sendPaperEvent(res, "papers:ready", {
    papers: listPapers(),
    total: listPapers().length,
    updatedAt: new Date().toISOString()
  });

  const heartbeat = setInterval(() => {
    sendPaperEvent(res, "heartbeat", { updatedAt: new Date().toISOString() });
  }, 25000);

  req.on("close", () => {
    clearInterval(heartbeat);
    eventClients.delete(res);
  });
});

app.get("/api/papers/:id/file", (req, res) => {
  const id = toPositiveInteger(req.params.id);
  if (!id) return res.status(400).json({ error: "Valid paper id required." });

  const paper = db
    .prepare("SELECT filename, mime_type, size_bytes, file_data FROM papers WHERE id = ?")
    .get(id);

  if (!paper) return res.status(404).json({ error: "Paper not found." });

  res.setHeader("Content-Type", paper.mime_type);
  res.setHeader("Content-Length", paper.size_bytes);
  res.setHeader("Content-Disposition", `inline; filename="${encodeURIComponent(paper.filename)}"`);
  res.send(Buffer.from(paper.file_data));
});

app.post("/api/upload", upload.single("file"), (req, res) => {
  const fields = validatePaperFields(req.body);
  if (fields.error) return res.status(400).json({ error: fields.error });
  if (!req.file) return res.status(400).json({ error: "A PDF file is required." });

  const filename = buildSafeFilename(fields, req.file.originalname);

  try {
    const result = db
      .prepare(`
        INSERT INTO papers (semester, subject, category, year, filename, mime_type, size_bytes, file_data)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `)
      .run(
        fields.semester,
        fields.subject,
        fields.category,
        fields.year,
        filename,
        "application/pdf",
        req.file.buffer.length,
        req.file.buffer
      );

    res.status(201).json({
      success: true,
      message: `"${filename}" uploaded to the database successfully.`,
      paper: rowToPaper({
        id: result.lastInsertRowid,
        ...fields,
        filename,
        size_bytes: req.file.buffer.length,
        created_at: new Date().toISOString()
      }),
      total: listPapers().length
    });
    broadcastPaperLibrary("papers:uploaded");
  } catch (err) {
    const isDuplicate = err.code === "ERR_SQLITE_ERROR" && String(err.message).includes("UNIQUE");
    res.status(isDuplicate ? 409 : 500).json({
      error: isDuplicate ? "This paper already exists in the database." : err.message
    });
  }
});

app.delete("/api/papers/:id", (req, res) => {
  const id = toPositiveInteger(req.params.id);
  if (!id) return res.status(400).json({ error: "Valid paper id required." });

  const result = db.prepare("DELETE FROM papers WHERE id = ?").run(id);
  if (result.changes === 0) return res.status(404).json({ error: "Paper not found." });

  broadcastPaperLibrary("papers:deleted");
  res.json({ success: true, message: "Paper deleted from the database.", total: listPapers().length });
});

app.delete("/api/delete", (req, res) => {
  const id = toPositiveInteger(req.body?.id);
  const filename = normalizeText(req.body?.filename);

  if (!id && !filename) {
    return res.status(400).json({ error: "Paper id or filename required." });
  }

  const result = id
    ? db.prepare("DELETE FROM papers WHERE id = ?").run(id)
    : db.prepare("DELETE FROM papers WHERE filename = ?").run(path.basename(filename));

  if (result.changes === 0) return res.status(404).json({ error: "Paper not found." });

  broadcastPaperLibrary("papers:deleted");
  res.json({ success: true, message: "Paper deleted from the database.", total: listPapers().length });
});

app.use((err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    const message = err.code === "LIMIT_FILE_SIZE"
      ? `PDF must be smaller than ${MAX_FILE_SIZE_MB} MB.`
      : err.message;
    return res.status(400).json({ error: message });
  }

  if (err) return res.status(400).json({ error: err.message });
  next();
});

importLegacyPapersIfEmpty();

app.listen(PORT, () => {
  console.log(`CampusBytes API running at http://localhost:${PORT}`);
  console.log(`Database: ${DB_FILE}`);
  console.log(`Papers in database: ${listPapers().length}`);
});
