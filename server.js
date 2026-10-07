'use strict';

const fs = require('fs');
const path = require('path');
const http = require('http');
const https = require('https');
const express = require('express');
const { Server } = require('socket.io');
const THEMES = require('./words');
const mountAccounts = require('./accounts');
const PKG = require('./package.json');

// Nombre, autor y versión de la app (la versión sale de package.json).
const APP_INFO = { name: 'Adivina el Garabato', author: PKG.author || 'Miguel Mendez', version: PKG.version };

// ─── Configuración ────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 3000;
const MIN_PLAYERS = 2;
const MAX_PLAYERS = 12;
// Avatar personalizable: cantidad de opciones de cada rasgo (debe coincidir con public/app.js).
const AVATAR_LIMITS = { skin: 6, hair: 8, hairColor: 8, eyes: 6, eyeColor: 6, lips: 6, beard: 6, bg: 8, shirt: 4, shirtColor: 10, stripeColor: 10, glasses: 5, glassesColor: 10, lens: 7 };

// Puntaje: 10 puntos por adivinar la palabra del turno. Los puntos se acumulan
// mientras el jugador siga conectado (aunque se jueguen varias partidas) y
// vuelven a 0 si se desconecta.
const POINTS_GUESS = 10;         // solo para el primero que adivina
// Solo ganan puntos quienes adivinan: el dibujante no suma puntos.
const POINTS_DRAWER = 0;
const REVEAL_MS = 5000;          // pausa para mostrar la palabra al terminar un turno
const WHEEL_SIZE = 8;            // palabras en la ruleta
const WHEEL_AUTO_SPIN_MS = 10000; // si el dibujante no gira, la ruleta gira sola
const WHEEL_SPIN_MS = 4500;      // duración de la animación del giro
const WHEEL_PAUSE_MS = 1800;     // pausa para leer la palabra antes de dibujar
const RECONNECT_GRACE_MS = 45000; // tiempo para volver tras bloquear el celular o cambiar de red
// Con datos móviles la señal se corta a ratos. Un corte breve no cuenta como
// "desconectarse": si el jugador vuelve antes de SCORE_RESET_MS conserva sus
// puntos; si tarda más, sus puntos vuelven a 0.
const SCORE_RESET_MS = 20000;
const DRAWER_WAIT_MS = 15000;    // espera al dibujante antes de cerrar su turno
const DEFAULT_ROOM = 'PUBLICA';
const MAX_SEGMENTS = 40000;      // historial de trazos guardado para quien entra tarde
const ROUND_OPTIONS = [1, 2, 3, 4, 5];
const TURN_SECONDS = 90;         // tiempo por defecto para adivinar cada dibujo (1:30)
// Tiempos que el anfitrión puede elegir en el lobby (en segundos).
const TIME_OPTIONS = [30, 45, 60, 90, 120, 150, 180];

// Servidores ICE para el chat de voz (WebRTC). STUN basta en la mayoría de
// redes; para redes estrictas se puede añadir un TURN con la variable
// ICE_SERVERS='[{"urls":"turn:mi-servidor:3478","username":"u","credential":"p"}]'
// Si ICE_SERVERS está vacío, es "[]" o no es válido, se usan los STUN públicos.
const DEFAULT_ICE = [{ urls: ['stun:stun.l.google.com:19302', 'stun:stun1.l.google.com:19302'] }];
const ICE_SERVERS = (() => {
  try {
    const list = JSON.parse(process.env.ICE_SERVERS || '[]');
    if (Array.isArray(list) && list.length) return list;
  } catch { /* valor inválido */ }
  return DEFAULT_ICE;
})();

// El micrófono solo funciona en contextos seguros (https o localhost). Si se
// definen SSL_KEY y SSL_CERT el servidor arranca en HTTPS.
const USE_HTTPS = Boolean(process.env.SSL_KEY && process.env.SSL_CERT);

const app = express();
const server = USE_HTTPS
  ? https.createServer({ key: fs.readFileSync(process.env.SSL_KEY), cert: fs.readFileSync(process.env.SSL_CERT) }, app)
  : http.createServer(app);
const io = new Server(server, {
  maxHttpBufferSize: 1e5,
  pingInterval: 20000, // latidos cada 20 s; con datos móviles se tolera
  pingTimeout: 25000   // hasta 25 s sin respuesta antes de dar por caída la conexión
});

/** @type {Map<string, object>} */
const rooms = new Map();

app.set('trust proxy', 1); // IP real detrás de Render/Railway (para el límite de intentos)

app.get('/app-info.js', (_req, res) => {
  res.type('application/javascript').set('Cache-Control', 'no-cache');
  res.send(`window.APP_INFO = ${JSON.stringify(APP_INFO)};`);
});

