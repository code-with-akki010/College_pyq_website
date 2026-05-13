const express = require("express");
const multer = require("multer");
const cors = require("cors");
const fs = require("fs");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 3000;
const MAX_FILE_SIZE_MB = Number(process.env.MAX_FILE_SIZE_MB || 50);
const LEGACY_PAPERS_DIR = path.join(__dirname, "papers");

const SUPABASE_URL = String(process.env.SUPABASE_URL || "").replace(/\/+$/, "");
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY || "";
const SUPABASE_BUCKET = process.env.SUPABASE_BUCKET || "papers";
const SUPABASE_TABLE = process.env.SUPABASE_TABLE || "papers";
const USE_SUPABASE = Boolean(SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY);

let db = null;
let DB_FILE = process.env.DB_FILE || path.join(__dirname, "campusbytes.sqlite");

if (!USE_SUPABASE) {
  const { DatabaseSync } = require("node:sqlite");
  db = new DatabaseSync(DB_FILE);
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
}

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

function buildStoragePath(fields, filename) {
  const stamp = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  return `sem-${fields.semester}/${fields.year}/${stamp}-${filename}`;
}

function rowToPaper(row) {
  return {
    id: row.id,
    semester: row.semester,
    subject: row.subject,
    category: row.category,
    year: row.year,
    filename: row.filename,
    file: `api/papers/${encodeURIComponent(row.id)}/file`,
    sizeBytes: row.size_bytes,
    createdAt: row.created_at
  };
}

function sendPaperEvent(res, type, payload = {}) {
  res.write(`event: ${type}\n`);
  res.write(`data: ${JSON.stringify({ type, ...payload })}\n\n`);
}

async function broadcastPaperLibrary(type = "papers:update") {
  const papers = await listPapers();
  for (const client of eventClients) {
    sendPaperEvent(client, type, { papers, total: papers.length, updatedAt: new Date().toISOString() });
  }
}

function supabaseHeaders(extra = {}) {
  return {
    apikey: SUPABASE_SERVICE_ROLE_KEY,
    Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
    ...extra
  };
}

async function supabaseRequest(urlPath, options = {}) {
  try {
    if (!SUPABASE_URL) {
      throw new Error("SUPABASE_URL is not set");
    }
    if (!SUPABASE_SERVICE_ROLE_KEY) {
      throw new Error("SUPABASE_SERVICE_ROLE_KEY is not set");
    }

    const res = await fetch(`${SUPABASE_URL}${urlPath}`, {
      ...options,
      headers: supabaseHeaders(options.headers || {})
    });

    const text = await res.text();
    const contentType = res.headers.get("content-type") || "";
    const data = contentType.includes("application/json") && text ? JSON.parse(text) : text;

    if (!res.ok) {
      const message = typeof data === "object" ? (data.message || data.error || JSON.stringify(data)) : data;
      throw new Error(message || `Supabase request failed with ${res.status}`);
    }

    return data;
  } catch (err) {
    console.error("Supabase request error:", err.message, "URL:", `${SUPABASE_URL}${urlPath}`);
    throw err;
  }
}

async function listSupabasePapers() {
  const query = [
    "select=id,semester,subject,category,year,filename,size_bytes,created_at",
    "order=year.desc,semester.asc,subject.asc,category.asc"
  ].join("&");
  const rows = await supabaseRequest(`/rest/v1/${SUPABASE_TABLE}?${query}`);
  return rows.map(rowToPaper);
}

async function uploadSupabasePaper(fields, file) {
  const filename = buildSafeFilename(fields, file.originalname);
  const storagePath = buildStoragePath(fields, filename);

  await supabaseRequest(`/storage/v1/object/${SUPABASE_BUCKET}/${encodeURI(storagePath)}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/pdf",
      "cache-control": "31536000",
      "x-upsert": "false"
    },
    body: file.buffer
  });

  try {
    const rows = await supabaseRequest(`/rest/v1/${SUPABASE_TABLE}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Prefer: "return=representation"
      },
      body: JSON.stringify({
        semester: fields.semester,
        subject: fields.subject,
        category: fields.category,
        year: fields.year,
        filename,
        storage_path: storagePath,
        mime_type: "application/pdf",
        size_bytes: file.buffer.length
      })
    });

    return rowToPaper(rows[0]);
  } catch (err) {
    await deleteSupabaseStorageObject(storagePath).catch(() => {});
    throw err;
  }
}

