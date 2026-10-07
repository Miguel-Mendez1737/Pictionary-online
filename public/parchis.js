// ─── 🎲 Parchís: tablero SVG, dado y fichas ──────────────────────────────────
// Hasta 4 jugadores: tablero clásico (4 brazos de 3×8 alrededor de la meta).
// 5 o 6 jugadores: tablero hexagonal de 6 brazos. Las posiciones se calculan
// igual para los dos: cada brazo sale del centro en su propio ángulo.
window.ParchisGame = function ParchisGame(ctx) {
  'use strict';
  const { $, el, avatarEl, socket, state, toast, vibrate, sfx, speech, announce, gameOverCard } = ctx;

  const NS = 'http://www.w3.org/2000/svg';
  const ARM_COLORS = ['#f5b700', '#2f6fdf', '#e03131', '#2f9e44', '#f76707', '#7048e8'];
  const ARM = 17;
  const board = $('#parchis-board');
  const dieBtn = $('#parchis-die');
  const ui = { builtFor: 0, pieces: new Map(), rollId: 0, rolling: false, rollTimer: 0, clock: 0, deadline: 0, lastTurnKey: null };
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

  // ─── Geometría (4 o 6 brazos) ───
  function geometry(arms) {
    const track = arms * ARM;
    const ap = 1.5 / Math.tan(Math.PI / arms);        // distancia del centro al borde de la meta
    const size = arms === 4 ? 19 : 22;
    const C = [size / 2, size / 2];
    const angle = (a) => -Math.PI / 2 + (a * 2 * Math.PI) / arms;
    const u = (a) => [Math.cos(angle(a)), Math.sin(angle(a))];   // hacia afuera del brazo
    const v = (a) => [-Math.sin(angle(a)), Math.cos(angle(a))];  // a lo ancho del brazo
    // Casilla del brazo a: k = 0 (junto a la meta) … 7 (punta); s = -1, 0, 1 (columna)
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
    // Casa del brazo a: entre su brazo y el siguiente.
    function home(a) {
      const b = (a + 1) % arms;
      const corner = add(C, mul(u(a), ap), mul(v(a), 1.5));
      if (arms === 4) {
        const center = add(corner, mul(u(a), 4), mul(u(b), 4));
        return { center, poly: [corner, add(corner, mul(u(a), 8)), add(corner, mul(u(a), 8), mul(u(b), 8)), add(corner, mul(u(b), 8))], r: 2.9, spot: 1.2, ua: u(a), ub: u(b) };
      }
      const w = [Math.cos(angle(a) + Math.PI / arms), Math.sin(angle(a) + Math.PI / arms)];
      return { center: add(C, mul(w, 8.2)), r: 2.35, spot: 0.95, ua: u(a), ub: u(b) };
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
        const da = i % 2 ? h.spot : -h.spot;
        const db = i < 2 ? -h.spot : h.spot;
        const f = arms === 4 ? 1 : 0.8;
        return add(h.center, mul(h.ua, -db * f), mul(h.ub, da * f));
      }
    };
  }

  function pieceCenter(arm, steps, i) {
    if (steps < 0) return G.homeSpot(arm, i);
    if (steps >= G.goal) return G.goalSpot(arm, i);
    if (steps > G.lastTrack) return G.corridorCenter(arm, steps - G.lastTrack);
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

    // Casas
    G.homes.forEach((h, a) => {
      if (h.poly) {
        // tablero clásico: cuadrado de color en la esquina (un poco más chico que el hueco)
        const shrink = h.poly.map((p) => add(h.center, mul(add(p, mul(h.center, -1)), 0.86)));
        board.append(svg('polygon', { points: pts(shrink), fill: ARM_COLORS[a], 'stroke-linejoin': 'round', stroke: ARM_COLORS[a], 'stroke-width': 0.6 }));
      } else {
        board.append(svg('circle', { cx: h.center[0], cy: h.center[1], r: h.r + 0.25, fill: ARM_COLORS[a] }));
      }
      board.append(svg('circle', { cx: h.center[0], cy: h.center[1], r: h.poly ? h.r : h.r - 0.35, fill: '#fff', opacity: 0.92 }));
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

    // Pasillos
    for (let a = 0; a < arms; a++) {
      for (let k = 1; k <= 7; k++) board.append(square(G.corridorCenter(a, k), a, mix(ARM_COLORS[a], 0.25)));
    }

    // Meta: un triángulo por color
    for (let a = 0; a < arms; a++) {
      const tri = [G.C, add(G.C, mul(G.u(a), G.ap), mul(G.v(a), -1.5)), add(G.C, mul(G.u(a), G.ap), mul(G.v(a), 1.5))];
      board.append(svg('polygon', { points: pts(tri), fill: ARM_COLORS[a], stroke: '#fff', 'stroke-width': 0.06 }));
    }
    const goal = svg('text', { x: G.C[0], y: G.C[1] + 0.35, 'font-size': 0.9, 'text-anchor': 'middle' });
    goal.textContent = '🏁';
    board.append(goal);

    ui.layer = svg('g', { class: 'pc-layer' });
    board.append(ui.layer);
    ui.pieces = new Map();
    ui.builtFor = arms;
  }

  // ─── Fichas ───
  function renderPieces(p, myTurn) {
    const seen = new Set();
    const legalFrom = new Map(); // posición -> ficha que el servidor acepta
    if (myTurn && (p.stage === 'move' || p.stage === 'bonus')) p.legal.forEach((m) => legalFrom.set(m.from, m.piece));

    // Fichas apiladas en la misma casilla del circuito se separan un poco.
    const stacks = new Map();
    p.seats.forEach((seat, si) => {
      if (seat.gone) return;
      seat.pieces.forEach((steps, i) => {
        if (steps < 0 || steps >= G.goal) return;
        const [x, y] = pieceCenter(seat.arm, steps, i);
        const key = `${x},${y}`;
        if (!stacks.has(key)) stacks.set(key, []);
        stacks.get(key).push(`${si}-${i}`);
      });
    });

    p.seats.forEach((seat, si) => {
      seat.pieces.forEach((steps, i) => {
        const id = `${si}-${i}`;
        if (seat.gone) return;
        seen.add(id);
        let [x, y] = pieceCenter(seat.arm, steps, i);
        const stack = stacks.get(`${x},${y}`);
        if (stack && stack.length > 1) x += stack.indexOf(id) === 0 ? -0.2 : 0.2;
        let g = ui.pieces.get(id);
        if (!g) {
          g = svg('g', { class: 'pc' });
          const small = steps >= G.goal;
          g.append(
            svg('circle', { class: 'pc-ring', r: 0.62 }),
            svg('circle', { class: 'pc-body', r: 0.38, fill: seat.color.hex, filter: 'url(#pc-shadow)' }),
            svg('circle', { class: 'pc-shine', r: 0.17, cy: -0.06, fill: 'rgba(255,255,255,.45)' }),
            svg('circle', { class: 'pc-hit', r: 0.6, fill: 'transparent' })
          );
          if (small) g.classList.add('small');
          g.addEventListener('click', () => {
            const piece = Number(g.dataset.move);
            if (!g.classList.contains('can-move') || Number.isNaN(piece)) return;
            vibrate(12);
            sfx.beep(660, 0.06, 'triangle', 0.05);
            socket.emit('parchis:move', piece);
          });
          ui.layer.append(g);
          ui.pieces.set(id, g);
        }
        g.style.transform = `translate(${x}px, ${y}px)`;
        g.classList.toggle('small', steps >= G.goal);
        const can = legalFrom.has(steps);
        g.classList.toggle('can-move', can);
        if (can) g.dataset.move = String(legalFrom.get(steps)); else delete g.dataset.move;
      });
    });
    for (const [id, g] of ui.pieces) {
      if (!seen.has(id)) { g.remove(); ui.pieces.delete(id); }
    }
    // Las fichas que se pueden mover quedan encima de las demás.
    ui.layer.querySelectorAll('.pc.can-move').forEach((g) => ui.layer.append(g));
  }

  // ─── Dado ───
  const PIPS = { 1: [5], 2: [1, 9], 3: [1, 5, 9], 4: [1, 3, 7, 9], 5: [1, 3, 5, 7, 9], 6: [1, 3, 4, 6, 7, 9] };
  function drawDie(n) {
    dieBtn.innerHTML = '';
    const face = el('span', 'die-face');
    for (let cell = 1; cell <= 9; cell++) {
      const dot = el('i');
      if (n && PIPS[n].includes(cell)) dot.className = 'on';
      face.append(dot);
    }
    if (!n) face.append(el('b', 'die-q', '🎲'));
    dieBtn.append(face);
  }
  dieBtn.addEventListener('click', () => {
    if (dieBtn.disabled) return;
    dieBtn.disabled = true;
    vibrate(15);
    socket.emit('parchis:roll');
  });

  function animateRoll(final, done) {
    ui.rolling = true;
    dieBtn.classList.add('rolling');
    let n = 0;
    clearInterval(ui.rollTimer);
    ui.rollTimer = setInterval(() => {
      drawDie(1 + Math.floor(Math.random() * 6));
      sfx.tick();
      if (++n >= 7) {
        clearInterval(ui.rollTimer);
        ui.rolling = false;
        dieBtn.classList.remove('rolling');
        drawDie(final);
        if (final === 6) sfx.beep(990, 0.12, 'triangle', 0.06);
        done();
      }
    }, 70);
  }

  // ─── Eventos ───
  socket.on('parchis:event', (e) => {
    if (e.kind === 'capture') { vibrate([60, 40, 60]); sfx.beep(220, 0.2, 'sawtooth', 0.05); toast(`🍽️ ${e.text}`, 'warn'); }
    if (e.kind === 'goal') { sfx.beep(880, 0.12, 'triangle', 0.06); toast(`🏁 ${e.text}`, 'success'); }
    if (e.kind === 'win') {
      const p = state.room && state.room.players.find((x) => x.id === e.id);
      announce(p ? p.avatar : null, e.id === state.me ? '🏆 ¡Ganaste el Parchís!' : `🏆 ${e.text}`);
      sfx.win();
      speech.say(e.id === state.me ? '¡Ganaste el parchís!' : e.text);
    }
  });

  function stageText(p, seat, me) {
    const name = seat && seat.name;
    if (p.stage === 'over') return '🏆 ¡Partida terminada!';
    if (!me) {
      if (p.stage === 'roll') return `Turno de ${name}: va a tirar el dado…`;
      if (p.stage === 'bonus') return `${name} usa su premio de ${p.bonusAmount} casillas…`;
      return `${name} está moviendo…`;
    }
    if (p.stage === 'roll') return '👉 ¡Te toca! Toca el dado para tirar.';
    if (p.stage === 'move') return p.legal.length > 1 ? `👉 Sacaste ${p.die}: toca la ficha que quieres mover.` : `Sacaste ${p.die}: moviendo tu ficha…`;
    if (p.stage === 'bonus') return p.legal.length > 1 ? `🎁 Premio: elige una ficha para avanzar ${p.bonusAmount}.` : `🎁 Premio: avanzas ${p.bonusAmount}…`;
    return `Sacaste ${p.die}.`;
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
    $('#parchis-sub').textContent = mySeat ? `Juegas con ${mySeat.color.name.toLowerCase()}` : '👀 Estás mirando la partida';

    // Turno actual
    const turn = $('#parchis-turn');
    turn.innerHTML = '';
    turn.parentElement.style.setProperty('--seat', cur ? cur.color.hex : '#999');
    if (curPlayer) turn.append(avatarEl(curPlayer.avatar, 'sm'));
    const txt = el('div', 'parchis-turn-text');
    txt.append(
      el('strong', null, cur ? (myTurn ? 'Tu turno' : `${curPlayer ? curPlayer.name : 'Jugador'} · ${cur.color.name}`) : ''),
      el('span', 'small', stageText(p, { name: curPlayer ? curPlayer.name : 'Jugador' }, myTurn))
    );
    turn.append(txt);
    ui.clockEl = el('span', 'parchis-clock');
    turn.append(ui.clockEl);
    ui.deadline = Date.now() + p.timeLeft;
    clearInterval(ui.clock);
    const tickClock = () => {
      const s = Math.ceil(Math.max(0, ui.deadline - Date.now()) / 1000);
      ui.clockEl.textContent = p.stage === 'roll' || ((p.stage === 'move' || p.stage === 'bonus') && p.legal.length > 1) ? `⏱️ ${s}` : '';
    };
    tickClock();
    ui.clock = setInterval(tickClock, 500);

    // Aviso al empezar mi turno
    const turnKey = `${p.turn}-${p.rollId}-${p.stage}`;
    if (myTurn && p.stage === 'roll' && ui.lastTurnKey !== turnKey) { vibrate([50, 40, 50]); sfx.beep(784, 0.1, 'triangle', 0.05); }
    ui.lastTurnKey = turnKey;

    // Dado: se anima cuando llega una tirada nueva y después se mueven las fichas.
    dieBtn.style.setProperty('--seat', cur ? cur.color.hex : '#999');
    dieBtn.disabled = !(myTurn && p.stage === 'roll');
    dieBtn.classList.toggle('ready', !dieBtn.disabled);
    const piecesNow = () => renderPieces(p, myTurn);
    if (p.rollId !== ui.rollId && p.die) {
      ui.rollId = p.rollId;
      animateRoll(p.die, piecesNow);
      if (myTurn) dieBtn.disabled = true;
    } else {
      if (!ui.rolling) drawDie(p.stage === 'roll' ? null : p.die);
      piecesNow();
    }
    ui.rollId = p.rollId;

    // Historial
    const log = $('#parchis-log');
    log.innerHTML = '';
    p.log.slice(-4).reverse().forEach((t, i) => log.append(el('li', i === 0 ? 'latest' : null, t)));

    // Jugadores: color, fichas en meta y puntos
    const list = $('#parchis-players');
    list.innerHTML = '';
    p.seats.forEach((s, i) => {
      const pl = playerOf(s.id);
      const li = el('li', `seat${i === p.turn && p.stage !== 'over' ? ' active' : ''}${s.gone ? ' gone' : ''}${pl && !pl.connected ? ' offline' : ''}`);
      li.style.setProperty('--seat', s.color.hex);
      const home = s.pieces.filter((x) => x >= G.goal).length;
      li.append(el('span', 'seat-dot'), avatarEl(pl ? pl.avatar : null, 'xs'),
        el('span', 'seat-name', `${pl ? pl.name : 'Salió'}${s.id === state.me ? ' (tú)' : ''}`),
        el('span', 'seat-goal', `🏁 ${home}/4`),
        el('span', 'seat-pts', `${pl ? pl.score : 0} pts`));
      list.append(li);
    });
    const watchers = room.players.filter((x) => !p.seats.some((s) => s.id === x.id));
    if (watchers.length) list.append(el('li', 'muted small', `👀 Mirando: ${watchers.map((w) => w.name).join(', ')}`));
  }

  drawDie(null);
  return { render };
};
