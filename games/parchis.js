'use strict';

// ─── 🎲 Parchís / Parqués ────────────────────────────────────────────────────
// De 2 a 10 jugadores. Hasta 4 se usa el tablero clásico de 4 brazos; con 5 o
// más, un tablero con un brazo por jugador. Cada brazo tiene 17 casillas del
// circuito; cada color sale de su casa, da la vuelta hasta su entrada
// (5 casillas antes de su salida), sube por su pasillo (7 casillas) y corona
// en el cielo (el centro).
//
// El anfitrión elige:
//   · cuántos juegan, cuántas fichas tiene cada uno (2, 3 o 4)
//   · 1 dado (Parchís: se sale con 5) o 2 dados (Parqués: se sale con pares)
//   · las reglas que se usan (ver RULES).
// Puntos para la tabla general: comer +5, coronar una ficha +10, ganar +30.

// Solo para pruebas automáticas: GAME_SPEED=10 hace las pausas 10 veces más cortas.
const SPEED = Number(process.env.GAME_SPEED) > 0 ? Number(process.env.GAME_SPEED) : 1;

const ARM = 17;
const MAX_SEATS = 10;
const PIECE_OPTIONS = [2, 3, 4];
const DICE_OPTIONS = [1, 2];
const COLORS = [
  { name: 'Amarillo', hex: '#f5b700' },
  { name: 'Azul', hex: '#2f6fdf' },
  { name: 'Rojo', hex: '#e03131' },
  { name: 'Verde', hex: '#2f9e44' },
  { name: 'Naranja', hex: '#f76707' },
  { name: 'Morado', hex: '#7048e8' },
  { name: 'Rosa', hex: '#e64980' },
  { name: 'Turquesa', hex: '#0c8599' },
  { name: 'Café', hex: '#8d5524' },
  { name: 'Gris', hex: '#495057' }
];
const SEAT_ARMS_4 = { 2: [0, 2], 3: [0, 1, 2], 4: [0, 1, 2, 3] };

// Reglas que el anfitrión puede activar o desactivar.
const RULES = [
  { id: 'repeat', label: 'Repetir turno', desc: 'Con un 6 (1 dado) o con pares (2 dados) se vuelve a tirar.', def: true },
  { id: 'threeTries', label: 'Tres intentos para salir', desc: 'Si todas tus fichas están en la cárcel, tienes 3 tiros para sacar el 5 o los pares.', def: true },
  { id: 'pairsAll', label: 'Cualquier par saca todas', desc: '2 dados: cualquier par saca todas las fichas de la cárcel (si no, solo 1-1 y 6-6 sacan todas y los demás pares sacan dos).', def: false },
  { id: 'safes', label: 'Seguros ⭐', desc: 'En los seguros y salidas no se puede comer.', def: true },
  { id: 'exitCapture', label: 'Comer en la salida', desc: 'Al sacar fichas de la cárcel te comes a los rivales que estén en tu salida.', def: true },
  { id: 'barriers', label: 'Barreras', desc: 'Dos fichas en la misma casilla no dejan pasar a nadie.', def: true },
  { id: 'captureBonus', label: 'Premio por comer (+20)', desc: 'Al comer una ficha avanzas 20 casillas con la ficha que quieras.', def: true },
  { id: 'goalBonus', label: 'Premio por coronar (+10)', desc: 'Al meter una ficha al cielo avanzas 10 casillas con otra.', def: true },
  { id: 'exact', label: 'Llegada exacta al cielo', desc: 'Para coronar necesitas el número exacto.', def: true },
  { id: 'threePenalty', label: 'Tres seguidos: a la cárcel', desc: 'Con tres 6 o tres pares seguidos, la última ficha que moviste vuelve a la cárcel.', def: true },
  { id: 'threeCrown', label: 'Tres pares sacan una ficha', desc: 'Con tres 6 o tres pares seguidos coronas la ficha que elijas (reemplaza a "Tres seguidos: a la cárcel").', def: false },
  { id: 'pataPerro', label: 'Pata de perro 🐾', desc: '2 dados: si sacas 2 y 1, en lugar de avanzar retrocedes 3 casillas con una de tus fichas.', def: true },
  { id: 'lastOneDie', label: 'Última ficha: un solo dado', desc: '2 dados: cuando tu última ficha va por el pasillo del cielo, solo usas un dado (el otro no se usa).', def: true },
  { id: 'soplar', label: 'Soplar', desc: 'Si alguien pudo comer (con un dado o con la suma) y no lo hizo, los demás pueden tocar 🌬️ Soplar antes de que tire el siguiente jugador: la app lo revisa y, si es cierto, esa ficha se va a la cárcel.', def: false },
  { id: 'robarCielo', label: 'Robar cielo', desc: 'Si al pasar por la entrada de un rival el número da exacto para caer sobre una ficha suya en su pasillo, entras, te la comes y coronas por ese mismo cielo.', def: false }
];
const RULE_IDS = new Set(RULES.map((r) => r.id));
const DEFAULT_RULES = RULES.filter((r) => r.def).map((r) => r.id);