async function getSupabasePaper(id) {
  const rows = await supabaseRequest(
    `/rest/v1/${SUPABASE_TABLE}?select=id,filename,storage_path,mime_type,size_bytes&id=eq.${encodeURIComponent(id)}&limit=1`
  );
  return rows[0] || null;
}

async function downloadSupabasePaper(id, res) {
  const paper = await getSupabasePaper(id);
  if (!paper) return res.status(404).json({ error: "Paper not found." });

  const fileRes = await fetch(`${SUPABASE_URL}/storage/v1/object/${SUPABASE_BUCKET}/${encodeURI(paper.storage_path)}`, {
    headers: supabaseHeaders()
  });

  if (!fileRes.ok) {
    return res.status(fileRes.status).json({ error: "Could not retrieve paper file." });
  }

  const fileBuffer = Buffer.from(await fileRes.arrayBuffer());
  res.setHeader("Content-Type", paper.mime_type || "application/pdf");
  res.setHeader("Content-Length", fileBuffer.length);
  res.setHeader("Content-Disposition", `inline; filename="${encodeURIComponent(paper.filename)}"`);
  return res.send(fileBuffer);
}

async function deleteSupabaseStorageObject(storagePath) {
  return supabaseRequest(`/storage/v1/object/${SUPABASE_BUCKET}`, {
    method: "DELETE",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ prefixes: [storagePath] })
  });
}

async function deleteSupabasePaper(id) {
  const paper = await getSupabasePaper(id);
  if (!paper) return false;

  await supabaseRequest(`/rest/v1/${SUPABASE_TABLE}?id=eq.${encodeURIComponent(id)}`, {
    method: "DELETE"
  });
  await deleteSupabaseStorageObject(paper.storage_path).catch(() => {});
  return true;
}

function listSqlitePapers() {
  return db
    .prepare(`
      SELECT id, semester, subject, category, year, filename, size_bytes, created_at
      FROM papers
      ORDER BY year DESC, semester ASC, subject COLLATE NOCASE ASC, category COLLATE NOCASE ASC
    `)
    .all()
    .map(rowToPaper);
}

function uploadSqlitePaper(fields, file) {
  const filename = buildSafeFilename(fields, file.originalname);
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
      file.buffer.length,
      file.buffer
    );

  return rowToPaper({
    id: result.lastInsertRowid,
    ...fields,
    filename,
    size_bytes: file.buffer.length,
    created_at: new Date().toISOString()
  });
}

function downloadSqlitePaper(id, res) {
  const numericId = toPositiveInteger(id);
  if (!numericId) return res.status(400).json({ error: "Valid paper id required." });

  const paper = db
    .prepare("SELECT filename, mime_type, size_bytes, file_data FROM papers WHERE id = ?")
    .get(numericId);

  if (!paper) return res.status(404).json({ error: "Paper not found." });

  res.setHeader("Content-Type", paper.mime_type);
  res.setHeader("Content-Length", paper.size_bytes);
  res.setHeader("Content-Disposition", `inline; filename="${encodeURIComponent(paper.filename)}"`);
  return res.send(Buffer.from(paper.file_data));
}

function deleteSqlitePaper(id) {
  const numericId = toPositiveInteger(id);
  if (!numericId) return false;

  const result = db.prepare("DELETE FROM papers WHERE id = ?").run(numericId);
  return result.changes > 0;
}

async function listPapers() {
  return USE_SUPABASE ? listSupabasePapers() : listSqlitePapers();
}

async function uploadPaper(fields, file) {
  return USE_SUPABASE ? uploadSupabasePaper(fields, file) : uploadSqlitePaper(fields, file);
}

async function downloadPaper(id, res) {
  return USE_SUPABASE ? downloadSupabasePaper(id, res) : downloadSqlitePaper(id, res);
}

