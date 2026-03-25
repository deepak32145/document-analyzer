const express  = require('express');
const multer   = require('multer');
const cors     = require('cors');
const morgan   = require('morgan');
const path     = require('path');
const fs       = require('fs');
const { analyzeDocument } = require('./analyzer');
const { analyzeLlm }      = require('./llm-analyzer');

const app  = express();
const PORT = 3000;

// ── Keep process alive on unhandled errors ───────────────────
process.on('uncaughtException',  (err) => console.error('[uncaughtException]', err.message));
process.on('unhandledRejection', (err) => console.error('[unhandledRejection]', err));

// ── Middleware ───────────────────────────────────────────────
app.use(morgan('dev'));
app.use(cors());
app.use(express.json());

// ── Uploads folder ───────────────────────────────────────────
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir);

// ── Multer config ────────────────────────────────────────────
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadsDir),
  filename:    (_req, file, cb) => cb(null, `${Date.now()}${path.extname(file.originalname)}`),
});

const upload = multer({
  storage,
  limits: { fileSize: 20 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    file.mimetype === 'application/pdf'
      ? cb(null, true)
      : cb(new Error('Only PDF files are accepted'));
  },
});

// ── POST /api/upload  (business flows — rule-based analysis) ─
app.post('/api/upload', upload.single('document'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file received. Attach a PDF as "document".' });

  const { documentType } = req.body;
  console.log(`[upload]  ${req.file.originalname} | type: ${documentType || 'not-known'} | ${req.file.size} bytes`);

  try {
    const analysis = await analyzeDocument(req.file.path, documentType || 'not-known');
    console.log(`[analyze] done — ${analysis.docType}, ${analysis.wordCount} words, ${analysis.pages} page(s)`);
    return res.status(200).json({
      message:      'File uploaded and analyzed successfully',
      originalName: req.file.originalname,
      storedAs:     req.file.filename,
      documentType: documentType || 'not-known',
      size:         req.file.size,
      analysis: { docType: analysis.docType, pages: analysis.pages, words: analysis.wordCount, html: analysis.html },
    });
  } catch (err) {
    console.error('[analyze error]', err.message);
    return res.status(200).json({
      message:      'File uploaded successfully (analysis unavailable)',
      originalName: req.file.originalname,
      storedAs:     req.file.filename,
      documentType: documentType || 'not-known',
      size:         req.file.size,
      analysis:     null,
    });
  }
});

// ── POST /api/upload-llm  (document intelligence — NLP analysis) ─
app.post('/api/upload-llm', upload.single('document'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file received. Attach a PDF as "document".' });

  const { documentType } = req.body;
  console.log(`[upload-llm] ${req.file.originalname} | type: ${documentType || 'not-known'} | ${req.file.size} bytes`);

  try {
    const result = await analyzeLlm(req.file.path, documentType || 'not-known');
    console.log(`[nlp] done — ${result.wordCount} words, ${result.pages} page(s)`);
    return res.status(200).json({
      message:      'File uploaded and analyzed successfully',
      originalName: req.file.originalname,
      storedAs:     req.file.filename,
      documentType: documentType || 'not-known',
      size:         req.file.size,
      analysis:     { pages: result.pages, words: result.wordCount, html: result.html },
    });
  } catch (err) {
    console.error('[nlp error]', err.message);
    return res.status(500).json({ error: `Analysis failed: ${err.message}` });
  }
});

// ── 404 fallback ─────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({ error: `Route not found: ${req.method} ${req.originalUrl}` });
});

// ── Global error handler ─────────────────────────────────────
app.use((err, _req, res, _next) => {
  console.error('[error]', err.message);
  const status = err.status || (err.code === 'LIMIT_FILE_SIZE' ? 413 : 400);
  res.status(status).json({ error: err.message });
});

// ── Start ────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`\n  Backend running at http://localhost:${PORT}`);
  console.log(`  POST /api/upload      — rule-based analysis (business flows)`);
  console.log(`  POST /api/upload-llm  — NLP analysis (document intelligence)\n`);
});
