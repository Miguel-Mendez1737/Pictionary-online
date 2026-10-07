'use strict';

// Solo para pruebas automáticas: GAME_SPEED=10 hace las pausas 10 veces más cortas.
const SPEED = Number(process.env.GAME_SPEED) > 0 ? Number(process.env.GAME_SPEED) : 1;

// ─── 🎲 Parchís (reglas clásicas, un dado) ────────────────────────────────────
// Hasta 4 jugadores: tablero clásico de 4 brazos (68 casillas).
// 5 o 6 jugadores: tablero hexagonal de 6 brazos (102 casillas).
// Cada brazo tiene 17 casillas del circuito. Cada color tiene 4 fichas en su
// casa, sale con un 5, da la vuelta hasta su entrada (5 casillas antes de su
// salida), sube por su pasillo (7 casillas) y llega a la meta con tirada exacta.
//   · Seguros: salida, entrada y una casilla intermedia de cada brazo.
//   · Barrera: dos fichas en la misma casilla no dejan pasar a nadie.
//   · Comer: caer sobre una ficha rival fuera de un seguro la manda a su casa
//     y premia con 20 casillas. Llegar a la meta premia con 10.
//   · Con un 6 se vuelve a tirar; con tres 6 seguidos la última ficha movida
//     vuelve a casa.
// Puntos para la tabla general: comer +5, ficha en la meta +10, ganar +30.

const ARM = 17;
const MAX_SEATS = 6;
const COLORS = [
  { name: 'Amarillo', hex: '#f5b700' },
  { name: 'Azul', hex: '#2f6fdf' },
  { name: 'Rojo', hex: '#e03131' },
  { name: 'Verde', hex: '#2f9e44' },
  { name: 'Naranja', hex: '#f76707' },
  { name: 'Morado', hex: '#7048e8' }
];
const SEAT_ARMS = { 2: [0, 2], 3: [0, 1, 2], 4: [0, 1, 2, 3], 5: [0, 1, 2, 3, 4], 6: [0, 1, 2, 3, 4, 5] };

// Medidas del tablero según la cantidad de brazos (4 o 6).
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
    goal: track + 3,          // después vienen 7 casillas de pasillo y la meta
    exitOf,
    safe,
    absOf: (arm, steps) => (exitOf(arm) + steps) % track
  };
}

const TURN_MS = 25000 / SPEED;      // tiempo para tirar o mover antes de que se juegue solo
const AWAY_MS = 4000 / SPEED;       // si el jugador está desconectado, se juega solo más rápido
const AUTO_MOVE_MS = 900 / SPEED;   // pausa para ver el dado cuando solo hay una jugada
const NO_MOVE_MS = 1600 / SPEED;    // pausa cuando no hay jugada posible
const END_MS = 4500 / SPEED;        // celebración antes del podio

const POINTS_CAPTURE = 5;
const POINTS_GOAL = 10;
const POINTS_WIN = 30;
const BONUS_CAPTURE = 20;
const BONUS_GOAL = 10;

