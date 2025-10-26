const express = require('express');
const fs = require('fs');
const path = require('path');
const bodyParser = require('body-parser');
const cors = require('cors');
const multer = require('multer');

const app = express();
const DATA_FILE = path.join(__dirname, 'lore.json');
const UPLOADS_DIR = path.join(__dirname, 'uploads');

// ensure uploads dir exists
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR);
}

// multer config for saving files
const storage = multer.diskStorage({
  destination: function(req, file, cb) {
    cb(null, UPLOADS_DIR);
  },
  filename: function(req, file, cb) {
    const timestamp = Date.now();
    const ext = path.extname(file.originalname);
    const base = path
      .basename(file.originalname, ext)
      .replace(/\s+/g, "_")
      .replace(/[^a-zA-Z0-9_\-]/g, "");
    cb(null, base + "_" + timestamp + ext);
  }
});

const upload = multer({
  storage,
  limits: {
    fileSize: 20 * 1024 * 1024 // 20 MB per file
  },
  fileFilter: (req, file, cb) => {
    const okTypes = [
      "image/png",
      "image/jpeg",
      "image/jpg",
      "image/webp",
      "audio/mpeg",
      "audio/mp3",
      "audio/wav",
      "audio/x-wav",
      "audio/m4a",
      "audio/mp4",
      "audio/ogg"
    ];
    if (okTypes.includes(file.mimetype)) cb(null, true);
    else cb(new Error("Unsupported file type"));
  }
});

// middleware
app.use(cors());
app.use(bodyParser.json());

// serve frontend
app.use(express.static(path.join(__dirname, 'public')));

// serve uploaded files so browser can see them
app.use('/uploads', express.static(UPLOADS_DIR));

// helper: read/write lore
function readLore() {
  try {
    const raw = fs.readFileSync(DATA_FILE, 'utf8');
    return JSON.parse(raw || '[]');
  } catch (err) {
    console.error('Error reading lore.json:', err);
    return [];
  }
}
function writeLore(data) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), 'utf8');
}

// ===== LORE ROUTES =====

// GET all lore entries
app.get('/api/lore', (req, res) => {
  const lore = readLore();
  res.json(lore);
});

// POST create new lore entry
app.post('/api/lore', (req, res) => {
  const { title, type, tags, body } = req.body;

  const now = Date.now();
  const newEntry = {
    id: "id-" + now,
    title: (title || "Untitled").trim(),
    type: (type || "").trim(),
    tags: Array.isArray(tags)
      ? tags.map(t => t.trim()).filter(Boolean)
      : [],
    body: (body || "").trim(),
    media: [], // <-- files get listed here
    updatedAt: now
  };

  const lore = readLore();
  lore.push(newEntry);
  writeLore(lore);

  res.status(201).json(newEntry);
});

// PUT update text/meta of lore entry
app.put('/api/lore/:id', (req, res) => {
  const lore = readLore();
  const id = req.params.id;
  const { title, type, tags, body } = req.body;

  const i = lore.findIndex(e => e.id === id);
  if (i === -1) {
    return res.status(404).json({ error: "Not found" });
  }

  const now = Date.now();
  lore[i] = {
    ...lore[i],
    title: (title ?? lore[i].title).trim(),
    type: (type ?? lore[i].type).trim(),
    tags: Array.isArray(tags)
      ? tags.map(t => t.trim()).filter(Boolean)
      : lore[i].tags,
    body: (body ?? lore[i].body).trim(),
    updatedAt: now
  };

  writeLore(lore);
  res.json(lore[i]);
});

// DELETE a lore entry
app.delete('/api/lore/:id', (req, res) => {
  const id = req.params.id;
  let lore = readLore();
  const beforeLen = lore.length;
  lore = lore.filter(e => e.id !== id);

  if (lore.length === beforeLen) {
    return res.status(404).json({ error: "Not found" });
  }

  writeLore(lore);
  res.json({ ok: true });
});

// ===== MEDIA ROUTES =====

// POST /api/upload  -> upload a single file
app.post('/api/upload', upload.single('file'), (req, res) => {
  const file = req.file;
  if (!file) {
    return res.status(400).json({ error: "No file uploaded" });
  }

  let kind = "other";
  if (file.mimetype.startsWith("image/")) kind = "image";
  else if (file.mimetype.startsWith("audio/")) kind = "audio";

  const fileInfo = {
    filename: file.filename,
    url: "/uploads/" + file.filename,
    mimetype: file.mimetype,
    kind
  };

  res.status(201).json(fileInfo);
});

// POST /api/lore/:id/media  -> attach uploaded file info to lore entry
app.post('/api/lore/:id/media', (req, res) => {
  const lore = readLore();
  const id = req.params.id;
  const { filename, url, mimetype, kind } = req.body;

  const i = lore.findIndex(e => e.id === id);
  if (i === -1) {
    return res.status(404).json({ error: "Lore entry not found" });
  }

  if (!lore[i].media) lore[i].media = [];
  lore[i].media.push({
    filename,
    url,
    mimetype,
    kind
  });

  lore[i].updatedAt = Date.now();
  writeLore(lore);
  res.json(lore[i]);
});

// DELETE /api/lore/:id/media/:filename  -> remove media link
app.delete('/api/lore/:id/media/:filename', (req, res) => {
  const lore = readLore();
  const { id, filename } = req.params;

  const i = lore.findIndex(e => e.id === id);
  if (i === -1) {
    return res.status(404).json({ error: "Lore entry not found" });
  }

  const beforeLen = lore[i].media.length;
  lore[i].media = lore[i].media.filter(m => m.filename !== filename);

  if (lore[i].media.length === beforeLen) {
    return res.status(404).json({ error: "Media not found on entry" });
  }

  lore[i].updatedAt = Date.now();
  writeLore(lore);
  res.json(lore[i]);
});

// START SERVER
const PORT = 3000;
app.listen(PORT, () => {
  console.log(`Lore server running on http://localhost:${PORT}`);
  console.log(`Open http://localhost:${PORT} in your browser`);
});
