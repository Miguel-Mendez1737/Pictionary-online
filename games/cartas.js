'use strict';

// ─── 🃏 ¡Última! (juego de cartas de colores, estilo clásico) ────────────────
// Baraja de 108 cartas: 4 colores con un 0, dos de cada número del 1 al 9,
// dos "Salta", dos "Reversa" y dos "+2"; además 4 Comodines y 4 Comodines +4.
// Cada jugador recibe 7 cartas. En tu turno juegas una carta del mismo color o
// del mismo número/símbolo, o un comodín. Si no puedes (o no quieres), robas.
// Al quedarte con una carta debes tocar "¡Última!"; si se te olvida, cualquiera
// puede tocar "¡Te atrapé!" antes de que juegue el siguiente y robas 2.
// Gana quien se quede sin cartas. Puntos: ganar +30, atrapar a alguien +5.

const SPEED = Number(process.env.GAME_SPEED) > 0 ? Number(process.env.GAME_SPEED) : 1;

const COLORS = ['rojo', 'amarillo', 'verde', 'azul'];
const MAX_SEATS = 10;
const HAND = 7;
const RULES = [
  { id: 'stack', label: 'Acumular +2 y +4', desc: 'Si te tiran un +2 (o +4) y tienes otro, lo puedes poner encima y el siguiente roba la suma.', def: false },
  { id: 'drawUntil', label: 'Robar hasta poder jugar', desc: 'Si no puedes jugar, robas cartas hasta que salga una que sí puedas tirar.', def: false },
  { id: 'catchCall', label: '¡Última! obligatorio', desc: 'Al quedarte con una carta debes tocar "¡Última!". Si no, los demás pueden atraparte y robas 2.', def: true },
  { id: 'wild4Free', label: '+4 libre', desc: 'El +4 se puede tirar aunque tengas cartas del color en juego (si se apaga, solo cuando no tienes ese color).', def: true }
];
const RULE_IDS = new Set(RULES.map((r) => r.id));
const DEFAULT_RULES = RULES.filter((r) => r.def).map((r) => r.id);

const TURN_MS = 30000 / SPEED;
const AWAY_MS = 4000 / SPEED;
const END_MS = 4500 / SPEED;

const POINTS_WIN = 30;
const POINTS_CATCH = 5;