async function deletePaper(id) {
  return USE_SUPABASE ? deleteSupabasePaper(id) : deleteSqlitePaper(id);
}

function paperExistsSqlite(filename) {
  return Boolean(db.prepare("SELECT id FROM papers WHERE filename = ? LIMIT 1").get(filename));
}

function importLegacyPapersIfEmpty() {
  if (USE_SUPABASE) return;

  const count = db.prepare("SELECT COUNT(*) AS total FROM papers").get().total;
  if (count > 0 || !fs.existsSync(LEGACY_PAPERS_DIR)) return;

  const files = fs.readdirSync(LEGACY_PAPERS_DIR).filter((file) => file.toLowerCase().endsWith(".pdf"));
  let imported = 0;

  for (const filename of files) {
    const parsed = parseLegacyFilename(filename);
    if (!parsed || paperExistsSqlite(filename)) continue;

    uploadSqlitePaper(parsed, {
      originalname: filename,
      buffer: fs.readFileSync(path.join(LEGACY_PAPERS_DIR, filename))
    });
    imported += 1;
  }

  if (imported > 0) {
    console.log(`Imported ${imported} legacy paper(s) into ${DB_FILE}.`);
  }
}

app.get("/api/health", async (req, res) => {
  try {
    const papers = await listPapers();
    res.json({
      ok: true,
      storage: USE_SUPABASE ? "supabase" : "sqlite",
      database: USE_SUPABASE ? SUPABASE_TABLE : path.basename(DB_FILE),
      bucket: USE_SUPABASE ? SUPABASE_BUCKET : null,
      papers: papers.length
    });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

app.get("/api/papers", async (req, res) => {
  try {
    res.json(await listPapers());
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get("/api/papers/events", async (req, res) => {
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache, no-transform");
  res.setHeader("Connection", "keep-alive");
  res.flushHeaders?.();

  eventClients.add(res);
  sendPaperEvent(res, "papers:ready", {
    papers: await listPapers(),
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

app.get("/api/papers/:id/file", async (req, res) => {
  try {
    await downloadPaper(req.params.id, res);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/upload", upload.single("file"), async (req, res) => {
  const fields = validatePaperFields(req.body);
  if (fields.error) return res.status(400).json({ error: fields.error });
  if (!req.file) return res.status(400).json({ error: "A PDF file is required." });

  try {
    const paper = await uploadPaper(fields, req.file);
    const total = (await listPapers()).length;

    res.status(201).json({
      success: true,
      message: `"${paper.filename}" uploaded successfully.`,
      paper,
      total
    });
    await broadcastPaperLibrary("papers:uploaded");
  } catch (err) {
    const isDuplicate = String(err.message).toLowerCase().includes("duplicate") ||
      String(err.message).toLowerCase().includes("unique");
    res.status(isDuplicate ? 409 : 500).json({
      error: isDuplicate ? "This paper already exists." : err.message
    });
  }
});

app.delete("/api/papers/:id", async (req, res) => {
  try {
    const deleted = await deletePaper(req.params.id);
    if (!deleted) return res.status(404).json({ error: "Paper not found." });

    await broadcastPaperLibrary("papers:deleted");
    res.json({ success: true, message: "Paper deleted.", total: (await listPapers()).length });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete("/api/delete", async (req, res) => {
  try {
    const id = normalizeText(req.body?.id);
    if (!id) return res.status(400).json({ error: "Paper id required." });

    const deleted = await deletePaper(id);
    if (!deleted) return res.status(404).json({ error: "Paper not found." });

    await broadcastPaperLibrary("papers:deleted");
    res.json({ success: true, message: "Paper deleted.", total: (await listPapers()).length });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
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

app.listen(PORT, async () => {
  const papers = await listPapers().catch(() => []);
  console.log(`CampusBytes API running at http://localhost:${PORT}`);
  console.log(`Storage: ${USE_SUPABASE ? "Supabase" : "SQLite"}`);
  console.log(`Papers available: ${papers.length}`);
});
