// ─── ✋ Basta / Stop: pantalla del juego ─────────────────────────────────────
// Fases que manda el servidor (room.basta.sub):
//   letter → writing → stopping → collecting → review → results → (siguiente ronda)
// Las respuestas se envían mientras se escribe (con una pequeña espera) y otra
// vez cuando el servidor las pide al cerrar la ronda.
window.BastaGame = function BastaGame(ctx) {
  'use strict';
  const { $, el, avatarEl, socket, state, vibrate, sfx, speech, announce, renderPlayerList, gameOverCard, clockText } = ctx;

  const body = $('#basta-body');
  const ui = {
    roundKey: null,     // ronda para la que se armó el formulario
    view: null,         // 'letter' | 'form' | 'review' | 'results'
    inputs: [],
    stopBtn: null,
    banner: null,
    sendTimer: 0,
    shuffleTimer: 0,
    deadline: 0,
    total: 0,
    clock: 0,
    lastBeep: null
  };

  const LETTERS = 'ABCDEFGHIJLMNOPRSTUV';
  const strip = (s) => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();
  const values = () => ui.inputs.map((i) => i.value.trim());

  function sendAnswers() {
    clearTimeout(ui.sendTimer);
    if (ui.inputs.length) socket.emit('basta:answers', values());
  }
  socket.on('basta:collect', sendAnswers);

  socket.on('basta:called', ({ id, name, avatar }) => {
    const mine = id === state.me;
    announce(avatar, mine ? '✋ ¡Dijiste BASTA!' : `✋ ¡${name} dijo BASTA!`);
    vibrate([120, 60, 120]);
    sfx.beep(440, 0.25, 'sawtooth', 0.06);
    speech.say(mine ? '¡Basta!' : `¡${name} dijo basta!`);
  });

  // ─── Cronómetro (barra superior) ───
  function startClock(b) {
    ui.deadline = Date.now() + b.timeLeft;
    ui.total = b.total || b.timeLeft || 1;
    clearInterval(ui.clock);
    tickClock();
    ui.clock = setInterval(tickClock, 250);
  }
  function tickClock() {
    const b = state.room && state.room.basta;
    const left = Math.max(0, ui.deadline - Date.now());
    const s = Math.ceil(left / 1000);
    const bar = $('#basta-bar');
    const timed = b && (b.sub === 'writing' || b.sub === 'review' || b.sub === 'stopping');
    bar.classList.toggle('active', Boolean(timed));
    if (!timed) return;
    const total = b.sub === 'stopping' ? 3000 : ui.total;
    $('#basta-bar-fill').style.width = `${Math.min(100, (left / total) * 100)}%`;
    $('#basta-bar-text').textContent = b.sub === 'stopping' ? `✋ Se cierra en ${s}…` : `⏱️ ${clockText(s)}`;
    bar.classList.toggle('urgent', b.sub === 'stopping' || (b.sub === 'writing' && s <= 10));
    bar.classList.toggle('warn', b.sub === 'writing' && s <= 30 && s > 10);
    const count = b.sub === 'stopping' && ui.banner && ui.banner.querySelector('b');
    if (count) count.textContent = String(Math.max(1, s));
    if ((b.sub === 'writing' && s <= 5) || b.sub === 'stopping') {
      if (s > 0 && s !== ui.lastBeep) { ui.lastBeep = s; sfx.beep(s === 1 ? 1320 : 880, 0.09, 'square', 0.05); }
    }
  }

  // ─── Letra: animación "ruleta de letras" ───
  function showLetterSpin(b) {
    if (ui.view === 'letter' && ui.roundKey === b.round) return;
    ui.view = 'letter';
    ui.roundKey = b.round;
    ui.inputs = [];
    body.innerHTML = '';
    const card = el('div', 'card basta-spin');
    const big = el('div', 'basta-spin-letter', '?');
    card.append(el('p', 'muted', `Ronda ${b.round} de ${b.rounds}`), big, el('p', 'basta-spin-caption', 'Sorteando la letra…'));
    body.append(card);
    clearInterval(ui.shuffleTimer);
    ui.shuffleTimer = setInterval(() => {
      big.textContent = LETTERS[Math.floor(Math.random() * LETTERS.length)];
      sfx.tick();
    }, 90);
  }

  // ─── Formulario con las categorías ───
  function buildForm(b) {
    clearInterval(ui.shuffleTimer);
    ui.view = 'form';
    ui.roundKey = b.round;
    body.innerHTML = '';
    const form = el('form', 'card basta-form');
    form.autocomplete = 'off';
    form.addEventListener('submit', (e) => e.preventDefault());
    ui.banner = el('div', 'basta-banner');
    ui.banner.hidden = true;
    form.append(ui.banner);
    ui.inputs = b.cats.map((c, i) => {
      const row = el('label', 'basta-row');
      const label = el('span', 'basta-cat');
      label.append(el('span', 'basta-cat-emoji', c.emoji), el('span', null, c.label));
      const input = el('input');
      input.type = 'text';
      input.maxLength = 30;
      input.placeholder = `${b.letter}…`;
      input.autocapitalize = 'words';
      input.spellcheck = false;
      input.setAttribute('autocorrect', 'off');
      input.enterKeyHint = i === b.cats.length - 1 ? 'done' : 'next';
      if (b.mine && b.mine[i]) input.value = b.mine[i];
      const mark = el('span', 'basta-mark');
      input.addEventListener('input', () => {
        updateRow(input, mark, b.letter);
        updateStop();
        clearTimeout(ui.sendTimer);
        ui.sendTimer = setTimeout(sendAnswers, 350);
      });
      input.addEventListener('keydown', (e) => {
        if (e.key !== 'Enter') return;
        e.preventDefault();
        const next = ui.inputs[i + 1];
        if (next) next.focus(); else input.blur();
      });
      updateRow(input, mark, b.letter);
      row.append(label, input, mark);
      form.append(row);
      return input;
    });
    ui.stopBtn = el('button', 'btn btn-basta btn-lg', '✋ ¡BASTA!');
    ui.stopBtn.type = 'button';
    ui.stopBtn.addEventListener('click', () => {
      if (ui.stopBtn.disabled) return;
      vibrate(30);
      socket.emit('basta:stop', values());
    });
    form.append(ui.stopBtn, el('p', 'muted small center', 'Llena todas las categorías para poder decir ¡Basta!'));
    body.append(form);
    if (!('ontouchstart' in window) && ui.inputs[0]) ui.inputs[0].focus();
    updateStop();
  }

  function updateRow(input, mark, letter) {
    const v = strip(input.value);
    const ok = v.length >= 2 && v[0] === letter.toLowerCase();
    const bad = v.length >= 1 && v[0] !== letter.toLowerCase();
    mark.textContent = ok ? '✅' : bad ? '⚠️' : '';
    mark.title = bad ? `Debe empezar con ${letter}` : '';
    input.classList.toggle('bad', bad);
  }

  function updateStop() {
    const b = state.room && state.room.basta;
    if (!ui.stopBtn || !b) return;
    const full = ui.inputs.every((i) => i.value.trim());
    ui.stopBtn.disabled = b.sub !== 'writing' || !full;
  }

  function updateForm(b) {
    const locked = b.sub === 'collecting';
    ui.inputs.forEach((i) => { i.disabled = locked; });
    updateStop();
    ui.banner.hidden = b.sub === 'writing';
    if (b.sub === 'stopping') {
      ui.banner.innerHTML = '';
      const who = b.stopper ? (b.stopper.id === state.me ? '¡Dijiste BASTA!' : `¡${b.stopper.name} dijo BASTA!`) : '⏰ ¡Se acabó el tiempo!';
      ui.banner.append(el('span', null, `✋ ${who} Termina tu respuesta… `), el('b', null, '3'));
    } else if (locked) {
      ui.banner.textContent = '📥 Juntando las respuestas…';
    }
    if (locked && document.activeElement && ui.inputs.includes(document.activeElement)) document.activeElement.blur();
  }

  // ─── Revisión: todas las respuestas, votos y puntos ───
  // ✅ aceptada · ❌ no aceptada
  const VALID = new Set(['ok', 'verified', 'approved', 'unverified']);
  const REASONS = {
    empty: 'Sin respuesta',
    letter: 'No empieza con la letra',
    invalid: 'No parece una palabra (si sí vale, voten 👍)',
    rejected: 'Anulada por votos 👎',
    unverified: 'No está en el diccionario de la app, pero se acepta (si no vale, voten 👎)',
    verified: 'Reconocida por la app',
    approved: 'Aprobada por votos 👍'
  };
  const markOf = (status) => (VALID.has(status) ? '✅' : '❌');
  function renderReview(b) {
    clearInterval(ui.shuffleTimer);
    ui.view = b.sub;
    ui.inputs = [];
    body.innerHTML = '';
    const players = state.room.players;
    const name = (id) => (players.find((p) => p.id === id) || {}).name || 'Jugador';
    const avatar = (id) => (players.find((p) => p.id === id) || {}).avatar;

    if (b.sub === 'results' && b.results) {
      const card = el('div', 'card basta-results');
      card.append(el('h3', null, `🏅 Puntos de la ronda ${b.round} · Letra ${b.results.letter}`));
      const ul = el('ul', 'gains');
      b.results.gains.forEach((g) => {
        const li = el('li');
        li.append(avatarEl(g.avatar, 'sm'), el('span', 'gain-name', g.name), el('strong', 'gain-pts', `+${g.points}`));
        ul.append(li);
      });
      card.append(ul, el('p', 'muted small center', b.round >= b.rounds ? 'Última ronda: ¡ahora el podio!' : 'La siguiente letra sale en unos segundos…'));
      body.append(card);
    } else {
      const tip = el('p', 'basta-tip muted small', '✅ aceptada · ❌ no aceptada. La app solo rechaza sola las que no empiezan con la letra o no parecen palabra (estas se rescatan con 👍). Si una aceptada no vale, toquen 👎. Decide la mayoría de los demás.');
      body.append(tip);
    }

    b.cats.forEach((c, ci) => {
      const card = el('section', 'card basta-review');
      card.append(el('h3', null, `${c.emoji} ${c.label}`));
      const ul = el('ul', 'basta-answers');
      (b.review[ci] || []).forEach((cell) => {
        const li = el('li', `basta-answer ${cell.status}`);
        if (cell.id === state.me) li.classList.add('mine');
        li.append(el('span', `basta-mark-big ${VALID.has(cell.status) ? 'yes' : 'no'}`, markOf(cell.status)));
        li.append(avatarEl(avatar(cell.id), 'xs'));
        const info = el('div', 'basta-answer-info');
        info.append(el('span', 'basta-answer-name', name(cell.id)), el('span', 'basta-answer-text', cell.text || '—'));
        if (cell.status !== 'ok') info.append(el('span', `basta-answer-why ${VALID.has(cell.status) ? 'good' : ''}`, REASONS[cell.status]));
        li.append(info);
        li.append(el('strong', `basta-points${cell.points ? '' : ' zero'}`, `+${cell.points}`));
        const canVote = b.sub === 'review' && cell.id !== state.me && cell.text && !['letter', 'empty'].includes(cell.status);
        if (canVote) {
          const votes = el('div', 'vote-group');
          const mk = (type, icon, count) => {
            const on = cell.myVote === type;
            const btn = el('button', `vote-btn ${type}${on ? ' on' : ''}`, `${icon} ${count}/${cell.needed}`);
            btn.type = 'button';
            btn.title = type === 'up' ? 'Sí vale' : 'No vale';
            btn.setAttribute('aria-pressed', String(on));
            btn.addEventListener('click', () => { vibrate(8); socket.emit('basta:vote', { id: cell.id, cat: ci, type }); });
            return btn;
          };
          // ❌ "no parece una palabra" se rescata con 👍; las aceptadas se pueden anular con 👎.
          if (cell.status === 'invalid' || (cell.status === 'approved' && cell.ups)) votes.append(mk('up', '👍', cell.ups));
          if (cell.status !== 'invalid') votes.append(mk('down', '👎', cell.downs));
          li.append(votes);
        }
        ul.append(li);
      });
      if (!(b.review[ci] || []).length) ul.append(el('li', 'muted small', 'Nadie respondió.'));
      card.append(ul);
      body.append(card);
    });

    if (b.sub === 'review') {
      const foot = el('div', 'basta-foot');
      const done = (b.ready || []).includes(state.me);
      const btn = el('button', 'btn btn-primary btn-lg', done ? '✅ Listo · esperando a los demás' : '✅ Listo, ya revisé');
      btn.type = 'button';
      btn.disabled = done;
      btn.addEventListener('click', () => { vibrate(10); socket.emit('basta:ready'); });
      const waiting = state.room.players.filter((p) => p.connected && !(b.ready || []).includes(p.id)).map((p) => p.name);
      foot.append(btn, el('p', 'muted small center', waiting.length ? `Faltan: ${waiting.join(', ')}` : ''));
      body.append(foot);
    }
  }

  // ─── Jugadores con su avance (cuántas categorías llevan) ───
  function renderPlayers(room) {
    const b = room.basta;
    const list = $('#basta-players');
    renderPlayerList(list, room, { scores: true });
    if (!b || !b.progress) return;
    b.progress.forEach((p) => {
      const li = list.querySelector(`[data-id="${CSS.escape(p.id)}"]`);
      if (!li) return;
      const full = p.filled >= b.cats.length;
      li.classList.toggle('guessed', full);
      li.append(el('span', `basta-progress${full ? ' full' : ''}`, `${p.filled}/${b.cats.length}`));
    });
  }

  function render(room) {
    const overlay = $('#basta-overlay');
    if (room.phase === 'gameOver') {
      clearInterval(ui.clock);
      clearInterval(ui.shuffleTimer);
      ui.roundKey = null;
      ui.view = null;
      ui.inputs = [];
      renderPlayerList($('#basta-players'), room, { scores: true });
      overlay.innerHTML = '';
      if (room.ranking) overlay.append(gameOverCard(room));
      overlay.classList.remove('hidden');
      return;
    }
    overlay.classList.add('hidden');
    const b = room.basta;
    if (!b) return;
    $('#basta-round').textContent = `Ronda ${b.round}/${b.rounds}`;
    const letterEl = $('#basta-letter');
    letterEl.textContent = b.letter || '?';
    letterEl.classList.toggle('pending', !b.letter);
    renderPlayers(room);
    startClock(b);

    if (b.sub === 'letter') return showLetterSpin(b);
    if (['writing', 'stopping', 'collecting'].includes(b.sub)) {
      if (ui.view !== 'form' || ui.roundKey !== b.round) {
        buildForm(b);
        if (b.sub === 'writing') { sfx.win(); vibrate([40, 30, 40]); speech.say(`Letra ${b.letter}`); }
      }
      return updateForm(b);
    }
    // Revisión y resultados: se redibuja con cada voto. Se conserva el scroll.
    const y = window.scrollY;
    renderReview(b);
    window.scrollTo(0, y);
  }

  return { render };
};
