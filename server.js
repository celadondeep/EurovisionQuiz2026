// Eimas Živila Auto Detailing — backend BE JOKIŲ išorinių paketų (npm install nereikalingas).
// Naudoja tik integruotus Node.js modulius: http, fs, path, crypto, url.
// Duomenys: data/content.json. Nuotraukos: uploads/.

const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { exec } = require('child_process');
const { URL } = require('url');

const PORT = process.env.PORT || 3000;
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'pakeisk-slaptazodi';

// GitHub webhook auto-deploy (palikta suderinama su senu setup'u)
const WEBHOOK_SECRET = process.env.WEBHOOK_SECRET || 'eurovizija2026';
const DEPLOY_DIR = process.env.DEPLOY_DIR || '/var/www/eurovizija';
const DEPLOY_SERVICE = process.env.DEPLOY_SERVICE || 'eurovizija';

const ROOT = __dirname;
const DATA_FILE = path.join(ROOT, 'data', 'content.json');
const UPLOAD_DIR = path.join(ROOT, 'uploads');
const PUBLIC_DIR = path.join(ROOT, 'public');

for (const dir of [path.dirname(DATA_FILE), UPLOAD_DIR, PUBLIC_DIR]) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

// ---------- Pradiniai duomenys ----------
const DEFAULT_DATA = {
  contact: {
    phone: '+37066317114',
    phoneDisplay: '+370 663 17114',
    email: 'eimas.ziv@gmail.com',
    hours: 'Individualiai pagal susitarimą'
  },
  gallery: [],
  reviews: [
    { id: '1', name: 'Tomas', car: 'VW Passat', stars: 5, text: 'Salonas po cheminio valymo atrodo kaip naujas.' },
    { id: '2', name: 'Ieva', car: 'Toyota RAV4', stars: 5, text: 'Labai kruopštus darbas ir malonus bendravimas.' },
    { id: '3', name: 'Mantas', car: 'BMW 530', stars: 5, text: 'Po poliravimo ir keraminės dangos kėbulas atrodo geriau nei perkant.' },
    { id: '4', name: 'Dalius', car: 'BMW 520', stars: 5, text: 'Automobilis atrodo nepriekaištingai — kėbulas blizga, salonas švarus kaip iš salono.' }
  ]
};

function loadData() {
  if (!fs.existsSync(DATA_FILE)) fs.writeFileSync(DATA_FILE, JSON.stringify(DEFAULT_DATA, null, 2));
  try {
    return JSON.parse(fs.readFileSync(DATA_FILE, 'utf-8'));
  } catch {
    return JSON.parse(JSON.stringify(DEFAULT_DATA));
  }
}
function saveData(data) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
}

// ---------- Pagalbinės funkcijos ----------
const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg',
  '.png': 'image/png', '.gif': 'image/gif',
  '.webp': 'image/webp', '.svg': 'image/svg+xml'
};

const EXT_FROM_MIME = {
  'image/jpeg': '.jpg', 'image/png': '.png', 'image/gif': '.gif',
  'image/webp': '.webp', 'image/svg+xml': '.svg'
};

function sendJson(res, status, obj) {
  const body = JSON.stringify(obj);
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Content-Length': Buffer.byteLength(body) });
  res.end(body);
}

function sendFile(res, filePath) {
  fs.readFile(filePath, (err, data) => {
    if (err) { sendJson(res, 404, { error: 'Nerasta' }); return; }
    const ext = path.extname(filePath).toLowerCase();
    res.writeHead(200, { 'Content-Type': MIME[ext] || 'application/octet-stream', 'Content-Length': data.length });
    res.end(data);
  });
}

function collectBody(req, limitBytes) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let size = 0;
    req.on('data', (chunk) => {
      size += chunk.length;
      if (size > limitBytes) { reject(new Error('Failas per didelis')); req.destroy(); return; }
      chunks.push(chunk);
    });
    req.on('end', () => resolve(Buffer.concat(chunks)));
    req.on('error', reject);
  });
}

async function parseJsonBody(req) {
  const buf = await collectBody(req, 2 * 1024 * 1024);
  if (!buf.length) return {};
  try { return JSON.parse(buf.toString('utf-8')); } catch { return {}; }
}

