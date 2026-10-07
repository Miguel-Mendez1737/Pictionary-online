'use strict';

// ─── Cuentas de jugador ───────────────────────────────────────────────────────
// Permite registrarse con usuario y contraseña para no volver a crear el
// jugador (nombre y avatar) cada vez que se entra. Los datos se guardan en
// data/users.json (o en la carpeta indicada por DATA_DIR).
//  - Contraseñas: nunca se guardan en texto; se usa scrypt con "sal" aleatoria.
//  - Sesiones: token aleatorio; en el archivo solo se guarda su huella SHA-256.
//
// API (JSON):
//   POST /api/register  { username, password, name, avatar } -> { token, profile }
//   POST /api/login     { username, password }               -> { token, profile }
//   GET  /api/me        (Authorization: Bearer <token>)      -> { profile }
//   PUT  /api/me        { name?, avatar?, username?, currentPassword?, newPassword? }
//   POST /api/logout

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const express = require('express');

const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, 'data');
const FILE = path.join(DATA_DIR, 'users.json');
const USER_RE = /^[a-z0-9_.-]{3,20}$/;
const MAX_TOKENS = 5; // sesiones abiertas por cuenta (celular, PC, etc.)

let db = { users: {} };

function load() {
  try {
    const parsed = JSON.parse(fs.readFileSync(FILE, 'utf8'));
    if (parsed && parsed.users) db = parsed;
  } catch { /* primer arranque: aún no hay archivo */ }
}

// Escritura atómica (archivo temporal + rename) para no corromper datos.
let saveTimer = null;
function flush() {
  clearTimeout(saveTimer);
  saveTimer = null;
  fs.mkdirSync(DATA_DIR, { recursive: true });
  const tmp = `${FILE}.tmp`;
  fs.writeFileSync(tmp, JSON.stringify(db, null, 1));
  fs.renameSync(tmp, FILE);
}
function save() {
  if (!saveTimer) saveTimer = setTimeout(flush, 200);
}
process.on('exit', () => { if (saveTimer) flush(); });
['SIGINT', 'SIGTERM'].forEach((sig) => process.on(sig, () => { if (saveTimer) flush(); process.exit(0); }));

const sha256 = (t) => crypto.createHash('sha256').update(t).digest('hex');
const normUser = (u) => String(u ?? '').trim().toLowerCase();

function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.scryptSync(password, salt, 64).toString('hex');
  return { salt, hash };
}

function checkPassword(user, password) {
  const candidate = crypto.scryptSync(String(password), user.salt, 64);
  const stored = Buffer.from(user.hash, 'hex');
  return stored.length === candidate.length && crypto.timingSafeEqual(stored, candidate);
}

function issueToken(user) {
  const token = crypto.randomBytes(32).toString('hex');
  user.tokens = [sha256(token), ...(user.tokens || [])].slice(0, MAX_TOKENS);
  save();
  return token;
}

function findByToken(token) {
  if (!token) return null;
  const h = sha256(token);
  return Object.values(db.users).find((u) => (u.tokens || []).includes(h)) || null;
}

const publicProfile = (u) => ({ username: u.username, name: u.name, avatar: u.avatar });

const ERR = {
  username: 'El usuario debe tener de 3 a 20 caracteres: letras, números, punto, guion o guion bajo (sin espacios).',
  password: 'La contraseña debe tener al menos 6 caracteres.',
  taken: 'Ese usuario ya existe. Elige otro.',
  login: 'Usuario o contraseña incorrectos.',
  session: 'Tu sesión expiró. Inicia sesión de nuevo.',
  name: 'Escribe tu nombre.',
  current: 'La contraseña actual no es correcta.'
};
const validPassword = (p) => typeof p === 'string' && p.length >= 6 && p.length <= 100;