const TURN_MS = 25000 / SPEED;      // tiempo para tirar o mover antes de que se juegue solo
const AWAY_MS = 4000 / SPEED;       // si el jugador está desconectado, se juega solo más rápido
const AUTO_MOVE_MS = 900 / SPEED;   // pausa para ver los dados cuando solo hay una jugada
const NO_MOVE_MS = 1600 / SPEED;    // pausa cuando no hay jugada posible
const END_MS = 4500 / SPEED;        // celebración antes del podio

const POINTS_CAPTURE = 5;
const POINTS_GOAL = 10;
const POINTS_WIN = 30;
const BONUS_CAPTURE = 20;
const BONUS_GOAL = 10;

// Medidas del tablero según la cantidad de brazos.
function boardFor(arms) {
  const track = arms * ARM;
  const entryOf = (arm) => arm * ARM + 8;
  const exitOf = (arm) => (arm * ARM + 13) % track;
  const safe = new Set();
  for (let a = 0; a < arms; a++) {
    safe.add(entryOf(a));
    safe.add(exitOf(a));
    safe.add((entryOf(a) + 12) % track);
  }
  return {
    arms,
    track,
    lastTrack: track - 5,     // último paso en el circuito (= casilla de entrada)
    goal: track + 3,          // después vienen 7 casillas de pasillo y el cielo
    entryOf,
    exitOf,
    safe,
    absOf: (arm, steps) => (exitOf(arm) + steps) % track
  };
}