// Paprastas multipart/form-data skaitytuvas (be jokių paketų)
function parseMultipart(buffer, boundary) {
  const boundaryBytes = Buffer.from(`--${boundary}`);
  const parts = [];
  let pos = buffer.indexOf(boundaryBytes);
  if (pos === -1) return parts;
  pos += boundaryBytes.length;
  while (true) {
    if (buffer.slice(pos, pos + 2).toString('utf-8') === '--') break; // pasiektas pabaigos žymeklis
    if (buffer.slice(pos, pos + 2).toString('utf-8') === '\r\n') pos += 2;
    const nextBoundaryPos = buffer.indexOf(boundaryBytes, pos);
    if (nextBoundaryPos === -1) break;
    const partEnd = nextBoundaryPos - 2; // pašalinam \r\n prieš kitą boundary
    const rawPart = buffer.slice(pos, partEnd);
    const headerEndIdx = rawPart.indexOf('\r\n\r\n');
    if (headerEndIdx === -1) { pos = nextBoundaryPos + boundaryBytes.length; continue; }
    const headerStr = rawPart.slice(0, headerEndIdx).toString('utf-8');
    const body = rawPart.slice(headerEndIdx + 4);
    const nameMatch = headerStr.match(/name="([^"]+)"/);
    const filenameMatch = headerStr.match(/filename="([^"]*)"/);
    const ctMatch = headerStr.match(/Content-Type:\s*([^\r\n]+)/i);
    parts.push({
      name: nameMatch ? nameMatch[1] : null,
      filename: filenameMatch ? filenameMatch[1] : null,
      contentType: ctMatch ? ctMatch[1].trim() : null,
      data: body
    });
    pos = nextBoundaryPos + boundaryBytes.length;
  }
  return parts;
}

async function parseMultipartRequest(req, limitBytes) {
  const ct = req.headers['content-type'] || '';
  const boundaryMatch = ct.match(/boundary=(?:"([^"]+)"|([^;]+))/);
  if (!boundaryMatch) throw new Error('Nerastas multipart boundary');
  const boundary = boundaryMatch[1] || boundaryMatch[2];
  const buf = await collectBody(req, limitBytes);
  return parseMultipart(buf, boundary);
}

function isAdmin(req) {
  return req.headers['x-admin-password'] === ADMIN_PASSWORD;
}

function saveUploadedImage(part, prefix) {
  const ext = EXT_FROM_MIME[part.contentType] || path.extname(part.filename || '') || '.jpg';
  const filename = `${prefix}-${crypto.randomBytes(6).toString('hex')}${ext}`;
  fs.writeFileSync(path.join(UPLOAD_DIR, filename), part.data);
  return `/uploads/${filename}`;
}

