'use strict';

// Solo para pruebas automáticas: GAME_SPEED=10 hace las pausas 10 veces más cortas.
const SPEED = Number(process.env.GAME_SPEED) > 0 ? Number(process.env.GAME_SPEED) : 1;

// ─── ✋ Basta / Stop ──────────────────────────────────────────────────────────
// Sale una letra al azar y cada jugador llena las categorías con palabras que
// empiecen con esa letra. El primero que llena todo grita "¡Basta!" y, tras
// una cuenta de 3 segundos, se cierran las respuestas. Luego todos revisan las
// respuestas y pueden votar las que no valen. Puntos por categoría:
//   20 si fue el único con respuesta válida · 10 si nadie más la repitió · 5 si se repitió.

const CATEGORIES = [
  { id: 'nombre', label: 'Nombre', emoji: '🙋' },
  { id: 'apellido', label: 'Apellido', emoji: '👪' },
  { id: 'pais', label: 'País o ciudad', emoji: '🌎' },
  { id: 'animal', label: 'Animal', emoji: '🐾' },
  { id: 'fruta', label: 'Fruta o verdura', emoji: '🍎' },
  { id: 'color', label: 'Color', emoji: '🎨' },
  { id: 'cosa', label: 'Cosa', emoji: '📦' },
  { id: 'comida', label: 'Comida', emoji: '🍔' },
  { id: 'marca', label: 'Marca', emoji: '🏷️' },
  { id: 'profesion', label: 'Profesión u oficio', emoji: '👷' },
  { id: 'pelicula', label: 'Película o serie', emoji: '🎬' },
  { id: 'artista', label: 'Artista o cantante', emoji: '🎤' },
  { id: 'deporte', label: 'Deporte', emoji: '⚽' },
  { id: 'planta', label: 'Flor o planta', emoji: '🌸' }
];
const CATEGORY_IDS = new Set(CATEGORIES.map((c) => c.id));
const DEFAULT_CATS = ['nombre', 'apellido', 'pais', 'animal', 'fruta', 'color', 'cosa'];
const MIN_CATS = 3;
const MAX_CATS = 8;
const ROUND_OPTIONS = [3, 5, 7, 10];
const TIME_OPTIONS = [60, 90, 120, 180];
// Letras con suficientes palabras en español (sin K, Ñ, Q, W, X, Y, Z).
const LETTERS = 'ABCDEFGHIJLMNOPRSTUV'.split('');

const LETTER_MS = 3200 / SPEED;    // animación de la letra
const STOP_MS = 3000 / SPEED;      // cuenta regresiva después de "¡Basta!"
const COLLECT_MS = 1500 / SPEED;   // espera las últimas respuestas de cada celular
const REVIEW_MS = 60000 / SPEED;   // tiempo máximo para revisar y votar
const RESULTS_MS = 6000 / SPEED;   // pausa para ver los puntos de la ronda
const MAX_ANSWER = 30;

const WORDS = require('./basta-words');
setTimeout(() => WORDS.preload(), 0);

const POINTS_ONLY = 20;
const POINTS_UNIQUE = 10;
const POINTS_REPEATED = 5;

