const express = require("express");
const multer = require("multer");
const cors = require("cors");
const fs = require("fs");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 3000;
const PAPERS_DIR = path.join(__dirname, "papers");
const JSON_FILE = path.join(__dirname, "papers.json");

// ── ensure papers/ folder exists ──────────────────────────────────────────────
if (!fs.existsSync(PAPERS_DIR)) fs.mkdirSync(PAPERS_DIR);

app.use(cors());
app.use(express.json());
app.use(express.static(__dirname));          // serve HTML/CSS/JS files
app.use("/papers", express.static(PAPERS_DIR)); // serve uploaded PDFs

// ── Multer: store file with structured name ────────────────────────────────────
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, PAPERS_DIR),
  filename: (req, file, cb) => {
    const { semester, subject, category, year } = req.body;

    // sanitize subject for filename (replace spaces/special chars with _)
    const safeSubject = subject.trim().replace(/\s+/g, "_").replace(/[^\w\-]/g, "");

    // structured name: SEM3_DBMS_External_2023.pdf
    const name = `SEM${semester}_${safeSubject}_${category}_${year}.pdf`;
    cb(null, name);
  }
});

const upload = multer({
  storage,
  fileFilter: (req, file, cb) => {
    if (file.mimetype === "application/pdf") cb(null, true);
    else cb(new Error("Only PDF files are allowed!"), false);
  }
});

// ── Scan papers/ folder and rebuild papers.json ────────────────────────────────
function rebuildPapersJson() {
  const files = fs.readdirSync(PAPERS_DIR).filter(f => f.endsWith(".pdf"));

  const papers = files.map(filename => {
    // expected format: SEM{n}_{SUBJECT}_{CATEGORY}_{YEAR}.pdf
    const nameOnly = path.basename(filename, ".pdf");
    const parts = nameOnly.split("_");

    if (parts.length < 4) return null;   // skip malformed names

    const semester = parseInt(parts[0].replace("SEM", ""), 10);
    const year = parseInt(parts[parts.length - 1], 10);
    const category = parts[parts.length - 2];
    // subject may have multiple underscore segments in middle
    const subject = parts.slice(1, parts.length - 2).join(" ");

    if (isNaN(semester) || isNaN(year)) return null;

    return {
      semester,
      subject,
      category,
      year,
      file: `papers/${filename}`
    };
  }).filter(Boolean);

  fs.writeFileSync(JSON_FILE, JSON.stringify(papers, null, 2), "utf8");
  console.log(`✅  papers.json rebuilt — ${papers.length} paper(s) indexed.`);
  return papers;
}

// ── API: GET /api/papers ───────────────────────────────────────────────────────
app.get("/api/papers", (req, res) => {
  try {
    const papers = rebuildPapersJson();   // always fresh scan
    res.json(papers);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── API: POST /api/upload ──────────────────────────────────────────────────────
app.post("/api/upload", upload.single("file"), (req, res) => {
  try {
    const { semester, subject, category, year } = req.body;

    if (!semester || !subject || !category || !year || !req.file) {
      return res.status(400).json({ error: "All fields and a PDF file are required." });
    }

    const papers = rebuildPapersJson();   // auto-save / update papers.json

    res.json({
      success: true,
      message: `✅ "${req.file.filename}" uploaded and indexed successfully!`,
      total: papers.length
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── API: DELETE /api/delete ────────────────────────────────────────────────────
app.delete("/api/delete", (req, res) => {
  try {
    const { filename } = req.body;
    if (!filename) return res.status(400).json({ error: "filename required" });

    // Security: only allow filenames inside papers/
    const safeFilename = path.basename(filename);
    const filePath = path.join(PAPERS_DIR, safeFilename);

    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: "File not found." });
    }

    fs.unlinkSync(filePath);
    const papers = rebuildPapersJson();

    res.json({ success: true, message: `🗑️ Deleted "${safeFilename}"`, total: papers.length });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Start server ───────────────────────────────────────────────────────────────
app.listen(PORT, () => {
  // Initial scan on startup
  rebuildPapersJson();
  console.log(`\n🚀  CampusBytes server running at http://localhost:${PORT}`);
  console.log(`📂  Papers folder : ${PAPERS_DIR}`);
  console.log(`📄  papers.json   : ${JSON_FILE}\n`);
});