// ---------- Serveris ----------
const server = http.createServer(async (req, res) => {
  try {
    const u = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
    const pathname = decodeURIComponent(u.pathname);
    const method = req.method;

    // ---- Statiniai failai ----
    if (method === 'GET' && pathname === '/') return sendFile(res, path.join(PUBLIC_DIR, 'index.html'));
    if (method === 'GET' && pathname === '/admin.html') return sendFile(res, path.join(PUBLIC_DIR, 'admin.html'));
    if (method === 'GET' && pathname.startsWith('/uploads/')) {
      const safe = path.normalize(pathname.replace('/uploads/', '')).replace(/^(\.\.[/\\])+/, '');
      return sendFile(res, path.join(UPLOAD_DIR, safe));
    }
    if (method === 'GET' && !pathname.startsWith('/api/')) {
      const safe = path.normalize(pathname).replace(/^(\.\.[/\\])+/, '');
      const candidate = path.join(PUBLIC_DIR, safe);
      if (fs.existsSync(candidate) && fs.statSync(candidate).isFile()) return sendFile(res, candidate);
    }

    // ---- GitHub webhook: automatinis atnaujinimas po push ----
    if (method === 'POST' && pathname === '/webhook') {
      const raw = await collectBody(req, 5 * 1024 * 1024);
      const sig = req.headers['x-hub-signature-256'];
      const hmac = 'sha256=' + crypto.createHmac('sha256', WEBHOOK_SECRET).update(raw).digest('hex');
      const sigBuf = Buffer.from(sig || '');
      const hmacBuf = Buffer.from(hmac);
      const valid = sig && sigBuf.length === hmacBuf.length && crypto.timingSafeEqual(sigBuf, hmacBuf);
      if (!valid) { res.writeHead(403); return res.end('Forbidden'); }
      res.writeHead(200); res.end('OK');
      exec(`cd ${DEPLOY_DIR} && git pull origin main && systemctl restart ${DEPLOY_SERVICE}`, (err, stdout, stderr) => {
        if (err) console.error('Webhook klaida:', err.message, stderr);
        else console.log('Auto-update:', stdout);
      });
      return;
    }

    // ---- API: viešas turinys ----
    if (method === 'GET' && pathname === '/api/content') {
      return sendJson(res, 200, loadData());
    }

    // ---- API: prisijungimas ----
    if (method === 'POST' && pathname === '/api/login') {
      const body = await parseJsonBody(req);
      if (body.password === ADMIN_PASSWORD) return sendJson(res, 200, { ok: true });
      return sendJson(res, 401, { ok: false, error: 'Neteisingas slaptažodis' });
    }

    // ---- API: galerija ----
    if (method === 'POST' && pathname === '/api/gallery') {
      if (!isAdmin(req)) return sendJson(res, 401, { error: 'Neteisingas slaptažodis' });
      const parts = await parseMultipartRequest(req, 15 * 1024 * 1024);
      const beforePart = parts.find(p => p.name === 'before' && p.filename);
      const afterPart = parts.find(p => p.name === 'after' && p.filename);
      const altPart = parts.find(p => p.name === 'alt');
      if (!beforePart || !afterPart) return sendJson(res, 400, { error: 'Reikia abiejų nuotraukų: before ir after' });
      const data = loadData();
      const entry = {
        id: crypto.randomUUID(),
        before: saveUploadedImage(beforePart, 'before'),
        after: saveUploadedImage(afterPart, 'after'),
        alt: (altPart && altPart.data.toString('utf-8')) || 'Automobilis prieš ir po valymo'
      };
      data.gallery.push(entry);
      saveData(data);
      return sendJson(res, 200, entry);
    }

    let m = pathname.match(/^\/api\/gallery\/([^/]+)$/);
    if (method === 'DELETE' && m) {
      if (!isAdmin(req)) return sendJson(res, 401, { error: 'Neteisingas slaptažodis' });
      const data = loadData();
      const entry = data.gallery.find(g => g.id === m[1]);
      data.gallery = data.gallery.filter(g => g.id !== m[1]);
      saveData(data);
      if (entry) {
        [entry.before, entry.after].forEach(u2 => {
          const p2 = path.join(UPLOAD_DIR, path.basename(u2));
          if (fs.existsSync(p2)) fs.unlinkSync(p2);
        });
      }
      return sendJson(res, 200, { ok: true });
    }

    // ---- API: atsiliepimai ----
    if (method === 'POST' && pathname === '/api/reviews') {
      if (!isAdmin(req)) return sendJson(res, 401, { error: 'Neteisingas slaptažodis' });
      const body = await parseJsonBody(req);
      if (!body.name || !body.text) return sendJson(res, 400, { error: 'Trūksta vardo arba teksto' });
      const data = loadData();
      const entry = { id: crypto.randomUUID(), name: body.name, car: body.car || '', text: body.text, stars: Number(body.stars) || 5 };
      data.reviews.push(entry);
      saveData(data);
      return sendJson(res, 200, entry);
    }

    m = pathname.match(/^\/api\/reviews\/([^/]+)$/);
    if (method === 'PUT' && m) {
      if (!isAdmin(req)) return sendJson(res, 401, { error: 'Neteisingas slaptažodis' });
      const body = await parseJsonBody(req);
      const data = loadData();
      const idx = data.reviews.findIndex(r => r.id === m[1]);
      if (idx === -1) return sendJson(res, 404, { error: 'Nerasta' });
      data.reviews[idx] = {
        ...data.reviews[idx],
        ...(body.name !== undefined ? { name: body.name } : {}),
        ...(body.car !== undefined ? { car: body.car } : {}),
        ...(body.text !== undefined ? { text: body.text } : {}),
        ...(body.stars !== undefined ? { stars: Number(body.stars) } : {})
      };
      saveData(data);
      return sendJson(res, 200, data.reviews[idx]);
    }
    if (method === 'DELETE' && m) {
      if (!isAdmin(req)) return sendJson(res, 401, { error: 'Neteisingas slaptažodis' });
      const data = loadData();
      data.reviews = data.reviews.filter(r => r.id !== m[1]);
      saveData(data);
      return sendJson(res, 200, { ok: true });
    }

    // ---- API: kontaktai ----
    if (method === 'PUT' && pathname === '/api/contact') {
      if (!isAdmin(req)) return sendJson(res, 401, { error: 'Neteisingas slaptažodis' });
      const body = await parseJsonBody(req);
      const data = loadData();
      data.contact = {
        phone: body.phone ?? data.contact.phone,
        phoneDisplay: body.phoneDisplay ?? data.contact.phoneDisplay,
        email: body.email ?? data.contact.email,
        hours: body.hours ?? data.contact.hours
      };
      saveData(data);
      return sendJson(res, 200, data.contact);
    }

    sendJson(res, 404, { error: 'Nerasta' });
  } catch (err) {
    sendJson(res, 500, { error: err.message || 'Serverio klaida' });
  }
});

server.listen(PORT, () => {
  console.log(`Eimas Živila backend veikia: http://localhost:${PORT}`);
  console.log(`Admin panelė: http://localhost:${PORT}/admin.html`);
});