module.exports = function createParchis(h) {
  const { io, syncRoom, systemMsg, endGame } = h;

  // ─── Ajustes del lobby ───
  const defaults = () => ({ parchisPlayers: 0, parchisPieces: 4, parchisDice: 1, parchisRules: [...DEFAULT_RULES] });

  function applySettings(room, s) {
    const n = Number(s.parchisPlayers);
    if (Number.isInteger(n) && (n === 0 || (n >= 2 && n <= MAX_SEATS))) room.settings.parchisPlayers = n;
    if (PIECE_OPTIONS.includes(Number(s.parchisPieces))) room.settings.parchisPieces = Number(s.parchisPieces);
    if (DICE_OPTIONS.includes(Number(s.parchisDice))) room.settings.parchisDice = Number(s.parchisDice);
    if (Array.isArray(s.parchisRules)) {
      const rules = new Set(s.parchisRules.filter((r) => RULE_IDS.has(r)));
      // "Tres pares sacan una ficha" y "Tres seguidos: a la cárcel" no se pueden usar juntas.
      if (rules.has('threeCrown') && rules.has('threePenalty')) {
        const before = new Set(room.settings.parchisRules);
        if (before.has('threeCrown')) rules.delete('threeCrown'); else rules.delete('threePenalty');
      }
      room.settings.parchisRules = [...rules];
    }
  }

  const schedule = (room, ms, fn) => {
    clearTimeout(room.gameTimer);
    room.gameTimer = setTimeout(fn, ms);
  };

  const P = (room) => room.parchis;
  const B = (room) => room.parchis.board;
  const has = (room, rule) => room.parchis.rules.has(rule);
  const current = (room) => P(room).seats[P(room).turn];
  const nameOf = (room, seat) => room.players.get(seat.id)?.name || 'Jugador';
  const laneOf = (seat, i) => (seat.lanes[i] === null ? seat.arm : seat.lanes[i]);

  function start(room) {
    const wanted = room.settings.parchisPlayers || MAX_SEATS;
    const ids = room.order.filter((id) => room.players.get(id)?.connected).slice(0, Math.min(wanted, MAX_SEATS));
    const n = ids.length;
    const armsCount = n <= 4 ? 4 : n;
    const arms = n <= 4 ? SEAT_ARMS_4[n] : ids.map((_id, i) => i);
    const pieces = room.settings.parchisPieces;
    room.phase = 'parchis';
    room.parchis = {
      board: boardFor(armsCount),
      dice: room.settings.parchisDice,
      rules: new Set(room.settings.parchisRules),
      pieceCount: pieces,
      seats: ids.map((id, i) => ({ id, arm: arms[i], pieces: Array(pieces).fill(-1), lanes: Array(pieces).fill(null), gone: false })),
      turn: 0,
      stage: 'roll',     // roll | move | bonus | crown | wait | over
      roll: [],          // valores de la última tirada
      pending: [],       // dados que faltan por usar
      repeatRoll: false, // la tirada actual da derecho a volver a tirar
      rollId: 0,
      streak: 0,         // seises o pares seguidos en el turno
      tries: 0,          // intentos para salir de la cárcel
      bonus: [],
      bonusAmount: null,
      legal: [],
      lastMoved: null,
      deadline: 0,
      winner: null,
      log: []
    };
    const names = room.parchis.seats.map((s) => `${room.players.get(s.id).name} (${COLORS[s.arm].name})`).join(', ');
    const watchers = room.order.length - n;
    const mode = room.parchis.dice === 2 ? 'Parqués con 2 dados' : 'Parchís con 1 dado';
    systemMsg(room, `🎲 ¡Comienza el ${mode}! ${pieces} fichas cada uno. Juegan: ${names}.${watchers > 0 ? ' Los demás miran la partida.' : ''}`, 'success');
    beginStage(room, 'roll');
  }

  function log(room, text) {
    const p = P(room);
    p.log.push(text);
    if (p.log.length > 6) p.log.shift();
  }

  // ─── Tablero: quién está dónde ───
  function occupantsAt(room, abs) {
    const { lastTrack, absOf } = B(room);
    const list = [];
    for (const seat of P(room).seats) {
      if (seat.gone) continue;
      seat.pieces.forEach((steps, i) => {
        if (steps >= 0 && steps <= lastTrack && absOf(seat.arm, steps) === abs) list.push({ seat, i });
      });
    }
    return list;
  }
  // Fichas en un pasillo (lane = brazo dueño del pasillo), en el paso indicado.
  function corridorAt(room, lane, steps) {
    const list = [];
    for (const seat of P(room).seats) {
      if (seat.gone) continue;
      seat.pieces.forEach((s, i) => { if (s === steps && laneOf(seat, i) === lane) list.push({ seat, i }); });
    }
    return list;
  }
  const seatIdx = (room, seat) => P(room).seats.indexOf(seat);
  const ref = (room, o) => ({ seatIdx: seatIdx(room, o.seat), i: o.i });

  // Jugadas posibles de un jugador con cierta cantidad de casillas.
  function legalMoves(room, seat, amount, { bonus = false } = {}) {
    const { lastTrack, goal, exitOf, entryOf, absOf, safe } = B(room);
    const p = P(room);
    const barriers = has(room, 'barriers');
    const safes = has(room, 'safes');
    const moves = [];

    // 1 dado: salir de la cárcel con un 5 (obligatorio si se puede).
    if (!bonus && p.dice === 1 && amount === 5) {
      const jail = seat.pieces.indexOf(-1);
      if (jail !== -1) {
        const exit = exitOf(seat.arm);
        const occ = occupantsAt(room, exit);
        const own = occ.filter((o) => o.seat === seat);
        if (own.length < 2) {
          const rivals = occ.filter((o) => o.seat !== seat);
          const capture = has(room, 'exitCapture') ? rivals : occ.length >= 2 ? rivals.slice(-1) : [];
          return [{ piece: jail, from: -1, to: 0, lane: null, capture: capture.map((o) => ref(room, o)), kind: 'exit' }];
        }
      }
    }

    const seen = new Set();
    seat.pieces.forEach((from, i) => {
      if (from < 0 || from >= goal) return;
      const lane = laneOf(seat, i);
      let to = from + amount;
      if (to > goal) {
        if (has(room, 'exact')) return;
        to = goal;
      }
      const key = `${from}|${lane}`;
      if (seen.has(key)) return;
      let capture = [];
      let blocked = false;
      for (let k = from + 1; k <= to && !blocked; k++) {
        const landing = k === to;
        if (k <= lastTrack) {
          const abs = absOf(seat.arm, k);
          const occ = occupantsAt(room, abs);
          if (occ.length >= 2 && (barriers || landing)) { blocked = true; break; }
          if (landing && occ.length) {
            const rivals = occ.filter((o) => o.seat !== seat);
            if (rivals.length && !(safes && safe.has(abs))) capture = rivals.map((o) => ref(room, o));
            else if (rivals.length && occ.length >= 2) blocked = true;
          }
          // 🌩️ Robar cielo: desde la entrada de un rival, el resto exacto cae en su pasillo sobre una ficha suya.
          if (!landing && has(room, 'robarCielo') && lane === seat.arm) {
            const rival = p.seats.find((s) => !s.gone && s !== seat && entryOf(s.arm) === abs);
            const r = to - k;
            if (rival && r >= 1 && r <= 7) {
              const victims = corridorAt(room, rival.arm, lastTrack + r).filter((o) => o.seat !== seat);
              const path = [];
              for (let c = 1; c < r; c++) path.push(corridorAt(room, rival.arm, lastTrack + c).length);
              if (victims.length && !(barriers && path.some((n) => n >= 2))) {
                moves.push({ piece: i, from, to: lastTrack + r, lane: rival.arm, capture: victims.map((o) => ref(room, o)), kind: 'steal' });
              }
            }
          }
        } else if (k < goal) {
          const n = corridorAt(room, lane, k).length;
          if (n >= 2 && (barriers || landing)) { blocked = true; break; }
        }
      }
      if (blocked) return;
      seen.add(key);
      moves.push({ piece: i, from, to, lane: from > lastTrack ? lane : null, capture, kind: 'move' });
    });
    return moves;
  }

  // ─── Turnos ───
  function beginStage(room, stage) {
    const p = P(room);
    if (!p || room.phase !== 'parchis') return;
    p.stage = stage;
    const seat = current(room);
    const player = room.players.get(seat.id);
    const wait = player && player.connected ? TURN_MS : AWAY_MS;
    p.deadline = Date.now() + wait;
    syncRoom(room);
    schedule(room, wait, () => autoPlay(room));
  }

  // Si el jugador no actúa a tiempo, la app juega por él.
  function autoPlay(room) {
    const p = P(room);
    if (!p || room.phase !== 'parchis') return;
    if (p.stage === 'roll') return roll(room);
    if (p.stage === 'crown') {
      const best = p.legal.slice().sort((a, z) => z.from - a.from)[0];
      return best && crown(room, best.piece);
    }
    if ((p.stage === 'move' || p.stage === 'bonus') && p.legal.length) {
      const best = [...p.legal].sort((a, z) => (z.capture.length - a.capture.length) || (z.to - a.to))[0];
      move(room, best.piece, best.die);
    }
  }

  const allInJail = (seat, goal) => seat.pieces.some((s) => s === -1) && seat.pieces.every((s) => s === -1 || s >= goal);

  function roll(room) {
    const p = P(room);
    if (p.stage !== 'roll') return;
    const seat = current(room);
    const name = nameOf(room, seat);
    const { goal } = B(room);
    const d = () => 1 + Math.floor(Math.random() * 6);
    p.roll = p.dice === 2 ? [d(), d()] : [d()];
    p.rollId++;
    if (p.soplable && p.soplable.seatIdx !== p.turn) p.soplable = null; // ya tiró otro: no se puede soplar
    p.bonus = [];
    p.bonusAmount = null;
    const isRepeat = p.dice === 2 ? p.roll[0] === p.roll[1] : p.roll[0] === 6;
    p.repeatRoll = isRepeat && has(room, 'repeat');
    p.streak = p.repeatRoll ? p.streak + 1 : 0;
    const shown = p.roll.join(' y ');

    // Tres 6 o tres pares seguidos.
    if (p.streak === 3) {
      p.streak = 0;
      p.repeatRoll = false;
      if (has(room, 'threeCrown')) {
        p.legal = seat.pieces.map((s, i) => ({ piece: i, from: s, to: goal, die: -1, capture: [] })).filter((m) => m.from < goal);
        if (p.legal.length) {
          log(room, `👑 ${name} sacó tres ${p.dice === 2 ? 'pares' : '6'} seguidos: ¡corona una ficha!`);
          return beginStage(room, 'crown');
        }
      } else if (has(room, 'threePenalty')) {
        const lm = p.lastMoved;
        if (lm && lm.seat === seat && seat.pieces[lm.i] >= 0 && seat.pieces[lm.i] < goal) {
          seat.pieces[lm.i] = -1;
          seat.lanes[lm.i] = null;
          log(room, `😵 ${name} sacó tres ${p.dice === 2 ? 'pares' : '6'} seguidos: su última ficha vuelve a la cárcel.`);
        } else {
          log(room, `😵 ${name} sacó tres ${p.dice === 2 ? 'pares' : '6'} seguidos y pierde el turno.`);
        }
        return waitThen(room, () => nextSeat(room));
      }
    }

    // 2 dados: los pares sacan fichas de la cárcel (usa toda la tirada).
    // Si todas están en la cárcel salen solas; si ya hay fichas en juego, el
    // jugador elige: tocar una ficha de la cárcel para sacarlas, o mover un
    // dado con una ficha y el otro dado con otra.
    const pairWithJail = p.dice === 2 && p.roll[0] === p.roll[1] && seat.pieces.includes(-1);
    if (pairWithJail && allInJail(seat, goal)) return releasePair(room, seat);

    // 🐾 Pata de perro: con 2 y 1 una ficha retrocede 3 casillas.
    if (p.dice === 2 && has(room, 'pataPerro') && [...p.roll].sort().join() === '1,2') {
      p.pending = [3];
      p.legal = backMoves(room, seat, 3);
      if (!p.legal.length) {
        log(room, `🐾 ${name} sacó pata de perro (2 y 1), pero no tiene fichas para retroceder.`);
        p.pending = [];
        return waitThen(room, () => nextSeat(room));
      }
      log(room, `🐾 ¡Pata de perro! ${name} sacó 2 y 1: retrocede 3 casillas.`);
      noteChances(room, seat);
      return stageMove(room, 'move');
    }

    p.pending = [...p.roll];
    p.legal = legalAll(room, seat);
    if (pairWithJail) {
      seat.pieces.forEach((s, i) => { if (s === -1) p.legal.push({ piece: i, from: -1, to: 0, lane: null, capture: [], kind: 'release', die: 0 }); });
    }
    if (!p.legal.length) {
      const jailed = allInJail(seat, goal);
      if (jailed && has(room, 'threeTries') && p.tries < 2 && !p.repeatRoll) {
        p.tries++;
        log(room, `🎲 ${name} sacó ${shown}: intento ${p.tries} de 3 para salir.`);
        return waitThen(room, () => beginStage(room, 'roll'));
      }
      p.tries = 0;
      log(room, `🎲 ${name} sacó ${shown} y no puede mover.`);
      p.pending = [];
      return waitThen(room, () => (p.repeatRoll ? beginStage(room, 'roll') : nextSeat(room)));
    }
    p.tries = 0;
    noteChances(room, seat);
    stageMove(room, 'move');
  }

  // 🌬️ Soplar: al tirar se anotan las fichas que pueden comer (con un dado o con la suma).
  function noteChances(room, seat) {
    const p = P(room);
    p.ate = false;
    p.chances = [];
    if (!has(room, 'soplar')) return;
    const add = (i) => { if (!p.chances.includes(i)) p.chances.push(i); };
    p.legal.forEach((m) => { if (m.capture.length && m.kind !== 'release') add(m.piece); });
    if (p.pending.length === 2 && !p.legal.some((m) => m.kind === 'back')) {
      legalMoves(room, seat, p.pending[0] + p.pending[1]).forEach((m) => { if (m.capture.length && m.kind === 'move') add(m.piece); });
    }
  }

  // Al terminar de usar la tirada: si pudo comer y no comió, queda "soplable"
  // hasta que tire otro jugador. Los demás deciden si lo soplan (botón 🌬️).
  function checkSoplar(room) {
    const p = P(room);
    const chances = p.chances || [];
    p.chances = [];
    if (!has(room, 'soplar') || p.ate || !chances.length) return;
    p.soplable = { seatIdx: p.turn, pieces: chances };
  }

  // Un jugador tocó 🌬️ Soplar: la app revisa si de verdad hay a quién soplar.
  function onSoplar(room, player) {
    const p = P(room);
    if (!p || room.phase !== 'parchis' || p.stage === 'over' || !has(room, 'soplar')) return;
    const reply = (ok, text) => io.to(player.socketId).emit('parchis:soplar', { ok, text });
    const s = p.soplable;
    const offender = s && p.seats[s.seatIdx];
    if (!offender || offender.gone) {
      reply(false, 'No había nada que soplar: nadie dejó de comer pudiendo.');
      log(room, `🌬️ ${player.name} sopló, pero no había nada que soplar.`);
      return syncRoom(room);
    }
    if (offender.id === player.id) return reply(false, 'No te puedes soplar a ti mismo 😅');
    const { goal } = B(room);
    const i = s.pieces.find((k) => offender.pieces[k] >= 0 && offender.pieces[k] < goal);
    p.soplable = null;
    if (i === undefined) {
      reply(false, 'Esa ficha ya no está en juego: no se puede soplar.');
      return syncRoom(room);
    }
    offender.pieces[i] = -1;
    offender.lanes[i] = null;
    const name = nameOf(room, offender);
    log(room, `🌬️ ¡${player.name} sopló a ${name}! Pudo comer y no lo hizo: esa ficha vuelve a la cárcel.`);
    io.to(room.code).emit('parchis:event', { kind: 'capture', text: `¡${player.name} sopló a ${name}!` });
    syncRoom(room);
  }

  function releasePair(room, seat) {
    const p = P(room);
    const jail = seat.pieces.map((s, i) => (s === -1 ? i : -1)).filter((i) => i >= 0);
    const all = has(room, 'pairsAll') || p.roll[0] === 1 || p.roll[0] === 6;
    const out = all ? jail : jail.slice(0, 2);
    release(room, seat, out);
    p.tries = 0;
    p.pending = [];
    p.legal = [];
    log(room, `🔓 ${nameOf(room, seat)} sacó pares (${p.roll.join(' y ')}) y saca ${out.length === 1 ? 'una ficha' : `${out.length} fichas`} de la cárcel.`);
    return afterMoves(room);
  }

  // Fichas que pueden retroceder (solo en el circuito, sin pasar antes de su salida).
  function backMoves(room, seat, amount) {
    const { lastTrack, absOf, safe } = B(room);
    const moves = [];
    const seen = new Set();
    seat.pieces.forEach((from, i) => {
      if (from < amount || from > lastTrack || seat.lanes[i] !== null || seen.has(from)) return;
      const to = from - amount;
      const abs = absOf(seat.arm, to);
      const occ = occupantsAt(room, abs);
      if (occ.length >= 2) return;
      const rivals = occ.filter((o) => o.seat !== seat);
      const capture = rivals.length && !(has(room, 'safes') && safe.has(abs)) ? rivals.map((o) => ref(room, o)) : [];
      seen.add(from);
      moves.push({ piece: i, from, to, lane: null, capture, kind: 'back', die: 0 });
    });
    return moves;
  }

  function waitThen(room, fn) {
    const p = P(room);
    p.legal = [];
    p.stage = 'wait';
    syncRoom(room);
    schedule(room, NO_MOVE_MS, fn);
  }

  // Todas las jugadas posibles con los dados que faltan (cada una dice qué dado usa).
  function legalAll(room, seat) {
    const p = P(room);
    const list = [];
    const used = new Set();
    p.pending.forEach((amount, die) => {
      if (used.has(amount)) return; // dos dados iguales dan las mismas jugadas
      used.add(amount);
      legalMoves(room, seat, amount).forEach((m) => list.push({ ...m, die }));
    });
    return list;
  }

  function stageMove(room, stage) {
    const p = P(room);
    const options = new Set(p.legal.map((m) => `${m.piece}|${m.die}|${m.kind}`));
    // Si solo hay una jugada posible, se hace sola.
    if (options.size === 1) {
      p.stage = stage;
      p.deadline = Date.now() + AUTO_MOVE_MS;
      syncRoom(room);
      const only = p.legal[0];
      return schedule(room, AUTO_MOVE_MS, () => move(room, only.piece, only.die, only.kind));
    }
    beginStage(room, stage);
  }

  function release(room, seat, indices) {
    const { exitOf } = B(room);
    const p = P(room);
    const exit = exitOf(seat.arm);
    if (has(room, 'exitCapture')) {
      const rivals = occupantsAt(room, exit).filter((o) => o.seat !== seat);
      rivals.forEach((o) => sendToJail(room, o.seat, o.i, seat));
    }
    indices.forEach((i) => { seat.pieces[i] = 0; seat.lanes[i] = null; });
    p.lastMoved = { seat, i: indices[indices.length - 1] };
  }

  function sendToJail(room, victimSeat, i, by) {
    const p = P(room);
    if (by === current(room)) p.ate = true;
    victimSeat.pieces[i] = -1;
    victimSeat.lanes[i] = null;
    const player = room.players.get(by.id);
    if (player) player.score += POINTS_CAPTURE;
    if (has(room, 'captureBonus')) p.bonus.push(BONUS_CAPTURE);
    const name = nameOf(room, by);
    const victim = nameOf(room, victimSeat);
    log(room, `🍽️ ${name} se comió una ficha de ${victim}${has(room, 'captureBonus') ? ` (+${BONUS_CAPTURE} casillas)` : ''}.`);
    io.to(room.code).emit('parchis:event', { kind: 'capture', text: `${name} se comió a ${victim}` });
  }

  function move(room, pieceIdx, die, kind) {
    const p = P(room);
    if (p.stage !== 'move' && p.stage !== 'bonus') return;
    const dieIdx = p.stage === 'bonus' ? -1 : Number(die);
    const m = p.legal.find((x) => x.piece === pieceIdx && x.die === dieIdx && (!kind || x.kind === kind))
      || p.legal.find((x) => x.piece === pieceIdx && x.die === dieIdx);
    if (!m) return;
    const seat = current(room);
    const player = room.players.get(seat.id);
    const name = nameOf(room, seat);
    const { goal } = B(room);
    if (m.kind === 'release') return releasePair(room, seat);

    // Última ficha por el pasillo del cielo: solo se usa un dado.
    const lastOne = p.dice === 2 && has(room, 'lastOneDie') && dieIdx >= 0
      && seat.pieces.filter((x) => x < goal).length === 1 && m.from > B(room).lastTrack;

    seat.pieces[m.piece] = m.to;
    seat.lanes[m.piece] = m.lane === null || m.lane === seat.arm ? null : m.lane;
    p.lastMoved = { seat, i: m.piece };
    if (m.kind === 'back' || lastOne) p.pending = [];
    else if (dieIdx >= 0) p.pending.splice(dieIdx, 1);
    p.legal = [];

    if (m.kind === 'steal') {
      const owner = p.seats[m.capture[0].seatIdx];
      log(room, `🌩️ ${name} se robó el cielo de ${nameOf(room, owner)}.`);
    }
    m.capture.forEach((c) => sendToJail(room, p.seats[c.seatIdx], c.i, seat));

    if (seat.pieces[m.piece] === goal) crowned(room, seat, player, name);
    if (seat.pieces.every((s) => s === goal)) return finish(room, seat);
    afterMoves(room);
  }

  function crowned(room, seat, player, name) {
    const p = P(room);
    if (has(room, 'goalBonus')) p.bonus.push(BONUS_GOAL);
    if (player) player.score += POINTS_GOAL;
    log(room, `👑 ${name} coronó una ficha en el cielo${has(room, 'goalBonus') ? ` (+${BONUS_GOAL} casillas)` : ''}.`);
    io.to(room.code).emit('parchis:event', { kind: 'goal', text: `${name} coronó una ficha` });
  }

  function crown(room, pieceIdx) {
    const p = P(room);
    if (p.stage !== 'crown' || !p.legal.some((m) => m.piece === pieceIdx)) return;
    const seat = current(room);
    const { goal } = B(room);
    seat.pieces[pieceIdx] = goal;
    seat.lanes[pieceIdx] = null;
    p.legal = [];
    crowned(room, seat, room.players.get(seat.id), nameOf(room, seat));
    p.bonus = []; // al coronar con tres pares el turno termina
    if (seat.pieces.every((s) => s === goal)) return finish(room, seat);
    nextSeat(room);
  }

  // Después de mover: premios pendientes, luego el otro dado, luego repetir o pasar el turno.
  function afterMoves(room) {
    const p = P(room);
    const seat = current(room);
    while (p.bonus.length) {
      const amount = p.bonus.shift();
      const legal = legalMoves(room, seat, amount, { bonus: true }).map((m) => ({ ...m, die: -1 }));
      if (legal.length) {
        p.legal = legal;
        p.bonusAmount = amount;
        return stageMove(room, 'bonus');
      }
      log(room, `😕 ${nameOf(room, seat)} no puede usar el premio de ${amount}.`);
    }
    p.bonusAmount = null;
    if (p.pending.length) {
      p.legal = legalAll(room, seat);
      if (p.legal.length) return stageMove(room, 'move');
      p.pending = [];
    }
    checkSoplar(room);
    if (p.repeatRoll) {
      log(room, `🎲 ${nameOf(room, seat)} sacó ${p.dice === 2 ? 'pares' : '6'}: ¡tira otra vez!`);
      return beginStage(room, 'roll');
    }
    nextSeat(room);
  }

  function nextSeat(room) {
    const p = P(room);
    if (!p || room.phase !== 'parchis') return;
    Object.assign(p, { streak: 0, tries: 0, roll: [], pending: [], bonus: [], bonusAmount: null, legal: [], repeatRoll: false, chances: [], ate: false });
    for (let n = 1; n <= p.seats.length; n++) {
      const idx = (p.turn + n) % p.seats.length;
      if (!p.seats[idx].gone) { p.turn = idx; break; }
    }
    beginStage(room, 'roll');
  }

  function finish(room, seat) {
    const p = P(room);
    p.stage = 'over';
    p.legal = [];
    p.winner = seat.id;
    const player = room.players.get(seat.id);
    if (player) player.score += POINTS_WIN;
    const name = nameOf(room, seat);
    log(room, `🏆 ¡${name} ganó!`);
    systemMsg(room, `🏆 ¡${name} ganó el ${p.dice === 2 ? 'Parqués' : 'Parchís'}! (+${POINTS_WIN} puntos)`, 'success');
    io.to(room.code).emit('parchis:event', { kind: 'win', text: `¡${name} ganó!`, id: seat.id });
    syncRoom(room);
    schedule(room, END_MS, () => {
      room.resultTitle = `🎲 ¡${name} ganó el ${p.dice === 2 ? 'Parqués' : 'Parchís'}!`;
      endGame(room);
    });
  }

  // ─── Vista (igual para todos: en el Parchís no hay secretos) ───
  function view(room) {
    const p = P(room);
    if (!p) return null;
    return {
      arms: p.board.arms,
      dice: p.dice,
      pieceCount: p.pieceCount,
      rules: [...p.rules],
      seats: p.seats.map((s) => ({ id: s.id, arm: s.arm, color: COLORS[s.arm], pieces: s.pieces, lanes: s.lanes, gone: s.gone })),
      turn: p.turn,
      turnId: p.seats[p.turn]?.id,
      stage: p.stage,
      roll: p.roll,
      pending: p.pending,
      rollId: p.rollId,
      streak: p.streak,
      legal: p.legal.map((m) => ({ piece: m.piece, die: m.die, from: m.from, to: m.to, lane: m.lane, capture: m.capture.length > 0, kind: m.kind })),
      bonusAmount: p.stage === 'bonus' ? p.bonusAmount : null,
      timeLeft: Math.max(0, p.deadline - Date.now()),
      winner: p.winner,
      log: p.log
    };
  }

  // ─── Acciones ───
  const isTurn = (room, player) => P(room) && room.phase === 'parchis' && current(room).id === player.id;

  function onRoll(room, player) {
    if (isTurn(room, player)) roll(room);
  }
  function onMove(room, player, data) {
    if (!isTurn(room, player)) return;
    const d = typeof data === 'object' && data ? data : { piece: data, die: 0 };
    const p = P(room);
    if (p.stage === 'crown') return crown(room, Number(d.piece));
    move(room, Number(d.piece), p.stage === 'bonus' ? -1 : Number(d.die) || 0, typeof d.kind === 'string' ? d.kind : undefined);
  }

  // Desconexión: si era su turno, se juega solo en unos segundos.
  function onDisconnect(room, playerId) {
    const p = P(room);
    if (!p || room.phase !== 'parchis' || current(room).id !== playerId) return;
    if (['roll', 'move', 'bonus', 'crown'].includes(p.stage)) {
      p.deadline = Date.now() + AWAY_MS;
      schedule(room, AWAY_MS, () => autoPlay(room));
    }
  }

  // Un jugador salió de la sala: sus fichas se retiran del tablero.
  function onLeave(room, playerId) {
    const p = P(room);
    if (!p || room.phase !== 'parchis') return;
    const seat = p.seats.find((s) => s.id === playerId);
    if (!seat || seat.gone) return;
    seat.gone = true;
    const active = p.seats.filter((s) => !s.gone);
    if (active.length === 1 && p.stage !== 'over') return finish(room, active[0]);
    if (current(room) === seat && p.stage !== 'over') nextSeat(room);
  }

  return {
    MAX_SEATS, COLORS, RULES, PIECE_OPTIONS, DICE_OPTIONS,
    defaults, applySettings, start, view, onRoll, onMove, onDisconnect, onLeave, onSoplar
  };
};