module.exports = function createParchis(h) {
  const { io, syncRoom, systemMsg, endGame } = h;

  const schedule = (room, ms, fn) => {
    clearTimeout(room.gameTimer);
    room.gameTimer = setTimeout(fn, ms);
  };

  function start(room) {
    const ids = room.order.filter((id) => room.players.get(id)?.connected).slice(0, MAX_SEATS);
    const arms = SEAT_ARMS[ids.length];
    room.phase = 'parchis';
    room.parchis = {
      board: boardFor(ids.length > 4 ? 6 : 4),
      seats: ids.map((id, i) => ({ id, arm: arms[i], pieces: [-1, -1, -1, -1], gone: false })),
      turn: 0,
      stage: 'roll',     // roll | move | bonus | over
      die: null,
      rollId: 0,
      sixes: 0,
      bonus: [],         // premios pendientes (20 o 10)
      legal: [],
      lastMoved: null,
      deadline: 0,
      winner: null,
      log: []
    };
    const names = room.parchis.seats.map((s) => `${room.players.get(s.id).name} (${COLORS[s.arm].name})`).join(', ');
    const watchers = room.order.length - ids.length;
    systemMsg(room, `🎲 ¡Comienza el Parchís! Juegan: ${names}.${watchers > 0 ? ' Los demás miran la partida.' : ''}`, 'success');
    beginStage(room, 'roll');
  }

  const P = (room) => room.parchis;
  const B = (room) => room.parchis.board;
  const current = (room) => P(room).seats[P(room).turn];
  const nameOf = (room, seat) => room.players.get(seat.id)?.name || 'Jugador';

  function log(room, text) {
    const p = P(room);
    p.log.push(text);
    if (p.log.length > 6) p.log.shift();
  }

  // Fichas que ocupan una casilla del circuito.
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
  const corridorCount = (seat, steps) => seat.pieces.filter((s) => s === steps).length;

  // Jugadas posibles de un jugador con cierta cantidad de casillas.
  function legalMoves(room, seat, amount, { bonus = false } = {}) {
    const { lastTrack, goal: GOAL, exitOf, absOf, safe } = B(room);
    const moves = [];
    // Salir de casa con un 5 (obligatorio si se puede).
    if (!bonus && amount === 5) {
      const home = seat.pieces.indexOf(-1);
      if (home !== -1) {
        const exit = exitOf(seat.arm);
        const occ = occupantsAt(room, exit);
        const own = occ.filter((o) => o.seat === seat);
        if (own.length < 2) {
          // Si la salida está llena y hay un rival, se lo come al salir.
          const rival = occ.length >= 2 ? occ.find((o) => o.seat !== seat) : null;
          return [{ piece: home, from: -1, to: 0, capture: rival ? { seatIdx: P(room).seats.indexOf(rival.seat), i: rival.i } : null }];
        }
      }
    }
    seat.pieces.forEach((from, i) => {
      if (from < 0 || from >= GOAL) return;
      const to = from + amount;
      if (to > GOAL) return;
      let capture = null;
      for (let k = from + 1; k <= to; k++) {
        const landing = k === to;
        if (k <= lastTrack) {
          const abs = absOf(seat.arm, k);
          const occ = occupantsAt(room, abs);
          if (occ.length >= 2) return; // barrera o casilla llena
          if (landing && occ.length === 1 && occ[0].seat !== seat && !safe.has(abs)) {
            capture = { seatIdx: P(room).seats.indexOf(occ[0].seat), i: occ[0].i };
          }
        } else if (k < GOAL && corridorCount(seat, k) >= 2) {
          return;
        }
      }
      // Dos fichas iguales en la misma posición dan la misma jugada: se muestra una.
      if (moves.some((m) => m.from === from)) return;
      moves.push({ piece: i, from, to, capture });
    });
    return moves;
  }

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
    if ((p.stage === 'move' || p.stage === 'bonus') && p.legal.length) {
      const best = [...p.legal].sort((a, z) => (Boolean(z.capture) - Boolean(a.capture)) || (z.to - a.to))[0];
      move(room, best.piece);
    }
  }

  function roll(room) {
    const p = P(room);
    if (p.stage !== 'roll') return;
    const seat = current(room);
    const name = nameOf(room, seat);
    p.die = 1 + Math.floor(Math.random() * 6);
    p.rollId++;
    p.bonus = [];
    if (p.die === 6) p.sixes++;

    if (p.sixes === 3) {
      p.sixes = 0;
      const lm = p.lastMoved;
      if (lm && lm.seat === seat && seat.pieces[lm.i] >= 0 && seat.pieces[lm.i] <= B(room).lastTrack) {
        seat.pieces[lm.i] = -1;
        log(room, `😵 ${name} sacó tres 6: su última ficha vuelve a casa.`);
      } else {
        log(room, `😵 ${name} sacó tres 6 seguidos y pierde el turno.`);
      }
      p.legal = [];
      p.stage = 'wait';
      syncRoom(room);
      return schedule(room, NO_MOVE_MS, () => nextSeat(room));
    }

    p.legal = legalMoves(room, seat, p.die);
    if (!p.legal.length) {
      log(room, `🎲 ${name} sacó ${p.die} y no puede mover.`);
      p.stage = 'wait';
      syncRoom(room);
      return schedule(room, NO_MOVE_MS, () => (p.die === 6 ? beginStage(room, 'roll') : nextSeat(room)));
    }
    p.stage = 'move';
    if (p.legal.length === 1) {
      p.deadline = Date.now() + AUTO_MOVE_MS;
      syncRoom(room);
      return schedule(room, AUTO_MOVE_MS, () => move(room, p.legal[0].piece));
    }
    beginStage(room, 'move');
  }

  function move(room, pieceIdx) {
    const p = P(room);
    if (p.stage !== 'move' && p.stage !== 'bonus') return;
    const m = p.legal.find((x) => x.piece === pieceIdx);
    if (!m) return;
    const seat = current(room);
    const player = room.players.get(seat.id);
    const name = nameOf(room, seat);
    seat.pieces[m.piece] = m.to;
    p.lastMoved = { seat, i: m.piece };
    p.legal = [];

    if (m.capture) {
      const victimSeat = p.seats[m.capture.seatIdx];
      victimSeat.pieces[m.capture.i] = -1;
      p.bonus.push(BONUS_CAPTURE);
      if (player) player.score += POINTS_CAPTURE;
      const victim = nameOf(room, victimSeat);
      log(room, `🍽️ ${name} se comió una ficha de ${victim} (+${BONUS_CAPTURE} casillas).`);
      io.to(room.code).emit('parchis:event', { kind: 'capture', text: `${name} se comió a ${victim}` });
    }
    if (m.to === B(room).goal) {
      p.bonus.push(BONUS_GOAL);
      if (player) player.score += POINTS_GOAL;
      log(room, `🏁 ${name} metió una ficha en la meta (+${BONUS_GOAL} casillas).`);
      io.to(room.code).emit('parchis:event', { kind: 'goal', text: `${name} llegó a la meta` });
    }

    if (seat.pieces.every((s) => s === B(room).goal)) return finish(room, seat);
    continueTurn(room);
  }

  // Después de mover: premios pendientes, luego 6 = tira otra vez, si no pasa el turno.
  function continueTurn(room) {
    const p = P(room);
    const seat = current(room);
    while (p.bonus.length) {
      const amount = p.bonus.shift();
      const legal = legalMoves(room, seat, amount, { bonus: true });
      if (legal.length) {
        p.legal = legal;
        p.bonusAmount = amount;
        if (legal.length === 1) {
          p.stage = 'bonus';
          p.deadline = Date.now() + AUTO_MOVE_MS;
          syncRoom(room);
          return schedule(room, AUTO_MOVE_MS, () => move(room, legal[0].piece));
        }
        return beginStage(room, 'bonus');
      }
      log(room, `😕 ${nameOf(room, seat)} no puede usar el premio de ${amount}.`);
    }
    p.bonusAmount = null;
    if (p.die === 6) {
      log(room, `🎲 ${nameOf(room, seat)} sacó 6: ¡tira otra vez!`);
      return beginStage(room, 'roll');
    }
    nextSeat(room);
  }

  function nextSeat(room) {
    const p = P(room);
    if (!p || room.phase !== 'parchis') return;
    p.sixes = 0;
    p.die = null;
    p.bonus = [];
    p.bonusAmount = null;
    p.legal = [];
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
    log(room, `🏆 ¡${name} ganó el Parchís!`);
    systemMsg(room, `🏆 ¡${name} ganó el Parchís! (+${POINTS_WIN} puntos)`, 'success');
    io.to(room.code).emit('parchis:event', { kind: 'win', text: `¡${name} ganó el Parchís!`, id: seat.id });
    syncRoom(room);
    schedule(room, END_MS, () => {
      room.resultTitle = `🎲 ¡${name} ganó el Parchís!`;
      endGame(room);
    });
  }

  // ─── Vista (es igual para todos: en el Parchís no hay secretos) ───
  function view(room) {
    const p = P(room);
    if (!p) return null;
    return {
      arms: p.board.arms,
      seats: p.seats.map((s) => ({ id: s.id, arm: s.arm, color: COLORS[s.arm], pieces: s.pieces, gone: s.gone })),
      turn: p.turn,
      turnId: p.seats[p.turn]?.id,
      stage: p.stage,
      die: p.die,
      rollId: p.rollId,
      legal: p.legal.map((m) => ({ piece: m.piece, from: m.from, to: m.to, capture: Boolean(m.capture) })),
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
  function onMove(room, player, piece) {
    if (isTurn(room, player)) move(room, Number(piece));
  }

  // Desconexión: si era su turno, se juega solo en unos segundos.
  function onDisconnect(room, playerId) {
    const p = P(room);
    if (!p || room.phase !== 'parchis' || current(room).id !== playerId) return;
    if (p.stage === 'roll' || p.stage === 'move' || p.stage === 'bonus') {
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

  const seated = (room, playerId) => Boolean(P(room) && P(room).seats.some((s) => s.id === playerId && !s.gone));

  return { MAX_SEATS, COLORS, start, view, onRoll, onMove, onDisconnect, onLeave, seated };
};
