const express = require('express');
const multer  = require('multer');
const cors    = require('cors');
const morgan  = require('morgan');
const path    = require('path');
const fs      = require('fs');

const app  = express();
const PORT = 3000;

// ── Keep process alive on unhandled errors ───────────────
process.on('uncaughtException',      (err) => console.error('[uncaughtException]', err.message));
process.on('unhandledRejection',     (err) => console.error('[unhandledRejection]', err));

// ── Middleware ───────────────────────────────────────────
app.use(morgan('dev'));
app.use(cors());          // open for dev — allows any origin
app.use(express.json());

// ── Uploads folder ──────────────────────────────────────
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir);

// ── Multer config ───────────────────────────────────────
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadsDir),
  filename:    (req, file, cb) => {
    const timestamp = Date.now();
    const ext       = path.extname(file.originalname);
    cb(null, `${timestamp}${ext}`);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 20 * 1024 * 1024 }, // 20 MB
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'application/pdf') {
      cb(null, true);
    } else {
      cb(new Error('Only PDF files are accepted'));
    }
  }
});

// ── POST /api/upload ─────────────────────────────────────
app.post('/api/upload', upload.single('document'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No file received. Attach a PDF as "document".' });
  }

  const { documentType } = req.body;
  console.log(`[upload OK] ${req.file.originalname} | type: ${documentType || 'not-known'} | ${req.file.size} bytes`);

  return res.status(200).json({
    message:      'File uploaded successfully',
    originalName: req.file.originalname,
    storedAs:     req.file.filename,
    documentType: documentType || 'not-known',
    size:         req.file.size,
  });
});

// ── 404 fallback ─────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({ error: `Route not found: ${req.method} ${req.originalUrl}` });
});

// ── Global error handler (catches multer + all other errors) ─
app.use((err, req, res, next) => {
  console.error('[error]', err.message);
  const status = err.status || (err.code === 'LIMIT_FILE_SIZE' ? 413 : 400);
  res.status(status).json({ error: err.message });
});

// ── Start ────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`\n  Backend running at http://localhost:${PORT}`);
  console.log(`  POST /api/upload  — accepts PDF (field: "document")\n`);
});