module.exports = function mountAccounts(app, { cleanName, cleanAvatar }) {
  load();
  const router = express.Router();
  router.use(express.json({ limit: '10kb' }));

  // Límite simple de intentos por IP (evita adivinar contraseñas a la fuerza).
  const hits = new Map();
  const rateLimit = (req, res, next) => {
    const now = Date.now();
    const entry = hits.get(req.ip) || { n: 0, reset: now + 60000 };
    if (now > entry.reset) { entry.n = 0; entry.reset = now + 60000; }
    entry.n++;
    hits.set(req.ip, entry);
    if (entry.n > 20) return res.status(429).json({ error: 'Demasiados intentos. Espera un minuto.' });
    next();
  };
  setInterval(() => { const now = Date.now(); for (const [ip, e] of hits) if (now > e.reset) hits.delete(ip); }, 60000).unref();

  const auth = (req, res, next) => {
    const m = /^Bearer ([a-f0-9]{64})$/.exec(req.get('authorization') || '');
    const user = m && findByToken(m[1]);
    if (!user) return res.status(401).json({ error: ERR.session });
    req.user = user;
    req.token = m[1];
    next();
  };

  router.post('/register', rateLimit, (req, res) => {
    const b = req.body || {};
    const username = normUser(b.username);
    if (!USER_RE.test(username)) return res.status(400).json({ error: ERR.username });
    if (!validPassword(b.password)) return res.status(400).json({ error: ERR.password });
    if (db.users[username]) return res.status(409).json({ error: ERR.taken });
    const name = cleanName(b.name) || username;
    const user = {
      username,
      ...hashPassword(b.password),
      name,
      avatar: cleanAvatar(b.avatar),
      tokens: [],
      createdAt: new Date().toISOString()
    };
    db.users[username] = user;
    res.json({ token: issueToken(user), profile: publicProfile(user) });
  });

  router.post('/login', rateLimit, (req, res) => {
    const b = req.body || {};
    const user = db.users[normUser(b.username)];
    if (!user || typeof b.password !== 'string' || !checkPassword(user, b.password)) {
      return res.status(401).json({ error: ERR.login });
    }
    res.json({ token: issueToken(user), profile: publicProfile(user) });
  });

  router.get('/me', auth, (req, res) => res.json({ profile: publicProfile(req.user) }));

  // Todo el perfil es editable: nombre, avatar, usuario y contraseña.
  router.put('/me', auth, rateLimit, (req, res) => {
    const u = req.user;
    const b = req.body || {};

    // 1) Validar todo antes de cambiar nada
    let newUsername = null;
    if (b.username !== undefined && normUser(b.username) !== u.username) {
      newUsername = normUser(b.username);
      if (!USER_RE.test(newUsername)) return res.status(400).json({ error: ERR.username });
      if (db.users[newUsername]) return res.status(409).json({ error: ERR.taken });
    }
    let name = null;
    if (b.name !== undefined) {
      name = cleanName(b.name);
      if (!name) return res.status(400).json({ error: ERR.name });
    }
    if (b.newPassword) {
      if (!validPassword(b.newPassword)) return res.status(400).json({ error: ERR.password });
      if (typeof b.currentPassword !== 'string' || !checkPassword(u, b.currentPassword)) {
        return res.status(400).json({ error: ERR.current });
      }
    }

    // 2) Aplicar
    if (newUsername) {
      delete db.users[u.username];
      u.username = newUsername;
      db.users[newUsername] = u;
    }
    if (name) u.name = name;
    if (b.avatar !== undefined) u.avatar = cleanAvatar(b.avatar);
    if (b.newPassword) {
      Object.assign(u, hashPassword(b.newPassword));
      u.tokens = [sha256(req.token)]; // cierra las demás sesiones
    }
    save();
    res.json({ profile: publicProfile(u) });
  });

  router.post('/logout', auth, (req, res) => {
    req.user.tokens = (req.user.tokens || []).filter((t) => t !== sha256(req.token));
    save();
    res.json({ ok: true });
  });

  app.use('/api', router);
};