function newDeck() {
  const deck = [];
  let n = 0;
  const add = (color, value) => deck.push({ id: `c${n++}`, color, value });
  for (const color of COLORS) {
    add(color, '0');
    for (let k = 1; k <= 9; k++) { add(color, String(k)); add(color, String(k)); }
    for (const v of ['salta', 'reversa', '+2']) { add(color, v); add(color, v); }
  }
  for (let k = 0; k < 4; k++) { add('negro', 'comodin'); add('negro', '+4'); }
  return deck;
}
function shuffle(list) {
  const a = [...list];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

module.exports = function createCartas(h) {
  const { io, syncRoom, systemMsg, endGame } = h;

  const defaults = () => ({ cartasPlayers: 0, cartasRules: [...DEFAULT_RULES] });
  function applySettings(room, s) {
    const n = Number(s.cartasPlayers);
    if (Number.isInteger(n) && (n === 0 || (n >= 2 && n <= MAX_SEATS))) room.settings.cartasPlayers = n;
    if (Array.isArray(s.cartasRules)) room.settings.cartasRules = [...new Set(s.cartasRules.filter((r) => RULE_IDS.has(r)))];
  }

  const schedule = (room, ms, fn) => {
    clearTimeout(room.gameTimer);
    room.gameTimer = setTimeout(fn, ms);
  };
  const C = (room) => room.cartas;
  const has = (room, rule) => C(room).rules.has(rule);
  const current = (room) => C(room).seats[C(room).turn];
  const nameOf = (room, seat) => room.players.get(seat.id)?.name || 'Jugador';
  const top = (room) => C(room).discard[C(room).discard.length - 1];

  function log(room, text) {
    const c = C(room);
    c.log.push(text);
    if (c.log.length > 6) c.log.shift();
  }

  function draw(room, seat, count) {
    const c = C(room);
    const got = [];
    for (let k = 0; k < count; k++) {
      if (!c.deck.length) {
        // Se revuelve la pila de descarte (menos la carta de arriba).
        const keep = c.discard.pop();
        c.deck = shuffle(c.discard.map((card) => (card.value === 'comodin' || card.value === '+4' ? { ...card, color: 'negro' } : card)));
        c.discard = [keep];
        if (!c.deck.length) break;
      }
      const card = c.deck.pop();
      seat.hand.push(card);
      got.push(card);
    }
    if (seat.hand.length > 1) seat.called = false;
    return got;
  }

  function start(room) {
    const wanted = room.settings.cartasPlayers || MAX_SEATS;
    const ids = room.order.filter((id) => room.players.get(id)?.connected).slice(0, Math.min(wanted, MAX_SEATS));
    room.phase = 'cartas';
    room.cartas = {
      rules: new Set(room.settings.cartasRules),
      deck: shuffle(newDeck()),
      discard: [],
      seats: ids.map((id) => ({ id, hand: [], called: false, gone: false })),
      turn: 0,
      dir: 1,
      color: null,        // color activo (lo elige quien tira un comodín)
      pendingDraw: 0,     // cartas acumuladas por +2 / +4
      drewThisTurn: false,
      drawnCard: null,    // carta recién robada que se puede tirar
      catchable: null,    // { seatIdx } alguien quedó con 1 carta sin decir ¡Última!
      deadline: 0,
      winner: null,
      log: [],
      lastPlay: null,
      playId: 0
    };
    const c = C(room);
    c.seats.forEach((seat) => draw(room, seat, HAND));
    // Primera carta: un número (si sale otra cosa, vuelve a la baraja).
    let first = c.deck.pop();
    while (!/^\d$/.test(first.value)) { c.deck.unshift(first); first = c.deck.pop(); }
    c.discard.push(first);
    c.color = first.color;
    const watchers = room.order.length - ids.length;
    systemMsg(room, `🃏 ¡Comienza ¡Última!! ${ids.length} jugadores, 7 cartas cada uno.${watchers > 0 ? ' Los demás miran la partida.' : ''}`, 'success');
    beginTurn(room);
  }

  // ¿Se puede tirar esta carta?
  function canPlay(room, seat, card) {
    const c = C(room);
    const t = top(room);
    if (c.pendingDraw > 0) {
      // Con cartas acumuladas solo se puede responder con +2/+4 (si la regla lo permite).
      if (!has(room, 'stack')) return false;
      if (t.value === '+2') return card.value === '+2' || card.value === '+4';
      if (t.value === '+4') return card.value === '+4';
      return false;
    }
    if (card.value === 'comodin') return true;
    if (card.value === '+4') return has(room, 'wild4Free') || !seat.hand.some((x) => x.color === c.color);
    return card.color === c.color || card.value === t.value;
  }

  function beginTurn(room) {
    const c = C(room);
    if (!c || room.phase !== 'cartas') return;
    c.drewThisTurn = false;
    c.drawnCard = null;
    const seat = current(room);
    const player = room.players.get(seat.id);
    const wait = player && player.connected ? TURN_MS : AWAY_MS;
    c.deadline = Date.now() + wait;
    syncRoom(room);
    schedule(room, wait, () => autoPlay(room));
  }

  function nextIndex(room, from, steps = 1) {
    const c = C(room);
    let i = from;
    let moved = 0;
    while (moved < steps) {
      i = (i + c.dir + c.seats.length) % c.seats.length;
      if (!c.seats[i].gone) moved++;
    }
    return i;
  }

  // La siguiente persona actúa: ya no se puede atrapar a quien olvidó decir ¡Última!
  function closeCatch(room) { C(room).catchable = null; }

  function play(room, seat, cardId, chosenColor) {
    const c = C(room);
    const idx = seat.hand.findIndex((x) => x.id === cardId);
    if (idx === -1) return false;
    const card = seat.hand[idx];
    if (c.drewThisTurn && (!c.drawnCard || c.drawnCard.id !== cardId)) return false; // después de robar solo se puede tirar la carta robada
    if (!canPlay(room, seat, card)) return false;
    const isWild = card.value === 'comodin' || card.value === '+4';
    const color = isWild ? (COLORS.includes(chosenColor) ? chosenColor : favoriteColor(seat, card)) : card.color;
    closeCatch(room);
    seat.hand.splice(idx, 1);
    c.discard.push({ ...card, color: isWild ? color : card.color });
    c.color = color;
    c.playId++;
    c.lastPlay = { seat: c.turn, card: { ...card, color } };
    const name = nameOf(room, seat);

    // Se quedó con una carta: debe decir ¡Última!
    if (seat.hand.length === 1 && has(room, 'catchCall') && !seat.called) c.catchable = { seatIdx: c.turn };
    if (seat.hand.length !== 1) seat.called = false;

    if (!seat.hand.length) return finish(room, seat);

    let skip = 0;
    if (card.value === 'salta') { skip = 1; log(room, `⊘ ${name} hizo saltar al siguiente.`); }
    if (card.value === 'reversa') {
      c.dir *= -1;
      if (c.seats.filter((s) => !s.gone).length === 2) skip = 1;
      log(room, `⇄ ${name} cambió el sentido.`);
    }
    if (card.value === '+2' || card.value === '+4') {
      c.pendingDraw += card.value === '+2' ? 2 : 4;
      if (!has(room, 'stack')) {
        const victimIdx = nextIndex(room, c.turn);
        const victim = c.seats[victimIdx];
        draw(room, victim, c.pendingDraw);
        log(room, `😱 ${nameOf(room, victim)} roba ${c.pendingDraw} y pierde su turno.`);
        io.to(room.code).emit('cartas:event', { kind: 'draw', text: `${nameOf(room, victim)} roba ${c.pendingDraw}` });
        c.pendingDraw = 0;
        skip = 1;
      } else {
        log(room, `🔥 ${name} tiró ${card.value}: van ${c.pendingDraw} acumuladas.`);
      }
    }
    if (isWild) log(room, `🌈 ${name} eligió el color ${color}.`);
    c.turn = nextIndex(room, c.turn, 1 + skip);
    beginTurn(room);
    return true;
  }

  const favoriteColor = (seat, exclude) => {
    const counts = Object.fromEntries(COLORS.map((col) => [col, 0]));
    seat.hand.forEach((x) => { if (x !== exclude && counts[x.color] !== undefined) counts[x.color]++; });
    return COLORS.reduce((a, b) => (counts[b] > counts[a] ? b : a), COLORS[0]);
  };

  function drawAction(room, seat) {
    const c = C(room);
    closeCatch(room);
    const name = nameOf(room, seat);
    // Con cartas acumuladas: roba todas y pierde el turno.
    if (c.pendingDraw > 0) {
      draw(room, seat, c.pendingDraw);
      log(room, `😱 ${name} robó ${c.pendingDraw} cartas acumuladas.`);
      io.to(room.code).emit('cartas:event', { kind: 'draw', text: `${name} roba ${c.pendingDraw}` });
      c.pendingDraw = 0;
      c.turn = nextIndex(room, c.turn);
      return beginTurn(room);
    }
    if (c.drewThisTurn) return;
    c.drewThisTurn = true;
    let got = draw(room, seat, 1);
    if (has(room, 'drawUntil')) {
      let guard = 0;
      while (got.length && !canPlay(room, seat, got[got.length - 1]) && guard++ < 40) got = got.concat(draw(room, seat, 1));
    }
    const last = got[got.length - 1];
    c.drawnCard = last && canPlay(room, seat, last) ? last : null;
    log(room, `🂠 ${name} robó ${got.length === 1 ? 'una carta' : `${got.length} cartas`}.`);
    if (!c.drawnCard) {
      c.turn = nextIndex(room, c.turn);
      return beginTurn(room);
    }
    syncRoom(room);
  }

  function pass(room, seat) {
    const c = C(room);
    if (!c.drewThisTurn) return;
    closeCatch(room);
    log(room, `👉 ${nameOf(room, seat)} pasó.`);
    c.turn = nextIndex(room, c.turn);
    beginTurn(room);
  }

  // Si el jugador no actúa a tiempo, la app juega por él.
  function autoPlay(room) {
    const c = C(room);
    if (!c || room.phase !== 'cartas' || c.winner) return;
    const seat = current(room);
    if (seat.hand.length === 2 && has(room, 'catchCall')) seat.called = true; // la app dice ¡Última! por quien se fue
    const options = c.drewThisTurn ? (c.drawnCard ? [c.drawnCard] : []) : seat.hand.filter((x) => canPlay(room, seat, x));
    if (options.length) {
      const pick = options.find((x) => x.color !== 'negro') || options[0];
      return play(room, seat, pick.id, favoriteColor(seat, pick));
    }
    if (c.drewThisTurn) return pass(room, seat);
    drawAction(room, seat);
    if (C(room).drawnCard && current(room) === seat) {
      const card = C(room).drawnCard;
      play(room, seat, card.id, favoriteColor(seat, card));
    }
  }

  function finish(room, seat) {
    const c = C(room);
    c.winner = seat.id;
    clearTimeout(room.gameTimer);
    const player = room.players.get(seat.id);
    if (player) player.score += POINTS_WIN;
    const name = nameOf(room, seat);
    log(room, `🏆 ¡${name} se quedó sin cartas y ganó!`);
    systemMsg(room, `🏆 ¡${name} ganó ¡Última!! (+${POINTS_WIN} puntos)`, 'success');
    io.to(room.code).emit('cartas:event', { kind: 'win', text: `¡${name} ganó!`, id: seat.id });
    syncRoom(room);
    schedule(room, END_MS, () => {
      room.resultTitle = `🃏 ¡${name} ganó ¡Última!!`;
      endGame(room);
    });
    return true;
  }

  // ─── Vista: cada quien ve solo sus cartas ───
  function view(room, playerId) {
    const c = C(room);
    if (!c) return null;
    const mine = c.seats.find((s) => s.id === playerId);
    const myTurn = mine && current(room) === mine && !c.winner;
    return {
      seats: c.seats.map((s) => ({ id: s.id, count: s.hand.length, called: s.called, gone: s.gone })),
      turn: c.turn,
      turnId: current(room)?.id,
      dir: c.dir,
      top: top(room),
      color: c.color,
      deckCount: c.deck.length,
      pendingDraw: c.pendingDraw,
      hand: mine ? mine.hand : null,
      playable: myTurn ? (c.drewThisTurn ? (c.drawnCard ? [c.drawnCard.id] : []) : mine.hand.filter((x) => canPlay(room, mine, x)).map((x) => x.id)) : [],
      drew: myTurn ? c.drewThisTurn : false,
      canCall: Boolean(mine && has(room, 'catchCall') && !mine.called && (mine.hand.length === 1 || (myTurn && mine.hand.length === 2))),
      rules: [...c.rules],
      timeLeft: Math.max(0, c.deadline - Date.now()),
      winner: c.winner,
      log: c.log,
      playId: c.playId,
      lastPlay: c.lastPlay
    };
  }

  // ─── Acciones ───
  const mySeat = (room, player) => C(room) && C(room).seats.find((s) => s.id === player.id && !s.gone);
  const isTurn = (room, player) => C(room) && room.phase === 'cartas' && !C(room).winner && current(room).id === player.id;

  function onPlay(room, player, data) {
    if (!isTurn(room, player) || !data) return;
    const seat = current(room);
    if (!play(room, seat, String(data.card || ''), data.color)) {
      io.to(player.socketId).emit('cartas:msg', { ok: false, text: 'Esa carta no se puede tirar ahora.' });
    }
  }
  function onDraw(room, player) { if (isTurn(room, player)) drawAction(room, current(room)); }
  function onPass(room, player) { if (isTurn(room, player)) pass(room, current(room)); }

  // "¡Última!": se puede decir con 1 carta, o con 2 en tu turno antes de tirar.
  function onCall(room, player) {
    const c = C(room);
    const seat = mySeat(room, player);
    if (!seat || c.winner) return;
    if (seat.hand.length > 2 || (seat.hand.length === 2 && current(room) !== seat)) return;
    seat.called = true;
    if (c.catchable && c.seats[c.catchable.seatIdx] === seat) c.catchable = null;
    log(room, `📣 ¡${player.name} dijo "¡Última!"!`);
    io.to(room.code).emit('cartas:event', { kind: 'call', text: `¡${player.name}: ¡Última!!`, id: player.id });
    syncRoom(room);
  }

  // "¡Te atrapé!": la app revisa si de verdad alguien olvidó decir ¡Última!
  function onCatch(room, player) {
    const c = C(room);
    if (!c || c.winner) return;
    const reply = (ok, text) => io.to(player.socketId).emit('cartas:msg', { ok, text });
    const k = c.catchable;
    const offender = k && c.seats[k.seatIdx];
    if (!offender || offender.called || offender.hand.length !== 1) {
      c.catchable = null;
      return reply(false, 'Nadie olvidó decir "¡Última!".');
    }
    if (offender.id === player.id) return reply(false, '¡Mejor toca "¡Última!"! 😉');
    draw(room, offender, 2);
    c.catchable = null;
    const catcher = room.players.get(player.id);
    if (catcher) catcher.score += POINTS_CATCH;
    const name = nameOf(room, offender);
    log(room, `🚨 ¡${player.name} atrapó a ${name} sin decir "¡Última!"! Roba 2.`);
    io.to(room.code).emit('cartas:event', { kind: 'catch', text: `¡${player.name} atrapó a ${name}!` });
    syncRoom(room);
  }

  function onDisconnect(room, playerId) {
    const c = C(room);
    if (!c || room.phase !== 'cartas' || c.winner || current(room).id !== playerId) return;
    c.deadline = Date.now() + AWAY_MS;
    schedule(room, AWAY_MS, () => autoPlay(room));
  }

  // Un jugador salió: sus cartas vuelven a la baraja.
  function onLeave(room, playerId) {
    const c = C(room);
    if (!c || room.phase !== 'cartas') return;
    const seat = c.seats.find((s) => s.id === playerId);
    if (!seat || seat.gone) return;
    seat.gone = true;
    c.deck = shuffle(c.deck.concat(seat.hand));
    seat.hand = [];
    const active = c.seats.filter((s) => !s.gone);
    if (active.length === 1 && !c.winner) return finish(room, active[0]);
    if (current(room) === seat && !c.winner) {
      c.turn = nextIndex(room, c.turn);
      beginTurn(room);
    } else {
      syncRoom(room);
    }
  }

  return {
    MAX_SEATS, RULES, COLORS,
    defaults, applySettings, start, view,
    onPlay, onDraw, onPass, onCall, onCatch, onDisconnect, onLeave
  };
};
