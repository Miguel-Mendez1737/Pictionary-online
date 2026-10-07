// ─── 🎲 Parchís / Parqués: tablero SVG, dados y fichas ──────────────────────
// Hasta 4 jugadores: tablero clásico (4 brazos de 3×8 alrededor del cielo).
// De 5 a 10: un brazo por jugador alrededor de un cielo con tantos lados como
// jugadores. Las posiciones se calculan igual para todos: cada brazo sale del
// centro en su propio ángulo.
window.ParchisGame = function ParchisGame(ctx) {
  'use strict';
  const { $, el, avatarEl, socket, state, toast, vibrate, sfx, speech, announce, gameOverCard } = ctx;

  const NS = 'http://www.w3.org/2000/svg';
  const ARM_COLORS = ['#f5b700', '#2f6fdf', '#e03131', '#2f9e44', '#f76707', '#7048e8', '#e64980', '#0c8599', '#8d5524', '#495057'];
  const ARM = 17;
  const board = $('#parchis-board');
  const diceBox = $('#parchis-die');
  const ui = { builtFor: 0, pieces: new Map(), rollId: 0, rolling: false, rollTimer: 0, clock: 0, deadline: 0, lastTurnKey: null, selDie: 0, layer: null };
  let G = null; // geometría del tablero actual

  const svg = (tag, attrs = {}) => {
    const n = document.createElementNS(NS, tag);
    for (const [k, v] of Object.entries(attrs)) n.setAttribute(k, v);
    return n;
  };
  const mix = (hex, t) => {
    const n = parseInt(hex.slice(1), 16);
    const c = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) => Math.round(v + (255 - v) * t));
    return `rgb(${c.join(',')})`;
  };
  const add = (...vs) => vs.reduce((a, b) => [a[0] + b[0], a[1] + b[1]], [0, 0]);
  const mul = (v, k) => [v[0] * k, v[1] * k];
  const pts = (list) => list.map((p) => p.map((n) => n.toFixed(3)).join(',')).join(' ');

  // ─── Geometría (4 a 10 brazos) ───
  function geometry(arms) {
    const track = arms * ARM;
    const ap = 1.5 / Math.tan(Math.PI / arms);        // distancia del centro al borde del cielo
    const half = Math.PI / arms;
    const homeDist = ap + 6.2;
    const homeR = Math.min(2.4, homeDist * Math.sin(half) - 1.75);
    const reach = Math.max(Math.hypot(ap + 8, 1.5), homeDist + homeR + 0.3) + 0.3;
    const size = arms === 4 ? 19 : Math.ceil(reach * 2 * 10) / 10;
    const C = [size / 2, size / 2];
    const angle = (a) => -Math.PI / 2 + (a * 2 * Math.PI) / arms;
    const u = (a) => [Math.cos(angle(a)), Math.sin(angle(a))];   // hacia afuera del brazo
    const v = (a) => [-Math.sin(angle(a)), Math.cos(angle(a))];  // a lo ancho del brazo
    // Casilla del brazo a: k = 0 (junto al cielo) … 7 (punta); s = -1, 0, 1 (columna)
    const cell = (a, k, s) => add(C, mul(u(a), ap + 0.5 + k), mul(v(a), s));
    const exitOf = (arm) => (arm * ARM + 13) % track;
    const entryOf = (arm) => arm * ARM + 8;
    const safe = new Set();
    for (let a = 0; a < arms; a++) { safe.add(entryOf(a)); safe.add(exitOf(a)); safe.add((entryOf(a) + 12) % track); }

    function trackCenter(abs) {
      const a = Math.floor(abs / ARM);
      const j = abs % ARM;
      return j < 8 ? cell(a, j, -1) : j === 8 ? cell(a, 7, 0) : cell(a, 16 - j, 1);
    }
    // Casa (cárcel) del brazo a: entre su brazo y el siguiente.
    function home(a) {
      const b = (a + 1) % arms;
      const corner = add(C, mul(u(a), ap), mul(v(a), 1.5));
      if (arms === 4) {
        const center = add(corner, mul(u(a), 4), mul(u(b), 4));
        return { center, poly: [corner, add(corner, mul(u(a), 8)), add(corner, mul(u(a), 8), mul(u(b), 8)), add(corner, mul(u(b), 8))], r: 2.9, spot: 1.2, ua: u(a), ub: u(b) };
      }
      const w = [Math.cos(angle(a) + half), Math.sin(angle(a) + half)];
      return { center: add(C, mul(w, homeDist)), r: homeR, spot: Math.min(1.05, homeR * 0.5), angle: angle(a) + half };
    }
    const homes = Array.from({ length: arms }, (_, a) => home(a));
    return {
      arms, track, size, C, ap, u, v, cell, safe, exitOf, homes, trackCenter,
      lastTrack: track - 5,
      goal: track + 3,
      corridorCenter: (a, k) => cell(a, 7 - k, 0),          // k = 1 … 7
      goalSpot: (a, i) => add(C, mul(u(a), ap * 0.55), mul(v(a), (i - 1.5) * 0.42)),
      homeSpot: (a, i) => {
        const h = homes[a];
        if (h.poly) {
          const da = i % 2 ? h.spot : -h.spot;
          const db = i < 2 ? -h.spot : h.spot;
          return add(h.center, mul(h.ua, -db), mul(h.ub, da));
        }
        const phi = h.angle + Math.PI / 4 + (i * Math.PI) / 2;
        return add(h.center, [Math.cos(phi) * h.spot, Math.sin(phi) * h.spot]);
      }
    };
  }

  // Posición de una ficha. lane = pasillo por el que sube (el propio o uno robado).
  function pieceCenter(arm, steps, i, lane) {
    if (steps < 0) return G.homeSpot(arm, i);
    if (steps >= G.goal) return G.goalSpot(lane === null || lane === undefined ? arm : lane, i);
    if (steps > G.lastTrack) return G.corridorCenter(lane === null || lane === undefined ? arm : lane, steps - G.lastTrack);
    return G.trackCenter((G.exitOf(arm) + steps) % G.track);
  }

  const square = (center, a, fill) => {
    const hu = mul(G.u(a), 0.5);
    const hv = mul(G.v(a), 0.5);
    return svg('polygon', {
      points: pts([add(center, hu, hv), add(center, hu, mul(hv, -1)), add(center, mul(hu, -1), mul(hv, -1)), add(center, mul(hu, -1), hv)]),
      fill, stroke: '#cbbfa6', 'stroke-width': 0.04
    });
  };

  // ─── Tablero fijo (se dibuja cuando cambia la cantidad de brazos) ───
  function buildBoard(arms) {
    G = geometry(arms);
    board.setAttribute('viewBox', `0 0 ${G.size} ${G.size}`);
    board.innerHTML = '';
    const defs = svg('defs');
    defs.innerHTML = '<filter id="pc-shadow" x="-50%" y="-50%" width="200%" height="200%"><feDropShadow dx="0" dy=".08" stdDeviation=".06" flood-opacity=".45"/></filter>';
    board.append(defs);
    board.append(svg('rect', { x: 0, y: 0, width: G.size, height: G.size, rx: 0.6, fill: '#fffaf0' }));

    // Cárceles
    G.homes.forEach((h, a) => {
      if (h.poly) {
        const shrink = h.poly.map((p) => add(h.center, mul(add(p, mul(h.center, -1)), 0.86)));
        board.append(svg('polygon', { points: pts(shrink), fill: ARM_COLORS[a], 'stroke-linejoin': 'round', stroke: ARM_COLORS[a], 'stroke-width': 0.6 }));
        board.append(svg('circle', { cx: h.center[0], cy: h.center[1], r: h.r, fill: '#fff', opacity: 0.92 }));
      } else {
        board.append(svg('circle', { cx: h.center[0], cy: h.center[1], r: h.r + 0.25, fill: ARM_COLORS[a] }));
        board.append(svg('circle', { cx: h.center[0], cy: h.center[1], r: h.r - 0.3, fill: '#fff', opacity: 0.92 }));
      }
    });

    // Circuito
    for (let abs = 0; abs < G.track; abs++) {
      const c = G.trackCenter(abs);
      const a = Math.floor(abs / ARM);
      const exitArm = Array.from({ length: arms }, (_, i) => i).find((i) => G.exitOf(i) === abs);
      const fill = exitArm !== undefined ? mix(ARM_COLORS[exitArm], 0.45) : G.safe.has(abs) ? '#e9ecef' : '#ffffff';
      board.append(square(c, a, fill));
      if (G.safe.has(abs)) {
        const star = svg('text', { x: c[0], y: c[1] + 0.2, 'font-size': 0.55, 'text-anchor': 'middle', opacity: 0.55 });
        star.textContent = '⭐';
        board.append(star);
      }
    }

    // Pasillos hacia el cielo
    for (let a = 0; a < arms; a++) {
      for (let k = 1; k <= 7; k++) board.append(square(G.corridorCenter(a, k), a, mix(ARM_COLORS[a], 0.25)));
    }

    // Cielo: un triángulo por color
    for (let a = 0; a < arms; a++) {
      const tri = [G.C, add(G.C, mul(G.u(a), G.ap), mul(G.v(a), -1.5)), add(G.C, mul(G.u(a), G.ap), mul(G.v(a), 1.5))];
      board.append(svg('polygon', { points: pts(tri), fill: ARM_COLORS[a], stroke: '#fff', 'stroke-width': 0.06 }));
    }
    const goal = svg('text', { x: G.C[0], y: G.C[1] + 0.35, 'font-size': 0.9, 'text-anchor': 'middle' });
    goal.textContent = '☁️';
    board.append(goal);

    ui.layer = svg('g', { class: 'pc-layer' });
    board.append(ui.layer);
    // El tablero se dibuja en espejo para que las fichas avancen en contra de
    // las manecillas del reloj, como en el juego de mesa.
    const mirror = svg('g', { transform: `translate(${G.size} 0) scale(-1 1)` });
    [...board.childNodes].filter((n) => n.nodeName !== 'defs').forEach((n) => mirror.append(n));
    board.append(mirror);
    ui.pieces = new Map();
    ui.builtFor = arms;
  }

  // ─── Jugadas del dado elegido ───
  // Con 2 dados se elige primero el dado (tocándolo) y después la ficha.
  function movesFor(p) {
    if (p.stage === 'crown') return p.legal;
    if (p.stage === 'bonus') return p.legal;
    const dice = [...new Set(p.legal.map((m) => m.die))];
    if (!dice.includes(ui.selDie)) ui.selDie = dice.length ? dice[0] : 0;
    return p.legal.filter((m) => m.die === ui.selDie);
  }

  // ─── Fichas ───
  function renderPieces(p, myTurn) {
    const seen = new Set();
    // posición -> jugada que acepta el servidor (se prefiere robar cielo si se puede)
    const legalAt = new Map();
    if (myTurn && ['move', 'bonus', 'crown'].includes(p.stage)) {
      movesFor(p).forEach((m) => {
        const seat = p.seats.find((s) => s.id === state.me);
        const lane = seat ? seat.lanes[m.piece] : null;
        const key = `${m.from}|${lane}`;
        const prev = legalAt.get(key);
        if (!prev || m.kind === 'steal') legalAt.set(key, m);
      });
    }

    // Fichas apiladas en la misma casilla se separan un poco.
    const stacks = new Map();
    const posOf = new Map();
    p.seats.forEach((seat, si) => {
      if (seat.gone) return;
      seat.pieces.forEach((steps, i) => {
        const [x, y] = pieceCenter(seat.arm, steps, i, seat.lanes[i]);
        posOf.set(`${si}-${i}`, [x, y]);
        if (steps < 0 || steps >= G.goal) return;
        const key = `${x.toFixed(2)},${y.toFixed(2)}`;
        if (!stacks.has(key)) stacks.set(key, []);
        stacks.get(key).push(`${si}-${i}`);
      });
    });

    p.seats.forEach((seat, si) => {
      if (seat.gone) return;
      seat.pieces.forEach((steps, i) => {
        const id = `${si}-${i}`;
        seen.add(id);
        let [x, y] = posOf.get(id);
        const stack = stacks.get(`${x.toFixed(2)},${y.toFixed(2)}`);
        if (stack && stack.length > 1) {
          const k = stack.indexOf(id);
          if (stack.length === 2) x += k ? 0.2 : -0.2;
          else { x += (k % 2 ? 0.22 : -0.22); y += (k < 2 ? -0.22 : 0.22) + (k >= 4 ? 0.2 : 0); }
        }
        let g = ui.pieces.get(id);
        if (!g) {
          g = svg('g', { class: 'pc' });
          g.append(
            svg('circle', { class: 'pc-ring', r: 0.62 }),
            svg('circle', { class: 'pc-body', r: 0.38, fill: seat.color.hex, filter: 'url(#pc-shadow)' }),
            svg('circle', { class: 'pc-shine', r: 0.17, cy: -0.06, fill: 'rgba(255,255,255,.45)' }),
            svg('circle', { class: 'pc-hit', r: 0.6, fill: 'transparent' })
          );
          g.addEventListener('click', () => {
            if (!g.classList.contains('can-move') || !g._move) return;
            const m = g._move;
            vibrate(12);
            sfx.beep(660, 0.06, 'triangle', 0.05);
            socket.emit('parchis:move', { piece: m.piece, die: m.die, kind: m.kind });
          });
          ui.layer.append(g);
          ui.pieces.set(id, g);
        }
        g.style.transform = `translate(${x}px, ${y}px)`;
        g.classList.toggle('small', steps >= G.goal);
        const mine = seat.id === state.me;
        const m = mine ? legalAt.get(`${steps}|${seat.lanes[i]}`) : null;
        g.classList.toggle('can-move', Boolean(m));
        g.classList.toggle('steal', Boolean(m && m.kind === 'steal'));
        g._move = m || null;
      });
    });
    for (const [id, g] of ui.pieces) {
      if (!seen.has(id)) { g.remove(); ui.pieces.delete(id); }
    }
    ui.layer.querySelectorAll('.pc.can-move').forEach((g) => ui.layer.append(g));
  }

  // ─── Dados ───
  const PIPS = { 1: [5], 2: [1, 9], 3: [1, 5, 9], 4: [1, 3, 7, 9], 5: [1, 3, 5, 7, 9], 6: [1, 3, 4, 6, 7, 9] };
  function face(n) {
    const f = el('span', 'die-face');
    for (let c = 1; c <= 9; c++) {
      const dot = el('i');
      if (n && PIPS[n].includes(c)) dot.className = 'on';
      f.append(dot);
    }
    if (!n) f.append(el('b', 'die-q', '🎲'));
    return f;
  }

  // values: lo que muestra cada dado; opts.canRoll / opts.pick (índices elegibles)
  function drawDice(values, opts = {}) {
    diceBox.innerHTML = '';
    values.forEach((n, i) => {
      const b = el('button', 'die');
      b.type = 'button';
      b.append(face(n));
      if (opts.canRoll) {
        b.classList.add('ready');
        b.setAttribute('aria-label', 'Tirar los dados');
        b.addEventListener('click', () => {
          diceBox.querySelectorAll('.die').forEach((d) => { d.disabled = true; d.classList.remove('ready'); });
          vibrate(15);
          socket.emit('parchis:roll');
        });
      } else if (opts.pick && opts.pick.has(i)) {
        b.classList.add('pickable');
        if (opts.selected === i) b.classList.add('selected');
        b.setAttribute('aria-label', `Usar el dado de ${n}`);
      } else {
        b.disabled = true;
        if (opts.used && opts.used.has(i)) b.classList.add('used');
      }
      diceBox.append(b);
    });
  }

  function animateRoll(final, done) {
    ui.rolling = true;
    let n = 0;
    clearInterval(ui.rollTimer);
    ui.rollTimer = setInterval(() => {
      drawDice(final.map(() => 1 + Math.floor(Math.random() * 6)));
      diceBox.querySelectorAll('.die').forEach((d) => d.classList.add('rolling'));
      sfx.tick();
      if (++n >= 7) {
        clearInterval(ui.rollTimer);
        ui.rolling = false;
        if (final.length === 2 ? final[0] === final[1] : final[0] === 6) sfx.beep(990, 0.12, 'triangle', 0.06);
        done();
      }
    }, 70);
  }

  // ─── Eventos ───
  socket.on('parchis:event', (e) => {
    if (e.kind === 'capture') { vibrate([60, 40, 60]); sfx.beep(220, 0.2, 'sawtooth', 0.05); toast(`🍽️ ${e.text}`, 'warn'); }
    if (e.kind === 'goal') { sfx.beep(880, 0.12, 'triangle', 0.06); toast(`👑 ${e.text}`, 'success'); }
    if (e.kind === 'win') {
      const pl = state.room && state.room.players.find((x) => x.id === e.id);
      announce(pl ? pl.avatar : null, e.id === state.me ? '🏆 ¡Ganaste!' : `🏆 ${e.text}`);
      sfx.win();
      speech.say(e.id === state.me ? '¡Ganaste!' : e.text);
    }
  });

  function stageText(p, name, me, moves) {
    const two = p.dice === 2;
    const shown = (p.roll || []).join(' y ');
    if (p.stage === 'over') return '🏆 ¡Partida terminada!';
    if (!me) {
      if (p.stage === 'roll') return `Turno de ${name}: va a tirar ${two ? 'los dados' : 'el dado'}…`;
      if (p.stage === 'crown') return `👑 ${name} sacó tres seguidos y elige qué ficha coronar…`;
      if (p.stage === 'bonus') return `${name} usa su premio de ${p.bonusAmount} casillas…`;
      if (p.stage === 'wait') return `${name} sacó ${shown}.`;
      if (p.legal.some((m) => m.kind === 'back')) return `🐾 ¡Pata de perro! ${name} retrocede 3…`;
      return `${name} está moviendo (${shown})…`;
    }
    if (p.stage === 'roll') return `👉 ¡Te toca! Toca ${two ? 'los dados' : 'el dado'} para tirar.`;
    if (p.stage === 'crown') return '👑 ¡Tres seguidos! Toca la ficha que quieres coronar.';
    if (p.stage === 'bonus') return moves.length > 1 ? `🎁 Premio: elige una ficha para avanzar ${p.bonusAmount}.` : `🎁 Premio: avanzas ${p.bonusAmount}…`;
    if (p.stage === 'move' && p.legal.some((m) => m.kind === 'back')) {
      return p.legal.length > 1 ? '🐾 ¡Pata de perro! (2 y 1): toca la ficha que retrocede 3 casillas.' : '🐾 ¡Pata de perro! Tu ficha retrocede 3…';
    }
    if (p.stage === 'move') {
      const steal = moves.some((m) => m.kind === 'steal') ? ' 🌩️ ¡Puedes robar el cielo!' : '';
      if (p.legal.some((m) => m.kind === 'release') && p.pending.length === 2) {
        return `🔓 Sacaste pares (${shown}): toca una ficha de la cárcel para sacarlas, o mueve un ${p.pending[0]} con una ficha y el otro con otra.${steal}`;
      }
      if (two && p.pending.length === 2 && p.pending[0] !== p.pending[1]) return `👉 Sacaste ${shown}: toca un dado y luego la ficha.${steal}`;
      const amount = p.pending[ui.selDie] ?? p.pending[0];
      return p.legal.length > 1 ? `👉 Mueve ${amount}: toca la ficha.${steal}` : `Moviendo ${amount}…`;
    }
    return `Sacaste ${shown}.`;
  }

  function renderRules(p) {
    const box = $('#parchis-game-rules');
    const info = state.parchisInfo;
    if (!box || !info) return;
    const key = p.rules.join(',');
    if (box.dataset.key === key) return;
    box.dataset.key = key;
    const list = box.querySelector('ul');
    list.innerHTML = '';
    info.rules.filter((r) => p.rules.includes(r.id)).forEach((r) => {
      const li = el('li');
      li.append(el('strong', null, r.label), el('span', 'muted small', ` · ${r.desc}`));
      list.append(li);
    });
    box.querySelector('summary').textContent = `📋 Reglas de esta partida (${p.dice === 2 ? '2 dados' : '1 dado'} · ${p.pieceCount} fichas)`;
  }

  function render(room) {
    const overlay = $('#parchis-overlay');
    if (room.phase === 'gameOver') {
      overlay.innerHTML = '';
      if (room.ranking) overlay.append(gameOverCard(room));
      overlay.classList.remove('hidden');
      return;
    }
    overlay.classList.add('hidden');
    const p = room.parchis;
    if (!p) return;
    if (ui.builtFor !== (p.arms || 4)) buildBoard(p.arms || 4);

    const playerOf = (id) => room.players.find((x) => x.id === id) || null;
    const cur = p.seats[p.turn];
    const curPlayer = cur && playerOf(cur.id);
    const myTurn = cur && cur.id === state.me && p.stage !== 'over';
    const mySeat = p.seats.find((s) => s.id === state.me);
    $('#parchis-title').textContent = p.dice === 2 ? '🎲🎲 Parqués' : '🎲 Parchís';
    $('#parchis-sub').textContent = mySeat ? `Juegas con ${mySeat.color.name.toLowerCase()}` : '👀 Estás mirando la partida';
    const moves = myTurn ? movesFor(p) : [];

    // Turno actual
    const turn = $('#parchis-turn');
    turn.innerHTML = '';
    turn.parentElement.style.setProperty('--seat', cur ? cur.color.hex : '#999');
    if (curPlayer) turn.append(avatarEl(curPlayer.avatar, 'sm'));
    const txt = el('div', 'parchis-turn-text');
    const name = curPlayer ? curPlayer.name : 'Jugador';
    txt.append(
      el('strong', null, cur ? (myTurn ? 'Tu turno' : `${name} · ${cur.color.name}`) : ''),
      el('span', 'small', stageText(p, name, myTurn, moves))
    );
    turn.append(txt);
    ui.clockEl = el('span', 'parchis-clock');
    turn.append(ui.clockEl);
    ui.deadline = Date.now() + p.timeLeft;
    clearInterval(ui.clock);
    const tickClock = () => {
      const s = Math.ceil(Math.max(0, ui.deadline - Date.now()) / 1000);
      const waiting = p.stage === 'roll' || p.stage === 'crown' || ((p.stage === 'move' || p.stage === 'bonus') && p.legal.length > 1);
      ui.clockEl.textContent = waiting ? `⏱️ ${s}` : '';
    };
    tickClock();
    ui.clock = setInterval(tickClock, 500);

    const turnKey = `${p.turn}-${p.rollId}-${p.stage}`;
    if (myTurn && p.stage === 'roll' && ui.lastTurnKey !== turnKey) { vibrate([50, 40, 50]); sfx.beep(784, 0.1, 'triangle', 0.05); }
    ui.lastTurnKey = turnKey;

    // Dados: se animan con cada tirada nueva; después se eligen y se mueven las fichas.
    diceBox.style.setProperty('--seat', cur ? cur.color.hex : '#999');
    const count = p.dice || 1;
    const showDice = () => {
      if (p.stage === 'roll') return drawDice(Array(count).fill(null), { canRoll: myTurn });
      const values = p.roll && p.roll.length ? p.roll : Array(count).fill(null);
      // Qué dados quedan sin usar (índices de la tirada que siguen en "pending").
      const left = [...p.pending];
      const unused = new Map();
      values.forEach((v, i) => {
        const k = left.indexOf(v);
        if (k !== -1) { unused.set(i, k); left.splice(k, 1); }
      });
      const used = new Set(values.map((_v, i) => i).filter((i) => !unused.has(i)));
      const pick = new Set();
      let selected = null;
      if (myTurn && p.stage === 'move') {
        const usable = new Set(p.legal.map((m) => m.die));
        for (const [i, k] of unused) {
          if (usable.has(k)) pick.add(i);
          if (k === ui.selDie && selected === null) selected = i;
        }
        // Si los dos dados tienen el mismo valor no hace falta elegir.
        if (pick.size === 2 && p.pending[0] === p.pending[1]) pick.clear();
      }
      // Un clic en el dado elige su índice en "pending".
      drawDice(values, { pick, selected, used });
      diceBox.querySelectorAll('.die.pickable').forEach((b, n) => {
        const i = [...pick][n];
        b.onclick = () => { ui.selDie = unused.get(i); vibrate(8); render(state.room); };
      });
    };
    const piecesNow = () => renderPieces(p, myTurn);
    if (p.rollId !== ui.rollId && p.roll && p.roll.length) {
      ui.rollId = p.rollId;
      ui.selDie = 0;
      animateRoll(p.roll, () => { showDice(); piecesNow(); });
    } else {
      if (!ui.rolling) showDice();
      piecesNow();
    }
    ui.rollId = p.rollId;

    // Historial
    const log = $('#parchis-log');
    log.innerHTML = '';
    p.log.slice(-4).reverse().forEach((t, i) => log.append(el('li', i === 0 ? 'latest' : null, t)));
    renderRules(p);

    // Jugadores: color, fichas coronadas y puntos
    const list = $('#parchis-players');
    list.innerHTML = '';
    p.seats.forEach((s, i) => {
      const pl = playerOf(s.id);
      const li = el('li', `seat${i === p.turn && p.stage !== 'over' ? ' active' : ''}${s.gone ? ' gone' : ''}${pl && !pl.connected ? ' offline' : ''}`);
      li.style.setProperty('--seat', s.color.hex);
      const done = s.pieces.filter((x) => x >= G.goal).length;
      li.append(el('span', 'seat-dot'), avatarEl(pl ? pl.avatar : null, 'xs'),
        el('span', 'seat-name', `${pl ? pl.name : 'Salió'}${s.id === state.me ? ' (tú)' : ''}`),
        el('span', 'seat-goal', `👑 ${done}/${s.pieces.length}`),
        el('span', 'seat-pts', `${pl ? pl.score : 0} pts`));
      list.append(li);
    });
    const watchers = room.players.filter((x) => !p.seats.some((s) => s.id === x.id));
    if (watchers.length) list.append(el('li', 'muted small', `👀 Mirando: ${watchers.map((w) => w.name).join(', ')}`));
  }

  return { render };
};
