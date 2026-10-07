'use strict';

// ─── ❓ Trivia ───────────────────────────────────────────────────────────────
// Preguntas de opción múltiple (4 opciones) de varias categorías, incluidas
// banderas (con imagen) y películas contadas con emojis. Todos responden a la
// vez; la pregunta termina cuando todos respondieron o se acaba el tiempo.
// Puntos: respuesta correcta 10 · la más rápida de las correctas +5.

const SPEED = Number(process.env.GAME_SPEED) > 0 ? Number(process.env.GAME_SPEED) : 1;
const { CATEGORIES, QUESTIONS, COUNTRIES, EMOJI_MOVIES } = require('./trivia-data');

const CATEGORY_IDS = new Set(CATEGORIES.map((c) => c.id));
const COUNT_OPTIONS = [10, 15, 20, 30];
const TIME_OPTIONS = [10, 15, 20, 30];
const MIN_CATS = 1;

const READY_MS = 3000 / SPEED;      // "¡Prepárate!" antes de la primera pregunta
const ALL_IN_MS = 700 / SPEED;      // pausa cuando ya respondieron todos
const REVEAL_MS = 5000 / SPEED;     // se muestra la respuesta correcta

const POINTS_OK = 10;
const POINTS_FASTEST = 5;

const shuffle = (list) => {
  const a = [...list];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};
const pick = (list, n) => shuffle(list).slice(0, n);

// Arma una pregunta lista para jugar: { cat, text, image?, emoji?, options: [{ text?, image? }], correct }
function buildQuestion(source) {
  if (source.kind === 'text') {
    const [text, right, ...wrong] = source.q;
    const options = shuffle([right, ...wrong]);
    return { cat: source.cat, text, options: options.map((t) => ({ text: t })), correct: options.indexOf(right) };
  }
  if (source.kind === 'flag') {
    const [code, name, region] = source.country;
    const same = COUNTRIES.filter((c) => c[2] === region && c[0] !== code);
    const others = pick(same.length >= 3 ? same : COUNTRIES.filter((c) => c[0] !== code), 3);
    const options = shuffle([source.country, ...others]);
    const correct = options.findIndex((c) => c[0] === code);
    // La mitad de las veces se muestra la bandera; la otra mitad, el nombre con 4 banderas.
    if (source.reverse) {
      return { cat: 'banderas', text: `¿Cuál es la bandera de ${name}?`, options: options.map((c) => ({ image: `flags/${c[0]}.png` })), correct };
    }
    return { cat: 'banderas', text: '¿De qué país es esta bandera?', image: `flags/${code}.png`, options: options.map((c) => ({ text: c[1] })), correct };
  }
  // Película con emojis
  const [emoji, title] = source.movie;
  const others = pick(EMOJI_MOVIES.filter((m) => m[1] !== title), 3).map((m) => m[1]);
  const options = shuffle([title, ...others]);
  return { cat: 'emojis', text: '¿Qué película es?', emoji, options: options.map((t) => ({ text: t })), correct: options.indexOf(title) };
}

// Elige las preguntas de la partida repartidas entre las categorías elegidas.
function makeQuiz(cats, count) {
  const pools = cats.map((cat) => {
    if (cat === 'banderas') return shuffle(COUNTRIES).map((country, i) => ({ kind: 'flag', country, reverse: i % 2 === 1 }));
    if (cat === 'emojis') return shuffle(EMOJI_MOVIES).map((movie) => ({ kind: 'emoji', movie }));
    return shuffle(QUESTIONS[cat] || []).map((q) => ({ kind: 'text', cat, q }));
  }).filter((p) => p.length);
  const chosen = [];
  // Una de cada categoría por turnos, para que salgan temas variados.
  let order = shuffle(pools);
  while (chosen.length < count && order.some((p) => p.length)) {
    for (const pool of order) {
      if (chosen.length >= count) break;
      if (pool.length) chosen.push(pool.shift());
    }
    order = shuffle(order);
  }
  return shuffle(chosen).map(buildQuestion);
}

