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
//   GET    /api/friends              -> { friends: [{ username, name, avatar }] }
//   POST   /api/friends { username } -> agrega un amigo (por su usuario)
//   DELETE /api/friends/:username    -> quita un amigo

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const express = require('express');

const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, 'data');
const FILE = path.join(DATA_DIR, 'users.json');
// Limpia la dirección pegada: quita comillas, un "psql '...'" alrededor y
// cualquier espacio o salto de línea que se cuele al copiar desde el celular
// (una dirección de base de datos nunca lleva espacios).
function cleanDatabaseUrl(raw) {
  const text = String(raw || '').replace(/^\s*psql\s+/i, '').replace(/\s+/g, '');
  const match = text.match(/postgres(?:ql)?:\/\/[^'"]+/);
  return match ? match[0] : text;
}
const DATABASE_URL = cleanDatabaseUrl(process.env.DATABASE_URL);

// Versión segura para los Logs: muestra la dirección SIN la contraseña.
function describeDatabaseUrl(url) {
  if (!url) return '(vacía)';
  if (!/^postgres(?:ql)?:\/\//.test(url)) return `(no empieza con postgresql://; empieza con "${url.slice(0, 12)}…")`;
  if (!url.includes('@')) return `${url.replace(/:[^:/@]*$/, ':****')}  ← INCOMPLETA: falta la contraseña, la @ y el servidor`;
  return url.replace(/^(postgres(?:ql)?:\/\/[^:@/]*:)[^@]*@/, '$1****@');
}
const RETRY_BASE_MS = Number(process.env.ACCOUNTS_RETRY_MS) || 10000;
const USER_RE = /^[a-z0-9_.-]{3,20}$/;
const MAX_TOKENS = 5; // sesiones abiertas por cuenta (celular, PC, etc.)
const MAX_FRIENDS = 200;

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
    console.log(`   Base de datos: ${describeDatabaseUrl(DATABASE_URL)}`);
    const { Pool } = require('pg');
    if (pool) { const old = pool; pool = null; old.end().catch(() => {}); }
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
const shutdownHooks = []; // otras cosas que guardar antes de apagar (p. ej. la memoria de palabras)
['SIGINT', 'SIGTERM'].forEach((sig) => process.on(sig, async () => {
  if (closing) return;
  closing = true;
  try {
    for (const fn of shutdownHooks) {
      try { await Promise.race([fn(), new Promise((r) => setTimeout(r, 4000))]); } catch { /* se intenta lo demás */ }
    }
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

// 🔑 Recuperar la contraseña con una pregunta de seguridad (no hay correo).
const QUESTIONS = [
  '¿Cómo se llamaba tu primera mascota?',
  '¿En qué ciudad nació tu mamá?',
  '¿Cuál es el segundo nombre de tu papá?',
  '¿Cómo se llamaba tu primer colegio?',
  '¿Cuál es tu comida favorita?',
  '¿Cómo se llama tu mejor amigo de la infancia?',
  '¿Cuál fue tu primer trabajo?',
  '¿De qué equipo de fútbol eres hincha?'
];
// La respuesta se compara sin mayúsculas, tildes ni espacios de más.
const normAnswer = (a) => String(a ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '')
  .toLowerCase().replace(/[^a-z0-9ñ ]/g, ' ').replace(/\s+/g, ' ').trim();
function makeRecovery(question, answer) {
  const q = Number(question);
  const a = normAnswer(answer);
  if (!Number.isInteger(q) || q < 0 || q >= QUESTIONS.length || a.length < 2 || a.length > 60) return null;
  return { q, ...hashPassword(a) };
}
const checkAnswer = (user, answer) => Boolean(user.recovery) && checkPassword(user.recovery, normAnswer(answer));

// 🛠️ Administradores (variable ADMIN_USERS en Render, separados por coma): pueden
// restablecer la contraseña de un jugador que la olvidó y no tiene pregunta de seguridad.
const ADMINS = new Set(String(process.env.ADMIN_USERS || '').split(',').map((x) => x.trim().toLowerCase()).filter(Boolean));
const isAdmin = (u) => ADMINS.has(u.username);

const publicProfile = (u) => ({
  username: u.username, name: u.name, avatar: u.avatar,
  recoveryQuestion: u.recovery ? QUESTIONS[u.recovery.q] : null,
  ...(isAdmin(u) ? { admin: true } : {})
});

const ERR = {
  username: 'El usuario debe tener de 3 a 20 caracteres: letras, números, punto, guion o guion bajo (sin espacios).',
  password: 'La contraseña debe tener al menos 6 caracteres.',
  taken: 'Ese usuario ya existe. Elige otro.',
  login: 'Usuario o contraseña incorrectos.',
  session: 'Tu sesión expiró. Inicia sesión de nuevo.',
  name: 'Escribe tu nombre.',
  current: 'La contraseña actual no es correcta.',
  recovery: 'Elige una pregunta de seguridad y escribe una respuesta (mínimo 2 letras).',
  noRecovery: 'Esta cuenta no tiene pregunta de seguridad. Pídele al creador de la app que te restablezca la contraseña.',
  answer: 'La respuesta no es correcta.',
  tooMany: 'Demasiados intentos con esta cuenta. Espera una hora e inténtalo de nuevo.'
};
const validPassword = (p) => typeof p === 'string' && p.length >= 6 && p.length <= 100;

// Explica en español por qué falló la conexión (aparece en los Logs de Render).
function explainDbError(err) {
  const code = err && err.code;
  if (code === '28P01') return 'usuario o contraseña incorrectos. Si cambiaste la contraseña en Neon, copia la dirección nueva y pégala en DATABASE_URL';
  if (code === 'ENOTFOUND' || code === 'EAI_AGAIN') return 'no se encontró el servidor. Revisa que la dirección esté completa y bien copiada';
  if (code === '3D000') return 'la base de datos indicada no existe (debe terminar en /neondb)';
  if (err instanceof TypeError || /Invalid URL/i.test(String(err && err.message))) return 'la dirección no tiene un formato válido; debe empezar con postgresql://';
  return 'la base de datos no respondió (puede estar despertando)';
}

// Devuelve una promesa que se cumple tras el primer intento de carga. Si la
// base de datos falla, el juego sigue funcionando sin cuentas y se reintenta
// conectar sola (10 s, 20 s, 40 s… hasta cada 5 min) sin reiniciar la app.
module.exports = function mountAccounts(app, { cleanName, cleanAvatar }) {
  let attempt = 0;
  const tryLoad = () => load()
    .then(() => {
      available = true;
      if (attempt > 0) console.log('✅ Cuentas reactivadas: la base de datos ya responde.');
      console.log(`   Cuentas: ${storageLabel} (${Object.keys(db.users).length} usuarios)`);
    })
    .catch((err) => {
      available = false;
      attempt++;
      const delay = Math.min(300000, RETRY_BASE_MS * 2 ** Math.min(attempt - 1, 5));
      console.error(`⚠️  Cuentas en pausa: ${explainDbError(err)}. [${err.code || ''} ${err.message}] Reintento en ${Math.round(delay / 1000)} s.`);
      setTimeout(tryLoad, delay).unref();
    });
  const ready = tryLoad();

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
    let recovery = null;
    if (b.question !== undefined || b.answer) {
      recovery = makeRecovery(b.question, b.answer);
      if (!recovery) return res.status(400).json({ error: ERR.recovery });
    }
    const name = cleanName(b.name) || username;
    const user = {
      username,
      ...hashPassword(b.password),
      name,
      avatar: cleanAvatar(b.avatar),
      tokens: [],
      createdAt: new Date().toISOString()
    };
    if (recovery) user.recovery = recovery;
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

  // ─── 🔑 ¿Olvidaste tu contraseña? ───
  router.get('/recover/questions', (_req, res) => res.json({ questions: QUESTIONS }));
  router.post('/admin/reset', auth, rateLimit, (req, res) => {
    if (!isAdmin(req.user)) return res.status(403).json({ error: 'Solo el administrador puede hacer esto.' });
    const b = req.body || {};
    const user = db.users[normUser(b.username)];
    if (!user) return res.status(404).json({ error: 'No existe una cuenta con ese usuario.' });
    if (!validPassword(b.newPassword)) return res.status(400).json({ error: ERR.password });
    Object.assign(user, hashPassword(b.newPassword));
    user.tokens = [];
    save();
    res.json({ ok: true, username: user.username });
  });
  router.post('/recover/question', rateLimit, (req, res) => {
    const user = db.users[normUser((req.body || {}).username)];
    if (!user) return res.status(404).json({ error: 'No existe una cuenta con ese usuario.' });
    if (!user.recovery) return res.status(404).json({ error: ERR.noRecovery });
    res.json({ question: QUESTIONS[user.recovery.q] });
  });
  // Máximo 5 respuestas equivocadas por cuenta cada hora.
  const fails = new Map();
  router.post('/recover', rateLimit, (req, res) => {
    const b = req.body || {};
    const username = normUser(b.username);
    const user = db.users[username];
    if (!user) return res.status(404).json({ error: 'No existe una cuenta con ese usuario.' });
    if (!user.recovery) return res.status(404).json({ error: ERR.noRecovery });
    const now = Date.now();
    const f = fails.get(username);
    if (f && now < f.until && f.n >= 5) return res.status(429).json({ error: ERR.tooMany });
    if (!checkAnswer(user, b.answer)) {
      const entry = f && now < f.until ? f : { n: 0, until: now + 3600000 };
      entry.n++;
      fails.set(username, entry);
      return res.status(401).json({ error: ERR.answer });
    }
    if (!validPassword(b.newPassword)) return res.status(400).json({ error: ERR.password });
    fails.delete(username);
    Object.assign(user, hashPassword(b.newPassword));
    user.tokens = []; // cierra las sesiones abiertas en otros celulares
    res.json({ token: issueToken(user), profile: publicProfile(user) });
  });

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

    let recovery = null;
    if (b.question !== undefined || b.answer) {
      recovery = makeRecovery(b.question, b.answer);
      if (!recovery) return res.status(400).json({ error: ERR.recovery });
    }

    // 2) Aplicar
    if (recovery) u.recovery = recovery;
    if (newUsername) {
      const old = u.username;
      delete db.users[old];
      u.username = newUsername;
      db.users[newUsername] = u;
      // Quien lo tenía como amigo lo sigue teniendo con el usuario nuevo.
      for (const other of Object.values(db.users)) {
        if (other.friends) other.friends = other.friends.map((f) => (f === old ? newUsername : f));
      }
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

  // ─── Amigos: con quién se pueden compartir las salas privadas ───
  const friendList = (u) => (u.friends || [])
    .map((f) => db.users[f])
    .filter(Boolean)
    .map(publicProfile);

  router.get('/friends', auth, (req, res) => res.json({ friends: friendList(req.user) }));

  router.post('/friends', auth, rateLimit, (req, res) => {
    const u = req.user;
    const username = normUser((req.body || {}).username).replace(/^@/, '');
    const friend = db.users[username];
    if (!friend) return res.status(404).json({ error: `No existe ningún jugador con el usuario @${username || '…'}. Revisa cómo lo escribió.` });
    if (friend === u) return res.status(400).json({ error: 'Ese es tu propio usuario 😄' });
    u.friends = u.friends || [];
    if (!u.friends.includes(username)) {
      if (u.friends.length >= MAX_FRIENDS) return res.status(400).json({ error: 'Llegaste al máximo de amigos.' });
      u.friends.push(username);
      save();
    }
    res.json({ friends: friendList(u), added: publicProfile(friend) });
  });

  router.delete('/friends/:username', auth, (req, res) => {
    const u = req.user;
    const username = normUser(req.params.username);
    u.friends = (u.friends || []).filter((f) => f !== username);
    save();
    res.json({ friends: friendList(u) });
  });

  router.post('/logout', auth, (req, res) => {
    req.user.tokens = (req.user.tokens || []).filter((t) => t !== sha256(req.token));
    save();
    res.json({ ok: true });
  });

  app.use('/api', router);
  return ready;
};

// ─── Consultas para el servidor de juego (salas privadas) ───
// Identifica al jugador por el token de su sesión (o null si es invitado).
module.exports.userFromToken = (token) => {
  if (!available || typeof token !== 'string' || !/^[a-f0-9]{64}$/.test(token)) return null;
  const u = findByToken(token);
  return u ? { username: u.username, name: u.name } : null;
};
// ¿Puede "username" entrar a las salas privadas de "owner"? (el dueño y sus amigos)
module.exports.canJoinPrivate = (owner, username) => {
  if (!username) return false;
  if (owner === username) return true;
  const o = db.users[owner];
  return Boolean(o && (o.friends || []).includes(username));
};
module.exports.accountsAvailable = () => available;

// ─── Otros datos que deben sobrevivir a un reinicio (misma base de datos o archivo) ───
const extraFile = (key) => path.join(DATA_DIR, `${key.replace(/[^a-z0-9_-]/gi, '')}.json`);
module.exports.loadExtra = async (key) => {
  if (pool) {
    const res = await pool.query('SELECT value FROM pictionary_store WHERE key = $1', [key]);
    return res.rows[0] ? res.rows[0].value : null;
  }
  try { return JSON.parse(fs.readFileSync(extraFile(key), 'utf8')); } catch { return null; }
};
module.exports.saveExtra = async (key, value) => {
  const json = JSON.stringify(value);
  if (pool) {
    await pool.query(
      `INSERT INTO pictionary_store (key, value, updated_at) VALUES ($1, $2::jsonb, now())
       ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = now()`, [key, json]);
    return;
  }
  fs.mkdirSync(DATA_DIR, { recursive: true });
  const file = extraFile(key);
  fs.writeFileSync(`${file}.tmp`, json);
  fs.renameSync(`${file}.tmp`, file);
};
module.exports.onShutdown = (fn) => shutdownHooks.push(fn);

