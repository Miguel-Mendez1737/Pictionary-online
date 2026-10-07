'use strict';

// ─── Cuentas de jugador ───────────────────────────────────────────────────────
// Permite registrarse con usuario y contraseña para no volver a crear el
// jugador (nombre y avatar) cada vez que se entra. Dónde se guardan:
//  - Si existe DATABASE_URL: en una base de datos PostgreSQL (p. ej. Neon o
//    Supabase, que tienen plan gratuito). Recomendado al publicar gratis en
//    Render, porque su plan Free borra los archivos cada vez que se duerme.
//  - Si no: en data/users.json (o en la carpeta indicada por DATA_DIR).
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
const DATABASE_URL = process.env.DATABASE_URL || '';
const USER_RE = /^[a-z0-9_.-]{3,20}$/;
const MAX_TOKENS = 5; // sesiones abiertas por cuenta (celular, PC, etc.)

let db = { users: {} };
let pool = null;          // conexión a PostgreSQL (si hay DATABASE_URL)
let available = true;     // false si la base de datos no respondió al arrancar
let storageLabel = 'archivo';

// Configuración de conexión: SSL para servidores en internet (Neon, Supabase…).
function pgConfig(connectionString) {
  const url = new URL(connectionString);
  const local = ['localhost', '127.0.0.1', '::1'].includes(url.hostname);
  ['sslmode', 'channel_binding'].forEach((k) => url.searchParams.delete(k));
  return {
    connectionString: url.toString(),
    ssl: local ? false : { rejectUnauthorized: process.env.DATABASE_SSL_VERIFY !== 'false' },
    max: 3,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 15000
  };
}

async function load() {
  if (DATABASE_URL) {
    const { Pool } = require('pg');
    pool = new Pool(pgConfig(DATABASE_URL));
    // Las bases gratuitas cierran conexiones inactivas: no debe tumbar la app.
    pool.on('error', (err) => console.warn('PostgreSQL (conexión inactiva):', err.message));
    await pool.query(`CREATE TABLE IF NOT EXISTS pictionary_store (
      key TEXT PRIMARY KEY,
      value JSONB NOT NULL,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )`);
    const res = await pool.query("SELECT value FROM pictionary_store WHERE key = 'users'");
    if (res.rows[0] && res.rows[0].value && res.rows[0].value.users) db = res.rows[0].value;
    storageLabel = 'base de datos PostgreSQL';
    return;
  }
  try {
    const parsed = JSON.parse(fs.readFileSync(FILE, 'utf8'));
    if (parsed && parsed.users) db = parsed;
  } catch { /* primer arranque: aún no hay archivo */ }
  storageLabel = `archivo ${FILE}`;
}

// Guardado: en PostgreSQL (una fila con todas las cuentas) o en archivo con
// escritura atómica (archivo temporal + rename) para no corromper datos.
let saveTimer = null;
let writing = Promise.resolve();
function flush() {
  clearTimeout(saveTimer);
  saveTimer = null;
  if (!available) return writing; // nunca sobrescribir con datos vacíos
  const snapshot = JSON.stringify(db);
  if (pool) {
    writing = writing
      .then(() => pool.query(
        `INSERT INTO pictionary_store (key, value, updated_at) VALUES ('users', $1::jsonb, now())
         ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = now()`, [snapshot]))
      .catch((err) => console.error('No se pudieron guardar las cuentas:', err.message));
    return writing;
  }
  fs.mkdirSync(DATA_DIR, { recursive: true });
  const tmp = `${FILE}.tmp`;
  fs.writeFileSync(tmp, snapshot);
  fs.renameSync(tmp, FILE);
  return writing;
}
function save() {
  if (!saveTimer) saveTimer = setTimeout(flush, 200);
}
// Al apagar el servidor (Render lo hace al dormirse o actualizar) se guarda lo pendiente.
let closing = false;
['SIGINT', 'SIGTERM'].forEach((sig) => process.on(sig, async () => {
  if (closing) return;
  closing = true;
  try {
    if (saveTimer) flush();
    await Promise.race([writing, new Promise((r) => setTimeout(r, 5000))]);
    if (pool) await pool.end();
  } finally {
    process.exit(0);
  }
}));

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

// Devuelve una promesa que se cumple cuando las cuentas están cargadas.
module.exports = function mountAccounts(app, { cleanName, cleanAvatar }) {
  const ready = load()
    .then(() => console.log(`   Cuentas: ${storageLabel} (${Object.keys(db.users).length} usuarios)`))
    .catch((err) => {
      // Si la base de datos falla, el juego sigue funcionando sin cuentas.
      available = false;
      console.error(`⚠️  Cuentas desactivadas: no se pudo conectar a la base de datos (${err.message})`);
    });

  const router = express.Router();
  router.use(express.json({ limit: '10kb' }));
  router.use((_req, res, next) => {
    if (!available) return res.status(503).json({ error: 'Las cuentas no están disponibles en este momento. Puedes jugar como invitado.' });
    next();
  });

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
  return ready;
};