module.exports = function createTrivia(h) {
  const { io, syncRoom, systemMsg, connectedPlayers, endGame } = h;

  const defaults = () => ({ triviaCats: CATEGORIES.map((c) => c.id), triviaCount: 15, triviaTime: 20 });

  function applySettings(room, s) {
    if (Array.isArray(s.triviaCats)) {
      const cats = [...new Set(s.triviaCats.filter((id) => CATEGORY_IDS.has(id)))];
      if (cats.length >= MIN_CATS) room.settings.triviaCats = cats;
    }
    if (COUNT_OPTIONS.includes(Number(s.triviaCount))) room.settings.triviaCount = Number(s.triviaCount);
    if (TIME_OPTIONS.includes(Number(s.triviaTime))) room.settings.triviaTime = Number(s.triviaTime);
  }

  const schedule = (room, ms, fn) => {
    clearTimeout(room.gameTimer);
    room.gameTimer = setTimeout(fn, ms);
  };

  function start(room) {
    room.phase = 'trivia';
    room.trivia = {
      questions: makeQuiz(room.settings.triviaCats, room.settings.triviaCount),
      index: -1,
      sub: 'ready',          // ready | question | reveal
      answers: new Map(),    // playerId -> { choice, ms }
      startedAt: 0,
      deadline: Date.now() + READY_MS,
      result: null
    };
    systemMsg(room, `❓ ¡Comienza la Trivia! ${room.trivia.questions.length} preguntas.`, 'success');
    syncRoom(room);
    schedule(room, READY_MS, () => nextQuestion(room));
  }

  function nextQuestion(room) {
    const t = room.trivia;
    if (!t || room.phase !== 'trivia') return;
    if (connectedPlayers(room).length < 2) return h.backToLobby(room, 'Se necesitan al menos 2 jugadores conectados para continuar.');
    t.index++;
    if (t.index >= t.questions.length) {
      room.resultTitle = '❓ ¡Fin de la Trivia!';
      return endGame(room);
    }
    t.sub = 'question';
    t.answers = new Map();
    t.result = null;
    t.startedAt = Date.now();
    t.deadline = t.startedAt + room.settings.triviaTime * 1000;
    syncRoom(room);
    schedule(room, room.settings.triviaTime * 1000, () => reveal(room));
  }

  function reveal(room) {
    const t = room.trivia;
    if (!t || t.sub !== 'question') return;
    const q = t.questions[t.index];
    const right = [...t.answers.entries()]
      .filter(([, a]) => a.choice === q.correct)
      .sort((a, z) => a[1].ms - z[1].ms);
    const gains = right.map(([id, a], i) => {
      const p = room.players.get(id);
      const points = POINTS_OK + (i === 0 ? POINTS_FASTEST : 0);
      if (p) p.score += points;
      return p && { id, name: p.name, avatar: p.avatar, points, ms: a.ms, fastest: i === 0 };
    }).filter(Boolean);
    const counts = q.options.map((_o, i) => [...t.answers.values()].filter((a) => a.choice === i).length);
    t.result = { correct: q.correct, counts, gains };
    t.sub = 'reveal';
    t.deadline = Date.now() + REVEAL_MS;
    if (gains[0]) {
      io.to(room.code).emit('trivia:fastest', { id: gains[0].id, name: gains[0].name, avatar: gains[0].avatar, ms: gains[0].ms });
    }
    syncRoom(room);
    schedule(room, REVEAL_MS, () => nextQuestion(room));
  }

  function onAnswer(room, player, choice) {
    const t = room.trivia;
    if (!t || t.sub !== 'question' || t.answers.has(player.id)) return;
    const q = t.questions[t.index];
    const c = Number(choice);
    if (!Number.isInteger(c) || c < 0 || c >= q.options.length) return;
    t.answers.set(player.id, { choice: c, ms: Date.now() - t.startedAt });
    checkAll(room);
  }

  // Si ya respondieron todos los conectados, no se espera al reloj.
  function checkAll(room) {
    const t = room.trivia;
    if (!t || t.sub !== 'question') return;
    const waiting = connectedPlayers(room).filter((p) => !t.answers.has(p.id));
    syncRoom(room);
    if (waiting.length === 0) schedule(room, ALL_IN_MS, () => reveal(room));
  }

  function view(room, playerId) {
    const t = room.trivia;
    if (!t) return null;
    const q = t.questions[t.index];
    const mine = t.answers.get(playerId);
    const base = {
      sub: t.sub,
      index: t.index,
      total: t.questions.length,
      time: room.settings.triviaTime,
      timeLeft: Math.max(0, t.deadline - Date.now()),
      answered: [...t.answers.keys()],
      myChoice: mine ? mine.choice : null
    };
    if (q && t.sub !== 'ready') {
      // La respuesta correcta solo viaja al revelarla.
      base.question = { cat: q.cat, text: q.text, image: q.image || null, emoji: q.emoji || null, options: q.options };
    }
    // Imágenes de la siguiente pregunta, para que el celular las descargue antes.
    const next = t.questions[t.index + 1];
    if (next) base.preload = [next.image, ...next.options.map((o) => o.image)].filter(Boolean);
    if (t.sub === 'reveal') {
      base.result = t.result;
      base.choices = Object.fromEntries([...t.answers.entries()].map(([id, a]) => [id, a.choice]));
    }
    return base;
  }

  return {
    CATEGORIES, COUNT_OPTIONS, TIME_OPTIONS,
    defaults, applySettings, ready: (room) => room.settings.triviaCats.length >= MIN_CATS,
    start, view, onAnswer, checkAll
  };
};