module.exports = function createBasta(h) {
  const { io, syncRoom, systemMsg, connectedPlayers, normalize, clean, endGame } = h;

  const defaults = () => ({ bastaCats: [...DEFAULT_CATS], bastaRounds: 5, bastaTime: 120, bastaStrict: true });

  function applySettings(room, s) {
    if (Array.isArray(s.bastaCats)) {
      const cats = [...new Set(s.bastaCats.filter((id) => CATEGORY_IDS.has(id)))];
      if (cats.length >= MIN_CATS && cats.length <= MAX_CATS) room.settings.bastaCats = cats;
    }
    if (ROUND_OPTIONS.includes(Number(s.bastaRounds))) room.settings.bastaRounds = Number(s.bastaRounds);
    if (TIME_OPTIONS.includes(Number(s.bastaTime))) room.settings.bastaTime = Number(s.bastaTime);
    if (typeof s.bastaStrict === 'boolean') room.settings.bastaStrict = s.bastaStrict;
  }

  const ready = (room) => room.settings.bastaCats.length >= MIN_CATS;

  function schedule(room, ms, fn) {
    clearTimeout(room.gameTimer);
    room.gameTimer = setTimeout(fn, ms);
  }

  function start(room) {
    room.phase = 'basta';
    room.basta = {
      round: 0,
      rounds: room.settings.bastaRounds,
      cats: room.settings.bastaCats.map((id) => CATEGORIES.find((c) => c.id === id)),
      used: new Set(),
      sub: 'letter',
      letter: null,
      answers: new Map(),   // playerId -> [texto por categoría]
      rejects: new Map(),   // "playerId|categoría" -> Map(votante -> 'up' | 'down')
      ready: new Set(),
      stopper: null,
      deadline: 0,
      results: null
    };
    systemMsg(room, `✋ ¡Comienza Basta! ${room.basta.rounds} rondas, ${room.basta.cats.length} categorías.`, 'success');
    nextRound(room);
  }

  function nextRound(room) {
    const b = room.basta;
    if (!b || room.phase !== 'basta') return;
    if (connectedPlayers(room).length < 2) return h.backToLobby(room, 'Se necesitan al menos 2 jugadores conectados para continuar.');
    if (b.round >= b.rounds) {
      room.resultTitle = '✋ ¡Fin de Basta!';
      return endGame(room);
    }
    let pool = LETTERS.filter((l) => !b.used.has(l));
    if (!pool.length) { b.used.clear(); pool = LETTERS; }
    b.letter = pool[Math.floor(Math.random() * pool.length)];
    b.used.add(b.letter);
    b.round++;
    b.sub = 'letter';
    b.answers = new Map();
    b.rejects = new Map();
    b.ready = new Set();
    b.stopper = null;
    b.results = null;
    b.finalTable = null;
    b.deadline = Date.now() + LETTER_MS;
    syncRoom(room);
    schedule(room, LETTER_MS, () => startWriting(room));
  }

  function startWriting(room) {
    const b = room.basta;
    if (!b || b.sub !== 'letter') return;
    b.sub = 'writing';
    b.deadline = Date.now() + room.settings.bastaTime * 1000;
    systemMsg(room, `🔤 Ronda ${b.round}: ¡la letra es ${b.letter}!`);
    syncRoom(room);
    schedule(room, room.settings.bastaTime * 1000, () => stop(room, null));
  }

  function stop(room, player) {
    const b = room.basta;
    if (!b || b.sub !== 'writing') return;
    b.sub = 'stopping';
    b.stopper = player ? { id: player.id, name: player.name } : null;
    b.deadline = Date.now() + STOP_MS;
    if (player) {
      systemMsg(room, `✋ ¡${player.name} dijo BASTA!`, 'success');
      io.to(room.code).emit('basta:called', { id: player.id, name: player.name, avatar: player.avatar });
    } else {
      systemMsg(room, '⏰ ¡Se acabó el tiempo!', 'warn');
    }
    syncRoom(room);
    schedule(room, STOP_MS, () => collect(room));
  }

  // Al terminar la cuenta, se piden las respuestas finales a cada celular.
  function collect(room) {
    const b = room.basta;
    if (!b || b.sub !== 'stopping') return;
    b.sub = 'collecting';
    io.to(room.code).emit('basta:collect');
    syncRoom(room);
    schedule(room, COLLECT_MS, () => startReview(room));
  }

  function startReview(room) {
    const b = room.basta;
    if (!b || b.sub !== 'collecting') return;
    b.sub = 'review';
    b.ready = new Set();
    b.deadline = Date.now() + REVIEW_MS;
    syncRoom(room);
    schedule(room, REVIEW_MS, () => finishReview(room));
  }

  const clip = (text) => normalize(text).replace(/[^a-z0-9 ]/g, '').replace(/\s+/g, ' ').trim();

  // Puntos de la ronda por jugador y categoría (se recalcula con cada voto).
  // Estados de una respuesta:
  //   válidas:   verified (está en la lista ✅) · approved (la aprobó la mayoría 👍) · ok (categoría libre)
  //   inválidas: empty · letter (no empieza con la letra) · invalid (sin sentido) · rejected (👎 de la mayoría)
  //              unknown (la app no la reconoce; la mayoría puede aprobarla con 👍)
  const VALID = new Set(['ok', 'verified', 'approved', 'unverified']);

  function score(room) {
    const b = room.basta;
    const letter = b.letter.toLowerCase();
    const strict = room.settings.bastaStrict;
    const voters = connectedPlayers(room).length;
    // Decide la mayoría de los demás jugadores.
    const needed = Math.floor(Math.max(1, voters - 1) / 2) + 1;
    const table = new Map(); // playerId -> [{ text, status, points, ups, downs, needed }]
    const ids = room.order.filter((id) => b.answers.has(id));

    b.cats.forEach((cat, c) => {
      const entries = ids.map((id) => {
        const text = (b.answers.get(id) || [])[c] || '';
        const key = clip(text);
        const votes = b.rejects.get(`${id}|${c}`) || new Map();
        const ups = [...votes.values()].filter((v) => v === 'up').length;
        const downs = [...votes.values()].filter((v) => v === 'down').length;
        let status;
        if (!key) status = 'empty';
        else if (key.replace(/ /g, '').length < 2 || key[0] !== letter) status = 'letter';
        else if (strict && WORDS.gibberish(text)) status = ups >= needed ? 'approved' : 'invalid';
        else if (downs >= needed) status = 'rejected';
        else {
          const verdict = WORDS.check(cat.id, text);
          if (verdict === 'known') status = 'verified';
          // La app no la conoce: se acepta igual (nunca se bloquea); la mayoría puede anularla con 👎.
          else if (verdict === 'unknown' && strict) status = 'unverified';
          else status = 'ok';
        }
        return { id, text, key: key.replace(/ /g, ''), status, ups, downs };
      });
      const valid = entries.filter((e) => VALID.has(e.status));
      entries.forEach((e) => {
        let points = 0;
        if (VALID.has(e.status)) {
          const same = valid.filter((v) => v.key === e.key).length;
          points = valid.length === 1 ? POINTS_ONLY : same === 1 ? POINTS_UNIQUE : POINTS_REPEATED;
        }
        if (!table.has(e.id)) table.set(e.id, []);
        table.get(e.id)[c] = { text: e.text, status: e.status, points, ups: e.ups, downs: e.downs, needed };
      });
    });
    return table;
  }

  function finishReview(room) {
    const b = room.basta;
    if (!b || b.sub !== 'review') return;
    const table = score(room);
    b.finalTable = table;
    const gains = [];
    for (const [id, cells] of table) {
      const p = room.players.get(id);
      if (!p) continue;
      const points = cells.reduce((sum, cell) => sum + (cell ? cell.points : 0), 0);
      p.score += points;
      gains.push({ id, name: p.name, avatar: p.avatar, points });
    }
    gains.sort((a, z) => z.points - a.points);
    b.results = { letter: b.letter, gains };
    b.sub = 'results';
    b.deadline = Date.now() + RESULTS_MS;
    if (gains[0] && gains[0].points > 0) systemMsg(room, `🏅 Ronda ${b.round}: ${gains[0].name} sumó ${gains[0].points} puntos.`, 'success');
    syncRoom(room);
    schedule(room, RESULTS_MS, () => nextRound(room));
  }

  // ─── Vista de cada jugador ───
  function view(room, playerId) {
    const b = room.basta;
    if (!b) return null;
    const base = {
      round: b.round,
      rounds: b.rounds,
      sub: b.sub,
      letter: b.sub === 'letter' ? null : b.letter,
      cats: b.cats,
      timeLeft: Math.max(0, b.deadline - Date.now()),
      total: b.sub === 'writing' ? room.settings.bastaTime * 1000 : b.sub === 'review' ? REVIEW_MS : 0,
      stopper: b.stopper,
      mine: b.answers.get(playerId) || null,
      results: b.results
    };
    if (['writing', 'stopping', 'collecting'].includes(b.sub)) {
      // Mientras se escribe, nadie ve las respuestas de los demás: solo cuántas lleva.
      base.progress = room.order.map((id) => ({
        id, filled: (b.answers.get(id) || []).filter((t) => t && t.trim()).length
      }));
    }
    if (b.sub === 'review' || b.sub === 'results') {
      // En "results" se muestra la tabla final (con las no reconocidas ya marcadas ❌).
      const table = b.sub === 'results' && b.finalTable ? b.finalTable : score(room);
      base.review = b.cats.map((_cat, c) => room.order
        .filter((id) => table.has(id))
        .map((id) => {
          const cell = table.get(id)[c];
          return { ...cell, id, myVote: (b.rejects.get(`${id}|${c}`) || new Map()).get(playerId) || null };
        }));
      base.ready = [...b.ready];
    }
    return base;
  }

  // ─── Acciones de los jugadores ───
  function cleanAnswers(room, list) {
    if (!Array.isArray(list)) return null;
    return room.basta.cats.map((_c, i) => clean(list[i], MAX_ANSWER));
  }

  function onAnswers(room, player, list) {
    const b = room.basta;
    if (!b || !['writing', 'stopping', 'collecting'].includes(b.sub)) return;
    const answers = cleanAnswers(room, list);
    if (!answers) return;
    const before = (b.answers.get(player.id) || []).filter(Boolean).length;
    b.answers.set(player.id, answers);
    // Solo se avisa a los demás cuando cambia cuántas categorías lleva.
    if (answers.filter(Boolean).length !== before && b.sub === 'writing') syncRoom(room);
  }

  function onStop(room, player, list) {
    const b = room.basta;
    if (!b || b.sub !== 'writing') return;
    const answers = cleanAnswers(room, list);
    if (answers) b.answers.set(player.id, answers);
    const mine = b.answers.get(player.id) || [];
    if (mine.length < b.cats.length || mine.some((t) => !t)) {
      return h.emitTo(room, player.id, 'chat:system', { text: 'Llena todas las categorías para decir ¡Basta!', kind: 'warn' });
    }
    stop(room, player);
  }

  function onVote(room, player, data) {
    const b = room.basta;
    if (!b || b.sub !== 'review' || !data) return;
    const c = Number(data.cat);
    const target = String(data.id || '');
    if (!Number.isInteger(c) || c < 0 || c >= b.cats.length || target === player.id || !b.answers.has(target)) return;
    const key = `${target}|${c}`;
    const type = data.type === 'up' ? 'up' : 'down';
    if (!b.rejects.has(key)) b.rejects.set(key, new Map());
    const votes = b.rejects.get(key);
    if (votes.get(player.id) === type) votes.delete(player.id); else votes.set(player.id, type);
    syncRoom(room);
  }

  function onReady(room, player) {
    const b = room.basta;
    if (!b || b.sub !== 'review') return;
    b.ready.add(player.id);
    checkReady(room);
  }

  function checkReady(room) {
    const b = room.basta;
    if (!b || b.sub !== 'review') return;
    const waiting = connectedPlayers(room).filter((p) => !b.ready.has(p.id));
    if (waiting.length === 0) finishReview(room);
    else syncRoom(room);
  }

  return {
    CATEGORIES, ROUND_OPTIONS, TIME_OPTIONS, MIN_CATS, MAX_CATS,
    defaults, applySettings, ready, start, view,
    onAnswers, onStop, onVote, onReady, checkReady
  };
};
