// ─── 🃏 ONE: pantalla del juego de cartas ───────────────────────────────
// Cada quien ve solo sus cartas. Las que se pueden tirar se resaltan; al tocar
// un comodín se elige el color. "¡ONE!" y "¡Te atrapé!" los revisa el servidor.
window.CartasGame = function CartasGame(ctx) {
  'use strict';
  const { $, el, avatarEl, socket, state, toast, vibrate, sfx, speech, announce, gameOverCard } = ctx;

  const SYMBOL = { salta: '⊘', reversa: '⇄', '+2': '+2', '+4': '+4', comodin: '★' };
  const COLOR_NAME = { rojo: 'Rojo', amarillo: 'Amarillo', verde: 'Verde', azul: 'Azul' };
  const ui = { clock: 0, deadline: 0, lastPlayId: 0, lastTurnKey: null, pending: null };

  // Dibuja una carta (color + número o símbolo en el centro y en las esquinas).
  function cardEl(card, tag = 'div') {
    const node = el(tag, `ucard ${card.color}${card.value === 'comodin' || card.value === '+4' ? ' wild' : ''}`);
    const sym = SYMBOL[card.value] || card.value;
    node.append(el('span', 'uc-corner tl', sym), el('span', 'uc-oval'), el('span', 'uc-center', sym), el('span', 'uc-corner br', sym));
    node.setAttribute('aria-label', `${card.value === 'comodin' ? 'Comodín' : card.value === '+4' ? 'Comodín +4' : `${card.value} ${card.color}`}`);
    return node;
  }

  // ─── Botones ───
  $('#cartas-draw').addEventListener('click', () => { vibrate(10); socket.emit('cartas:draw'); });
  $('#cartas-deck').addEventListener('click', () => { if (!$('#cartas-draw').disabled) { vibrate(10); socket.emit('cartas:draw'); } });
  $('#cartas-pass').addEventListener('click', () => { vibrate(10); socket.emit('cartas:pass'); });
  $('#cartas-call').addEventListener('click', () => {
    vibrate([40, 30, 40]);
    sfx.beep(880, 0.15, 'triangle', 0.06);
    socket.emit('cartas:call');
  });
  $('#cartas-catch').addEventListener('click', () => {
    const b = $('#cartas-catch');
    if (b.disabled) return;
    b.disabled = true;
    vibrate(30);
    socket.emit('cartas:catch');
    setTimeout(() => { b.disabled = false; }, 2000);
  });

  // Selector de color para los comodines
  const picker = $('#cartas-picker');
  picker.querySelectorAll('[data-color]').forEach((b) => b.addEventListener('click', () => {
    const id = ui.pending;
    picker.classList.add('hidden');
    ui.pending = null;
    if (id) { vibrate(15); socket.emit('cartas:play', { card: id, color: b.dataset.color }); }
  }));
  $('#cartas-picker-cancel').addEventListener('click', () => { picker.classList.add('hidden'); ui.pending = null; });

  socket.on('cartas:msg', ({ ok, text }) => toast(text, ok ? 'success' : 'warn'));
  socket.on('cartas:event', (e) => {
    if (e.kind === 'draw') { vibrate([40, 30, 40]); sfx.beep(260, 0.15, 'sawtooth', 0.04); }
    if (e.kind === 'call') { toast(`📣 ${e.text}`, 'success'); sfx.beep(990, 0.15, 'triangle', 0.06); }
    if (e.kind === 'catch') { toast(`🚨 ${e.text}`, 'warn'); vibrate([80, 40, 80]); sfx.beep(200, 0.3, 'sawtooth', 0.05); }
    if (e.kind === 'win') {
      const pl = state.room && state.room.players.find((x) => x.id === e.id);
      announce(pl ? pl.avatar : null, e.id === state.me ? '🏆 ¡Ganaste!' : `🏆 ${e.text}`);
      sfx.win();
      speech.say(e.id === state.me ? '¡Ganaste!' : e.text);
    }
  });

  function render(room) {
    const overlay = $('#cartas-overlay');
    if (room.phase === 'gameOver') {
      clearInterval(ui.clock);
      picker.classList.add('hidden');
      overlay.innerHTML = '';
      if (room.ranking) overlay.append(gameOverCard(room));
      overlay.classList.remove('hidden');
      return;
    }
    overlay.classList.add('hidden');
    const c = room.cartas;
    if (!c) return;
    const playerOf = (id) => room.players.find((x) => x.id === id) || null;
    const myTurn = c.turnId === state.me && !c.winner;
    const seated = Boolean(c.hand);
    $('#cartas-sub').textContent = seated ? `Tienes ${c.hand.length} ${c.hand.length === 1 ? 'carta' : 'cartas'}` : '👀 Estás mirando la partida';

    // Rivales: avatar, cuántas cartas tienen y de quién es el turno
    const rivals = $('#cartas-rivals');
    rivals.innerHTML = '';
    c.seats.forEach((s, i) => {
      const pl = playerOf(s.id);
      const li = el('li', `rival${i === c.turn ? ' active' : ''}${s.gone ? ' gone' : ''}${s.id === state.me ? ' me' : ''}${pl && !pl.connected ? ' offline' : ''}`);
      li.append(avatarEl(pl ? pl.avatar : null, 'sm'), el('span', 'rival-name', s.id === state.me ? 'Tú' : (pl ? pl.name : 'Salió')));
      const count = el('span', `rival-count${s.count === 1 ? ' one' : ''}`, `🂠 ${s.count}`);
      li.append(count);
      if (s.called && s.count <= 1) li.append(el('span', 'rival-call', '📣'));
      rivals.append(li);
    });

    // Mesa: baraja, carta de arriba, color en juego y sentido
    $('#cartas-deck-count').textContent = c.deckCount;
    const topBox = $('#cartas-top');
    topBox.innerHTML = '';
    if (c.top) {
      const t = cardEl(c.top);
      if (c.playId !== ui.lastPlayId) { t.classList.add('just-played'); sfx.beep(520, 0.05, 'triangle', 0.04); }
      topBox.append(t);
    }
    ui.lastPlayId = c.playId;
    const colorEl = $('#cartas-color');
    colorEl.className = `cartas-color ${c.color}`;
    colorEl.textContent = COLOR_NAME[c.color] || '';
    $('#cartas-dir').textContent = c.dir === 1 ? '↻' : '↺';
    $('#cartas-table').style.setProperty('--play', `var(--uc-${c.color})`);

    // Estado del turno
    const cur = playerOf(c.turnId);
    const status = $('#cartas-status');
    status.innerHTML = '';
    if (cur) status.append(avatarEl(cur.avatar, 'xs'));
    let text;
    if (c.winner) text = '🏆 ¡Partida terminada!';
    else if (myTurn) {
      text = c.pendingDraw ? `🔥 ¡Te tiraron +${c.pendingDraw}! Responde con otro + o roba ${c.pendingDraw}.`
        : c.drew ? (c.playable.length ? '👉 Puedes tirar la carta que robaste o pasar.' : '👉 No te sirvió: pasa.')
        : c.playable.length ? '👉 ¡Tu turno! Toca una carta resaltada o roba.' : '👉 No tienes carta para tirar: roba una.';
    } else text = `Turno de ${cur ? cur.name : 'Jugador'}…`;
    status.append(el('span', 'cartas-status-text', text));
    const clockEl = el('span', 'parchis-clock');
    status.append(clockEl);
    ui.deadline = Date.now() + c.timeLeft;
    clearInterval(ui.clock);
    const tick = () => { clockEl.textContent = c.winner ? '' : `⏱️ ${Math.ceil(Math.max(0, ui.deadline - Date.now()) / 1000)}`; };
    tick();
    ui.clock = setInterval(tick, 500);
    const turnKey = `${c.turn}-${c.playId}`;
    if (myTurn && ui.lastTurnKey !== turnKey) { vibrate([50, 40, 50]); sfx.beep(784, 0.1, 'triangle', 0.05); }
    ui.lastTurnKey = turnKey;

    // Botones
    const drawBtn = $('#cartas-draw');
    drawBtn.hidden = !seated;
    drawBtn.disabled = !myTurn || (c.drew && !c.pendingDraw);
    drawBtn.textContent = c.pendingDraw && myTurn ? `🂠 Robar ${c.pendingDraw}` : '🂠 Robar';
    $('#cartas-pass').hidden = !(myTurn && c.drew);
    $('#cartas-call').hidden = !c.canCall;
    const someoneForgot = c.rules.includes('catchCall') && c.seats.some((s) => s.id !== state.me && !s.gone && s.count === 1 && !s.called);
    $('#cartas-catch').hidden = !someoneForgot || c.winner;

    // Mi mano (ordenada por color y número)
    const hand = $('#cartas-hand');
    hand.innerHTML = '';
    if (seated) {
      const order = { rojo: 0, amarillo: 1, verde: 2, azul: 3, negro: 4 };
      const playable = new Set(c.playable);
      [...c.hand].sort((a, z) => (order[a.color] - order[z.color]) || String(a.value).localeCompare(String(z.value), 'es', { numeric: true }))
        .forEach((card) => {
          const b = cardEl(card, 'button');
          b.type = 'button';
          const can = playable.has(card.id);
          b.classList.toggle('playable', can);
          b.classList.toggle('dim', myTurn && !can);
          b.addEventListener('click', () => {
            if (!can) { if (myTurn) toast('Esa carta no coincide en color ni en número.', 'warn'); return; }
            if (card.value === 'comodin' || card.value === '+4') {
              ui.pending = card.id;
              picker.classList.remove('hidden');
              return;
            }
            vibrate(15);
            socket.emit('cartas:play', { card: card.id });
          });
          hand.append(b);
        });
    }

    const log = $('#cartas-log');
    log.innerHTML = '';
    c.log.slice(-4).reverse().forEach((t, i) => log.append(el('li', i === 0 ? 'latest' : null, t)));
  }

  return { render };
};