app.use(express.static(path.join(__dirname, 'public'), {
  setHeaders: (res, file) => {
    // El service worker y la página siempre se revalidan para recibir actualizaciones.
    if (file.endsWith('sw.js') || file.endsWith('.html')) res.setHeader('Cache-Control', 'no-cache');
  }
}));
app.get('/health', (_req, res) => res.json({ ok: true, rooms: rooms.size }));

const THEME_LIST = Object.entries(THEMES).map(([id, t]) => ({
  id, label: t.label, emoji: t.emoji, count: t.words.length, colors: t.colors || null
}));

// ─── Utilidades ───────────────────────────────────────────────────────────────
const clamp = (n, min, max) => Math.min(max, Math.max(min, n));

const clean = (value, max) => String(value ?? '')
  .replace(/[\u0000-\u001f\u007f]/g, '')
  .replace(/\s+/g, ' ')
  .trim()
  .slice(0, max);

// Comparación tolerante: ignora mayúsculas, acentos, signos y espacios extra.
const normalize = (s) => String(s)
  .toLowerCase()
  .normalize('NFD')
  .replace(/[̀-ͯ]/g, '')
  .replace(/[^a-z0-9 ]/g, '')
  .replace(/\s+/g, ' ')
  .trim();

function levenshtein(a, b) {
  if (Math.abs(a.length - b.length) > 2) return 99;
  const row = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    let prev = row[0];
    row[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const tmp = row[j];
      row[j] = Math.min(row[j] + 1, row[j - 1] + 1, prev + (a[i - 1] === b[j - 1] ? 0 : 1));
      prev = tmp;
    }
  }
  return row[b.length];
}

const isLetter = (ch) => /[\p{L}\p{N}]/u.test(ch);

// Valida el avatar que envía el navegador: solo números dentro de rango.
function cleanAvatar(a) {
  const out = { g: a && a.g === 'm' ? 'm' : 'h' };
  for (const [key, count] of Object.entries(AVATAR_LIMITS)) {
    const v = parseInt(a && a[key], 10);
    out[key] = Number.isInteger(v) ? clamp(v, 0, count - 1) : 0;
  }
  if (out.g === 'm') out.beard = 0;
  return out;
}
const cleanName = (v) => clean(v, 16);

const accountsReady = mountAccounts(app, { cleanName, cleanAvatar });

// ─── Juegos disponibles ───────────────────────────────────────────────────────
// El anfitrión elige en el lobby a qué se juega. Cada juego nuevo vive en su
// propio archivo dentro de games/ y usa las mismas salas, cuentas, voz y puntos.
const gameHelpers = {
  io,
  syncRoom: (room) => syncRoom(room),
  systemMsg: (room, text, kind) => systemMsg(room, text, kind),
  emitTo: (room, id, event, data) => emitTo(room, id, event, data),
  connectedPlayers: (room) => connectedPlayers(room),
  endGame: (room) => endGame(room),
  backToLobby: (room, msg) => backToLobby(room, msg),
  normalize: (v) => normalize(v),
  clean: (v, max) => clean(v, max)
};
const basta = require('./games/basta')(gameHelpers);
const parchis = require('./games/parchis')(gameHelpers);
const GAMES = [
  { id: 'garabato', label: 'Adivina el Garabato', short: 'Garabato', emoji: '🎨', colors: null },
  { id: 'basta', label: 'Basta', short: 'Basta', emoji: '✋', colors: ['#e8590c', '#d6336c'] },
  { id: 'parchis', label: 'Parchís', short: 'Parchís', emoji: '🎲', colors: ['#2f9e44', '#1971c2'] }
];
const GAME_IDS = new Set(GAMES.map((g) => g.id));
const IN_GAME = ['spinning', 'drawing', 'reveal', 'basta', 'parchis'];

// ─── Salas ────────────────────────────────────────────────────────────────────
// Cada jugador se identifica con una clave estable que genera su navegador
// (no con el id del socket). Así, si el celular se bloquea o cambia de red,
// al reconectarse recupera su lugar, su puntaje y su turno.
function createRoom(code) {
  const room = {
    code,
    players: new Map(),         // playerId -> { id, socketId, connected, name, avatar, score, guessed, voice, muted }
    order: [],                  // orden de turnos (orden de llegada)
    hostId: null,
    phase: 'lobby',             // lobby | spinning | drawing | reveal | gameOver
    settings: { game: 'garabato', theme: null, rounds: 3, drawTime: TURN_SECONDS, muteDrawer: true, ...basta.defaults() },
    round: 0,
    drawnThisRound: new Set(),
    drawerId: null,
    word: null,
    revealed: new Set(),
    timeLeft: 0,
    turnGains: new Map(),
    usedWords: new Set(),
    segments: [],
    lastTurn: null,
    turnId: 0,
    wheel: null,                // { items, target, spin: { turns, jitter, startedAt } | null, autoAt }
    timer: null,
    revealTimeout: null,
    wheelTimeout: null,
    gameTimer: null,            // temporizador de Basta y Parchís
    basta: null,
    parchis: null,
    resultTitle: null
  };
  rooms.set(code, room);
  return room;
}

// Código para salas privadas: 6 caracteres sin letras confusas (0/O, 1/I/L).
function newPrivateCode() {
  const chars = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
  let code;
  do {
    code = Array.from({ length: 6 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
  } while (rooms.has(code));
  return code;
}

function clearTimers(room) {
  clearInterval(room.timer);
  clearTimeout(room.revealTimeout);
  clearTimeout(room.wheelTimeout);
  clearTimeout(room.gameTimer);
  room.gameTimer = null;
  room.timer = null;
  room.revealTimeout = null;
  room.wheelTimeout = null;
}

const connectedPlayers = (room) => [...room.players.values()].filter((p) => p.connected);

function emitTo(room, playerId, event, data) {
  const p = room.players.get(playerId);
  if (p && p.socketId) io.to(p.socketId).emit(event, data);
}

function maskWord(room) {
  return [...room.word].map((ch, i) => {
    if (ch === ' ') return ' ';
    if (room.revealed.has(i) || !isLetter(ch)) return ch;
    return '_';
  });
}

function publicPlayers(room) {
  return room.order
    .map((id) => room.players.get(id))
    .filter(Boolean)
    .map(({ id, name, avatar, score, guessed, voice, muted, connected }) => ({ id, name, avatar, score, guessed, voice, muted, connected }));
}

function ranking(room) {
  return publicPlayers(room).sort((a, b) => b.score - a.score);
}

// Cada jugador recibe su propia "vista" del estado: el dibujante (y quien ya
// adivinó) ve la palabra; el resto solo ve guiones y pistas.
function snapshotFor(room, playerId) {
  const me = room.players.get(playerId);
  const canSeeWord = room.word && room.phase !== 'spinning' && (
    room.phase === 'reveal' ||
    playerId === room.drawerId ||
    (me && me.guessed)
  );
  return {
    code: room.code,
    phase: room.phase,
    hostId: room.hostId,
    drawerId: room.drawerId,
    settings: room.settings,
    round: room.round,
    timeLeft: room.timeLeft,
    players: publicPlayers(room),
    word: canSeeWord ? room.word : null,
    mask: room.word && room.phase !== 'spinning' ? maskWord(room) : null,
    wheel: room.phase === 'spinning' ? wheelFor(room, playerId) : null,
    lastTurn: room.phase === 'reveal' ? room.lastTurn : null,
    privacy: room.privacy || null,
    ranking: room.phase === 'gameOver' ? ranking(room) : null,
    resultTitle: room.phase === 'gameOver' ? room.resultTitle : null,
    basta: room.phase === 'basta' ? basta.view(room, playerId) : null,
    parchis: room.phase === 'parchis' ? parchis.view(room) : null
  };
}

// Vista de la ruleta: el dibujante ve las palabras; los demás solo ven "?".
// El servidor decide dónde cae (target, vueltas y desfase), así todos ven
// exactamente el mismo giro.
function wheelFor(room, playerId) {
  const w = room.wheel;
  const now = Date.now();
  return {
    id: room.turnId,
    count: w.items.length,
    items: playerId === room.drawerId ? w.items : null,
    autoIn: w.spin ? 0 : Math.max(0, w.autoAt - now),
    spin: w.spin && {
      target: w.target,
      turns: w.spin.turns,
      jitter: w.spin.jitter,
      duration: WHEEL_SPIN_MS,
      elapsed: now - w.spin.startedAt
    }
  };
}

function shuffle(list) {
  const a = [...list];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function syncRoom(room) {
  for (const p of room.players.values()) {
    if (p.socketId) io.to(p.socketId).emit('room:state', snapshotFor(room, p.id));
  }
}

function systemMsg(room, text, kind = 'info') {
  io.to(room.code).emit('chat:system', { text, kind });
}

// ─── Lógica de juego ──────────────────────────────────────────────────────────
function pickWord(room) {
  const list = THEMES[room.settings.theme].words;
  let available = list.filter((w) => !room.usedWords.has(w));
  if (available.length === 0) {
    room.usedWords.clear();
    available = list;
  }
  const word = available[Math.floor(Math.random() * available.length)];
  room.usedWords.add(word);
  return word;
}

function revealHint(room) {
  const hidden = [...room.word]
    .map((ch, i) => (isLetter(ch) && !room.revealed.has(i) ? i : -1))
    .filter((i) => i >= 0);
  if (hidden.length <= 2) return; // nunca regalar la palabra completa
  room.revealed.add(hidden[Math.floor(Math.random() * hidden.length)]);
}

function startGame(room) {
  clearTimers(room);
  for (const p of room.players.values()) p.guessed = false; // los puntos se acumulan entre partidas
  room.resultTitle = null;
  if (room.settings.game === 'basta') return basta.start(room);
  if (room.settings.game === 'parchis') return parchis.start(room);
  room.round = 1;
  room.drawnThisRound.clear();
  room.usedWords.clear();
  systemMsg(room, `🚀 ¡Comienza la partida! Tema: ${THEMES[room.settings.theme].label}.`, 'success');
  nextTurn(room);
}

function nextTurn(room) {
  clearTimers(room);
  if (rooms.get(room.code) !== room) return; // la sala ya no existe
  if (connectedPlayers(room).length < MIN_PLAYERS) {
    return backToLobby(room, 'Se necesitan al menos 2 jugadores conectados para continuar.');
  }

  // Siguiente jugador conectado que aún no ha dibujado en esta ronda.
  const isConnected = (id) => room.players.get(id)?.connected;
  let drawerId = room.order.find((id) => !room.drawnThisRound.has(id) && isConnected(id));
  if (!drawerId) {
    if (room.round >= room.settings.rounds) return endGame(room);
    room.round++;
    room.drawnThisRound.clear();
    drawerId = room.order.find(isConnected);
  }

  room.drawnThisRound.add(drawerId);
  room.drawerId = drawerId;
  room.word = pickWord(room);
  room.revealed = new Set();
  room.segments = [];
  room.turnGains = new Map();
  room.timeLeft = room.settings.drawTime;
  room.lastTurn = null;
  room.turnId++;
  for (const p of room.players.values()) p.guessed = false;

  // 🎡 Ruleta: la palabra secreta + otras del mismo tema, en orden aleatorio.
  // Se prefieren palabras que aún no han salido en la partida.
  const pool = THEMES[room.settings.theme].words.filter((w) => w !== room.word);
  const fresh = shuffle(pool.filter((w) => !room.usedWords.has(w)));
  const seen = shuffle(pool.filter((w) => room.usedWords.has(w)));
  const others = [...fresh, ...seen].slice(0, WHEEL_SIZE - 1);
  const items = shuffle([room.word, ...others]);
  room.wheel = { items, target: items.indexOf(room.word), spin: null, autoAt: Date.now() + WHEEL_AUTO_SPIN_MS };
  room.phase = 'spinning';

  io.to(room.code).emit('canvas:clear');
  systemMsg(room, `🎡 ${room.players.get(drawerId).name} gira la ruleta (ronda ${room.round}/${room.settings.rounds}).`);
  syncRoom(room);
  room.wheelTimeout = setTimeout(() => spinWheel(room), WHEEL_AUTO_SPIN_MS);
}

function spinWheel(room) {
  if (room.phase !== 'spinning' || room.wheel.spin) return;
  clearTimeout(room.wheelTimeout);
  room.wheel.spin = {
    turns: 5 + Math.floor(Math.random() * 3),
    jitter: Math.round((Math.random() - 0.5) * 60) / 100, // desfase dentro de la casilla (±30 %)
    startedAt: Date.now()
  };
  syncRoom(room);
  room.wheelTimeout = setTimeout(() => startDrawing(room), WHEEL_SPIN_MS + WHEEL_PAUSE_MS);
}

function startDrawing(room) {
  if (room.phase !== 'spinning') return;
  clearTimers(room);
  room.phase = 'drawing';
  room.wheel = null;
  systemMsg(room, `✏️ ${room.players.get(room.drawerId)?.name || 'El dibujante'} está dibujando.`);
  syncRoom(room);
  room.timer = setInterval(() => tick(room), 1000);
}

function tick(room) {
  if (room.phase !== 'drawing') return;
  room.timeLeft--;
  io.to(room.code).emit('timer', room.timeLeft);

  // Pistas automáticas a la mitad y al 25 % del tiempo restante.
  const total = room.settings.drawTime;
  if (room.timeLeft === Math.floor(total * 0.5) || room.timeLeft === Math.floor(total * 0.25)) {
    revealHint(room);
    syncRoom(room);
  }
  if (room.timeLeft <= 0) endTurn(room, 'time');
}

function addGain(room, id, points) {
  const p = room.players.get(id);
  if (!p) return;
  p.score += points;
  room.turnGains.set(id, (room.turnGains.get(id) || 0) + points);
}

function endTurn(room, reason) {
  if (room.phase !== 'drawing') return;
  clearTimers(room);
  room.phase = 'reveal';

  const gains = [...room.turnGains.entries()]
    .map(([id, points]) => {
      const p = room.players.get(id);
      return p && { id, name: p.name, avatar: p.avatar, points };
    })
    .filter(Boolean)
    .sort((a, b) => b.points - a.points);

  room.lastTurn = { word: room.word, reason, gains };
  const reasons = {
    time: '⏰ ¡Se acabó el tiempo!',
    first: `🏁 ¡${gains[0] ? gains[0].name : 'Alguien'} adivinó primero!`,
    all: '🎉 ¡Todos adivinaron!',
    drawerLeft: '📴 El dibujante perdió la conexión.'
  };
  systemMsg(room, `${reasons[reason]} La palabra era «${room.word}».`, 'info');
  syncRoom(room);
  room.revealTimeout = setTimeout(() => nextTurn(room), REVEAL_MS);
}

function endGame(room) {
  clearTimers(room);
  room.phase = 'gameOver';
  room.drawerId = null;
  room.word = null;
  room.wheel = null;
  const top = ranking(room)[0];
  if (top && room.settings.game !== 'parchis') systemMsg(room, `🏆 ¡${top.name} gana la partida con ${top.score} puntos!`, 'success');
  syncRoom(room);
}

function backToLobby(room, message) {
  clearTimers(room);
  room.phase = 'lobby';
  room.round = 0;
  room.drawerId = null;
  room.word = null;
  room.lastTurn = null;
  room.wheel = null;
  room.segments = [];
  room.basta = null;
  room.parchis = null;
  room.resultTitle = null;
  for (const p of room.players.values()) p.guessed = false;
  io.to(room.code).emit('canvas:clear');
  if (message) systemMsg(room, message, 'warn');
  syncRoom(room);
}

function checkAllGuessed(room) {
  if (room.phase !== 'drawing') return;
  const guessers = connectedPlayers(room).filter((p) => p.id !== room.drawerId);
  if (guessers.length > 0 && guessers.every((p) => p.guessed)) endTurn(room, 'all');
}

function handleGuess(room, player, text) {
  // Se ignoran también los espacios: "cepillodedientes" cuenta como acierto.
  const guess = normalize(text).replace(/ /g, '');
  const target = normalize(room.word).replace(/ /g, '');

  if (guess === target) {
    player.guessed = true;
    const points = POINTS_GUESS;
    addGain(room, player.id, points);
    if (POINTS_DRAWER) addGain(room, room.drawerId, POINTS_DRAWER);

    // El mensaje con la respuesta NO se muestra: se anuncia a todos quién
    // acertó y cuántos puntos ganó (la app también lo dice en voz alta).
    // Solo gana el primero: el turno termina en ese momento y el reloj va a 0.
    systemMsg(room, `🎉 ${player.name} adivinó primero y ganó ${points} puntos.`, 'success');
    io.to(room.code).emit('guess:announce', { id: player.id, name: player.name, avatar: player.avatar, points });
    emitTo(room, player.id, 'guess:correct', { word: room.word, points });
    room.timeLeft = 0;
    io.to(room.code).emit('timer', 0);
    endTurn(room, 'first');
    return;
  }

  io.to(room.code).emit('chat:message', {
    id: player.id, name: player.name, avatar: player.avatar, text
  });
  if (target.length > 3 && levenshtein(guess, target) === 1) {
    emitTo(room, player.id, 'chat:system', { text: `🔥 «${text}» está muy cerca…`, kind: 'warn' });
  }
}

// Si el anfitrión se desconecta, el control pasa al primer jugador conectado.
function ensureHost(room) {
  const host = room.players.get(room.hostId);
  if (host && host.connected) return;
  const next = room.order.map((id) => room.players.get(id)).find((p) => p && p.connected);
  if (next && next.id !== room.hostId) {
    room.hostId = next.id;
    systemMsg(room, `👑 ${next.name} ahora es el anfitrión.`);
  } else if (!host) {
    room.hostId = room.order[0] || null;
  }
}

function removePlayer(room, playerId) {
  const player = room.players.get(playerId);
  if (!player || player.connected) return;
  room.players.delete(playerId);
  room.order = room.order.filter((id) => id !== playerId);
  room.drawnThisRound.delete(playerId);
  if (room.phase === 'parchis') parchis.onLeave(room, playerId);

  if (room.players.size === 0) {
    clearTimers(room);
    rooms.delete(room.code);
    return;
  }
  systemMsg(room, `👋 ${player.name} salió de la sala.`, 'leave');
  ensureHost(room);

  const inGame = IN_GAME.includes(room.phase);
  if (inGame && room.players.size < MIN_PLAYERS) {
    return backToLobby(room, 'Quedan menos de 2 jugadores: volvemos al lobby.');
  }
  syncRoom(room);
  checkAllGuessed(room);
  if (room.phase === 'basta') basta.checkReady(room);
}

// ─── Socket.io ────────────────────────────────────────────────────────────────
io.on('connection', (socket) => {
  const getCtx = () => {
    const room = rooms.get(socket.data.room);
    const player = room && room.players.get(socket.data.pid);
    // Un socket viejo (reemplazado por una reconexión) ya no controla al jugador.
    if (!player || player.socketId !== socket.id) return {};
    return { room, player };
  };
  const isHost = (room, player) => room && player && room.hostId === player.id;

  socket.on('player:join', (payload, ack) => {
    const reply = typeof ack === 'function' ? ack : () => {};
    if (getCtx().player) return reply({ error: 'Ya estás en una sala.' });

    const name = clean(payload?.name, 16);
    if (!name) return reply({ error: 'Escribe tu nombre para continuar.' });
    const avatar = cleanAvatar(payload?.avatar);
    const key = typeof payload?.key === 'string' && /^[A-Za-z0-9_-]{8,64}$/.test(payload.key) ? payload.key : socket.id;
    const account = mountAccounts.userFromToken(payload?.token); // null = invitado

    let code;
    let room;
    if (payload?.createPrivate) {
      // 🔒 Sala privada: código aleatorio y solo pueden entrar el dueño y sus amigos.
      if (!mountAccounts.accountsAvailable()) return reply({ error: 'Las salas privadas no están disponibles en este momento.' });
      if (!account) return reply({ error: '🔒 Para crear una sala privada necesitas iniciar sesión con tu cuenta.' });
      code = newPrivateCode();
      room = createRoom(code);
      room.privacy = { owner: account.username, ownerName: account.name };
    } else {
      code = clean(payload?.room, 10).toUpperCase().replace(/[^A-Z0-9]/g, '') || DEFAULT_ROOM;
      room = rooms.get(code) || createRoom(code);
    }
    let player = room.players.get(key);

    // Control de acceso a salas privadas (quien ya estaba dentro puede reconectarse).
    if (room.privacy && !player) {
      const owner = room.privacy.owner;
      if (!account) {
        return reply({ error: `🔒 Esta sala es privada: solo pueden entrar los amigos de @${owner}. Inicia sesión con tu cuenta para entrar.`, privateRoom: true });
      }
      if (!mountAccounts.canJoinPrivate(owner, account.username)) {
        return reply({ error: `🔒 Esta sala es privada: solo pueden entrar los amigos de @${owner}. Pídele que te agregue como amigo (tu usuario es @${account.username}).`, privateRoom: true });
      }
    }

    if (player) {
      // ── Reconexión: recupera el mismo jugador ──
      clearTimeout(player.leaveTimer);
      clearTimeout(player.dropTimer);
      clearTimeout(player.drawerTimer);
      if (player.socketId && player.socketId !== socket.id) {
        const old = io.sockets.sockets.get(player.socketId);
        if (old) {
          old.data.room = null;
          old.leave(code);
          old.emit('session:replaced');
          old.disconnect(true);
        }
      }
      const wasConnected = player.connected;
      Object.assign(player, { socketId: socket.id, connected: true, name, avatar });
      if (!wasConnected) systemMsg(room, `🔌 ${name} volvió a la partida.`, 'join');
    } else {
      if (room.players.size >= MAX_PLAYERS) return reply({ error: 'La sala está llena (máx. 12).' });
      player = { id: key, socketId: socket.id, connected: true, name, avatar, score: 0, guessed: false, voice: false, muted: false, leaveTimer: null, username: account ? account.username : null };
      room.players.set(key, player);
      room.order.push(key);
      systemMsg(room, `👋 ${name} se unió a la sala.`, 'join');
    }

    socket.data.room = code;
    socket.data.pid = key;
    socket.join(code);
    ensureHost(room);

    reply({
      ok: true, id: key, room: code, themes: THEME_LIST, roundOptions: ROUND_OPTIONS, turnSeconds: TURN_SECONDS, timeOptions: TIME_OPTIONS,
      games: GAMES,
      basta: { categories: basta.CATEGORIES, roundOptions: basta.ROUND_OPTIONS, timeOptions: basta.TIME_OPTIONS, minCats: basta.MIN_CATS, maxCats: basta.MAX_CATS },
      parchis: { maxSeats: parchis.MAX_SEATS, colors: parchis.COLORS }
    });
    if (room.phase === 'drawing') socket.emit('canvas:history', room.segments);
    syncRoom(room);
  });

  // Editar nombre y avatar en cualquier momento (lobby o partida).
  socket.on('player:update', (payload) => {
    const { room, player } = getCtx();
    if (!player) return;
    const name = cleanName(payload?.name);
    if (name && name !== player.name) {
      systemMsg(room, `✏️ ${player.name} ahora se llama ${name}.`);
      player.name = name;
    }
    if (payload && payload.avatar) player.avatar = cleanAvatar(payload.avatar);
    syncRoom(room);
  });

  socket.on('lobby:settings', (s) => {
    const { room, player } = getCtx();
    if (!isHost(room, player) || room.phase !== 'lobby' || !s) return;
    if (typeof s.game === 'string' && GAME_IDS.has(s.game)) room.settings.game = s.game;
    basta.applySettings(room, s);
    if (typeof s.theme === 'string' && THEMES[s.theme]) room.settings.theme = s.theme;
    if (s && ROUND_OPTIONS.includes(Number(s.rounds))) room.settings.rounds = Number(s.rounds);
    if (s && TIME_OPTIONS.includes(Number(s.drawTime))) room.settings.drawTime = Number(s.drawTime);
    if (s && typeof s.muteDrawer === 'boolean') room.settings.muteDrawer = s.muteDrawer;
    syncRoom(room);
  });

  socket.on('game:start', () => {
    const { room, player } = getCtx();
    if (!isHost(room, player) || room.phase !== 'lobby') return;
    if (room.settings.game === 'garabato' && !room.settings.theme) return socket.emit('chat:system', { text: 'Elige un tema antes de empezar.', kind: 'warn' });
    if (room.settings.game === 'basta' && !basta.ready(room)) return socket.emit('chat:system', { text: `Elige al menos ${basta.MIN_CATS} categorías.`, kind: 'warn' });
    if (connectedPlayers(room).length < MIN_PLAYERS) return socket.emit('chat:system', { text: 'Se necesitan al menos 2 jugadores.', kind: 'warn' });
    startGame(room);
  });

  socket.on('game:lobby', () => {
    const { room, player } = getCtx();
    if (isHost(room, player) && room.phase === 'gameOver') backToLobby(room);
  });

  socket.on('chat:send', (raw) => {
    const { room, player } = getCtx();
    if (!player) return;
    const text = clean(raw, 100);
    if (!text) return;

    if (room.phase === 'spinning' && player.id === room.drawerId) {
      return socket.emit('chat:system', { text: 'Estás por dibujar: no puedes escribir en el chat.', kind: 'warn' });
    }
    if (room.phase === 'drawing') {
      if (player.id === room.drawerId) {
        return socket.emit('chat:system', { text: 'Estás dibujando: no puedes escribir en el chat.', kind: 'warn' });
      }
      if (player.guessed) {
        // Quien ya acertó solo habla con el dibujante y con otros que acertaron.
        const msg = { id: player.id, name: player.name, avatar: player.avatar, text, private: true };
        for (const p of room.players.values()) {
          if (p.guessed || p.id === room.drawerId) emitTo(room, p.id, 'chat:message', msg);
        }
        return;
      }
      return handleGuess(room, player, text);
    }

    io.to(room.code).emit('chat:message', { id: player.id, name: player.name, avatar: player.avatar, text });
  });

  // ─── ✋ Basta ───
  socket.on('basta:answers', (list) => {
    const { room, player } = getCtx();
    if (player && room.phase === 'basta') basta.onAnswers(room, player, list);
  });
  socket.on('basta:stop', (list) => {
    const { room, player } = getCtx();
    if (player && room.phase === 'basta') basta.onStop(room, player, list);
  });
  socket.on('basta:vote', (data) => {
    const { room, player } = getCtx();
    if (player && room.phase === 'basta') basta.onVote(room, player, data);
  });
  socket.on('basta:ready', () => {
    const { room, player } = getCtx();
    if (player && room.phase === 'basta') basta.onReady(room, player);
  });

  // ─── 🎲 Parchís ───
  socket.on('parchis:roll', () => {
    const { room, player } = getCtx();
    if (player && room.phase === 'parchis') parchis.onRoll(room, player);
  });
  socket.on('parchis:move', (piece) => {
    const { room, player } = getCtx();
    if (player && room.phase === 'parchis') parchis.onMove(room, player, piece);
  });

  socket.on('wheel:spin', () => {
    const { room, player } = getCtx();
    if (player && room.phase === 'spinning' && room.drawerId === player.id) spinWheel(room);
  });

  socket.on('draw:segment', (s) => {
    const { room, player } = getCtx();
    if (!player || room.phase !== 'drawing' || room.drawerId !== player.id || !s) return;
    const coords = [s.x0, s.y0, s.x1, s.y1].map(Number);
    if (coords.some((n) => !Number.isFinite(n))) return;
    const [x0, y0, x1, y1] = coords.map((n) => clamp(n, 0, 1));
    const seg = { x0, y0, x1, y1, w: clamp(Number(s.w) || 6, 1, 40), e: Boolean(s.e) };
    if (room.segments.length < MAX_SEGMENTS) room.segments.push(seg);
    socket.to(room.code).emit('draw:segment', seg);
  });

  socket.on('draw:clear', () => {
    const { room, player } = getCtx();
    if (!player || room.phase !== 'drawing' || room.drawerId !== player.id) return;
    room.segments = [];
    io.to(room.code).emit('canvas:clear');
  });

  // ─── Chat de voz: el servidor solo hace de "señalización" para WebRTC ───
  socket.on('voice:join', (_payload, ack) => {
    const { room, player } = getCtx();
    if (!player || typeof ack !== 'function') return;
    const peers = connectedPlayers(room).filter((p) => p.voice && p.id !== player.id).map((p) => p.id);
    player.voice = true;
    player.muted = false;
    ack({ peers, iceServers: ICE_SERVERS }); // el recién llegado llama a los que ya están
    systemMsg(room, `🎙️ ${player.name} se unió al audio.`, 'join');
    syncRoom(room);
  });

  socket.on('voice:signal', (msg) => {
    const { room, player } = getCtx();
    if (!player || !player.voice || !msg || typeof msg.to !== 'string') return;
    const target = room.players.get(msg.to);
    if (!target || !target.voice || !target.socketId) return;
    io.to(target.socketId).emit('voice:signal', { from: player.id, data: msg.data });
  });

  socket.on('voice:mute', (muted) => {
    const { room, player } = getCtx();
    if (!player || !player.voice || player.muted === Boolean(muted)) return;
    player.muted = Boolean(muted);
    syncRoom(room);
  });

  socket.on('voice:leave', () => {
    const { room, player } = getCtx();
    if (!player || !player.voice) return;
    player.voice = false;
    player.muted = false;
    io.to(room.code).emit('voice:peer-left', { id: player.id });
    syncRoom(room);
  });

  // Desconexión: el jugador queda "en pausa" y tiene RECONNECT_GRACE_MS para volver.
  socket.on('disconnect', () => {
    const { room, player } = getCtx();
    if (!player) return;

    player.connected = false;
    player.socketId = null;
    if (player.voice) {
      player.voice = false;
      player.muted = false;
      io.to(room.code).emit('voice:peer-left', { id: player.id });
    }
    player.leaveTimer = setTimeout(() => removePlayer(room, player.id), RECONNECT_GRACE_MS);

    // Si no vuelve pronto: pierde sus puntos y, si era anfitrión, cede el control.
    player.dropTimer = setTimeout(() => {
      if (player.connected || !room.players.has(player.id)) return;
      player.score = 0;
      systemMsg(room, `📴 ${player.name} no volvió a tiempo: sus puntos vuelven a 0.`, 'leave');
      ensureHost(room);
      syncRoom(room);
    }, SCORE_RESET_MS);

    // Si era el dibujante, se le espera un momento antes de cerrar su turno.
    if (room.drawerId === player.id && (room.phase === 'drawing' || room.phase === 'spinning')) {
      player.drawerTimer = setTimeout(() => {
        if (player.connected || room.drawerId !== player.id) return;
        if (room.phase === 'drawing') endTurn(room, 'drawerLeft');
        else if (room.phase === 'spinning') {
          systemMsg(room, '⏭️ Se salta el turno: el dibujante perdió la conexión.', 'warn');
          nextTurn(room);
        }
      }, DRAWER_WAIT_MS);
    }

    if (room.phase === 'parchis') parchis.onDisconnect(room, player.id);
    if (connectedPlayers(room).length === 0) return; // nadie a quien avisar
    systemMsg(room, `📶 ${player.name} perdió la conexión… tiene ${SCORE_RESET_MS / 1000} s para volver sin perder sus puntos.`, 'leave');
    syncRoom(room);
    checkAllGuessed(room);
    if (room.phase === 'basta') basta.checkReady(room);
  });
});

// Arranca cuando las cuentas están cargadas (desde archivo o base de datos).
accountsReady.then(() => server.listen(PORT, () => {
  console.log(`🎨 ${APP_INFO.name} v${APP_INFO.version} · by ${APP_INFO.author}`);
  console.log(`   Listo en ${USE_HTTPS ? 'https' : 'http'}://localhost:${PORT}`);
}));
