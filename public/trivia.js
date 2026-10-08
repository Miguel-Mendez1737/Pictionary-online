// ─── ❓ Trivia: pantalla del juego ───────────────────────────────────────────
// Fases que manda el servidor (room.trivia.sub): ready → question → reveal → …
// La respuesta correcta solo llega en "reveal", así nadie puede verla antes.
window.TriviaGame = function TriviaGame(ctx) {
  'use strict';
  const { $, el, avatarEl, socket, state, vibrate, sfx, speech, announce, renderPlayerList, gameOverCard } = ctx;

  const body = $('#trivia-body');
  const SHAPES = ['▲', '◆', '●', '■'];
  const ui = { key: null, deadline: 0, total: 1, clock: 0, lastBeep: null, buttons: [], waitEl: null };

  // Banderas: se precargan y, si una imagen falla, se reintenta y luego se
  // muestra la bandera en emoji (la letra del país en "letras regionales").
  const preloaded = new Set();
  function preload(list) {
    (list || []).forEach((src) => {
      if (preloaded.has(src)) return;
      preloaded.add(src);
      const img = new Image();
      img.src = src;
    });
  }
  const emojiFlag = (src) => {
    const m = /flags\/([a-z]{2})\./.exec(src || '');
    return m ? [...m[1].toUpperCase()].map((ch) => String.fromCodePoint(0x1f1e6 + ch.charCodeAt(0) - 65)).join('') : '🏳️';
  };
  function flagImg(src, className, alt) {
    const img = el('img', className);
    img.alt = alt;
    img.draggable = false;
    img.decoding = 'async';
    let tries = 0;
    img.addEventListener('error', () => {
      // 1) reintenta en PNG (por si el celular no muestra WebP) · 2) emoji de la bandera
      if (tries++ === 0) { img.src = src.replace(/\.webp$/, '.png'); return; }
      const span = el('span', `${className} flag-emoji`, emojiFlag(src));
      span.setAttribute('role', 'img');
      span.setAttribute('aria-label', alt);
      img.replaceWith(span);
    });
    img.src = src;
    return img;
  }

  const catInfo = (id) => ((state.triviaInfo && state.triviaInfo.categories) || []).find((c) => c.id === id) || { emoji: '❓', label: 'Trivia' };

  socket.on('trivia:fastest', ({ id, name, avatar, ms }) => {
    const secs = (ms / 1000).toFixed(1);
    announce(avatar, id === state.me ? `⚡ ¡Fuiste el más rápido! (${secs} s)` : `⚡ ${name} fue el más rápido (${secs} s)`);
  });

  // ─── Cronómetro ───
  function startClock(t) {
    ui.deadline = Date.now() + t.timeLeft;
    ui.total = t.sub === 'question' ? t.time * 1000 : t.timeLeft || 1;
    clearInterval(ui.clock);
    tick();
    ui.clock = setInterval(tick, 200);
  }
  function tick() {
    const t = state.room && state.room.trivia;
    const bar = $('#trivia-bar');
    if (!t) return;
    const left = Math.max(0, ui.deadline - Date.now());
    const s = Math.ceil(left / 1000);
    const asking = t.sub === 'question';
    bar.classList.toggle('active', asking);
    if (!asking) return;
    $('#trivia-bar-fill').style.width = `${Math.min(100, (left / ui.total) * 100)}%`;
    $('#trivia-bar-text').textContent = `⏱️ ${s}`;
    bar.classList.toggle('urgent', s <= 5);
    bar.classList.toggle('warn', s <= 10 && s > 5);
    if (s <= 5 && s > 0 && s !== ui.lastBeep && t.myChoice === null) { ui.lastBeep = s; sfx.beep(s === 1 ? 1320 : 880, 0.08, 'square', 0.04); }
  }

  // ─── Pregunta ───
  function buildQuestion(t) {
    const q = t.question;
    body.innerHTML = '';
    const card = el('section', 'card trivia-q');
    const cat = catInfo(q.cat);
    card.append(el('span', 'trivia-chip', `${cat.emoji} ${cat.label}`));
    if (q.image) card.append(flagImg(q.image, 'trivia-flag', 'Bandera'));
    if (q.emoji) card.append(el('div', 'trivia-emoji', q.emoji));
    card.append(el('h2', 'trivia-text', q.text));
    body.append(card);

    const grid = el('div', `trivia-options${q.options.some((o) => o.image) ? ' images' : ''}`);
    ui.buttons = q.options.map((o, i) => {
      const b = el('button', `trivia-opt opt-${i}`);
      b.type = 'button';
      b.append(el('span', 'opt-shape', SHAPES[i]));
      if (o.image) {
        b.append(flagImg(o.image, 'opt-flag', `Opción ${i + 1}`));
      } else {
        b.append(el('span', 'opt-text', o.text));
      }
      b.append(el('span', 'opt-count'));
      b.addEventListener('click', () => {
        const cur = state.room && state.room.trivia;
        if (!cur || cur.sub !== 'question' || cur.myChoice !== null) return;
        vibrate(15);
        sfx.beep(700, 0.06, 'triangle', 0.05);
        cur.myChoice = i; // respuesta inmediata en pantalla
        socket.emit('trivia:answer', i);
        paint(cur);
      });
      grid.append(b);
      return b;
    });
    body.append(grid);
    ui.waitEl = el('p', 'trivia-wait muted center');
    body.append(ui.waitEl);
    if (t.index === 0 || t.sub === 'question') speech.say(q.text);
  }

  // Colores y estados de las opciones según la fase.
  function paint(t) {
    const r = t.result;
    ui.buttons.forEach((b, i) => {
      b.disabled = t.sub !== 'question' || t.myChoice !== null;
      b.classList.toggle('picked', t.myChoice === i);
      b.classList.toggle('dim', t.sub === 'question' && t.myChoice !== null && t.myChoice !== i);
      b.classList.toggle('right', Boolean(r && r.correct === i));
      b.classList.toggle('wrong', Boolean(r && r.correct !== i && t.myChoice === i));
      b.classList.toggle('faded', Boolean(r && r.correct !== i && t.myChoice !== i));
      b.querySelector('.opt-count').textContent = r ? `${r.counts[i]} ${r.counts[i] === 1 ? 'voto' : 'votos'}` : '';
    });
    const players = state.room.players.filter((p) => p.connected);
    if (t.sub === 'question') {
      ui.waitEl.textContent = t.myChoice !== null
        ? `✅ Respuesta enviada · esperando a los demás (${t.answered.length}/${players.length})`
        : `👆 Toca tu respuesta · ${t.answered.length}/${players.length} ya respondieron`;
    }
  }

  function renderReveal(t) {
    const r = t.result;
    const old = body.querySelector('.trivia-result');
    if (old) old.remove();
    const box = el('section', 'card trivia-result');
    const mine = r.gains.find((g) => g.id === state.me);
    const answered = t.myChoice !== null;
    box.append(el('h3', `trivia-verdict ${mine ? 'ok' : 'bad'}`,
      mine ? `🎉 ¡Correcto! +${mine.points}${mine.fastest ? ' ⚡' : ''}` : answered ? '❌ Incorrecto' : '⏰ No respondiste'));
    if (r.gains.length) {
      const ul = el('ul', 'gains');
      r.gains.forEach((g) => {
        const li = el('li');
        li.append(avatarEl(g.avatar, 'sm'), el('span', 'gain-name', `${g.name}${g.fastest ? ' ⚡' : ''}`), el('span', 'muted small', `${(g.ms / 1000).toFixed(1)} s`), el('strong', 'gain-pts', `+${g.points}`));
        ul.append(li);
      });
      box.append(ul);
    } else {
      box.append(el('p', 'muted center', 'Nadie acertó esta vez 😅'));
    }
    box.append(el('p', 'muted small center', t.index + 1 >= t.total ? '¡Última pregunta! Ahora el podio…' : 'Siguiente pregunta en unos segundos…'));
    body.append(box);
    if (ui.waitEl) ui.waitEl.textContent = '';
    if (mine) { sfx.win(); vibrate([40, 30, 80]); } else { sfx.beep(220, 0.25, 'sawtooth', 0.04); }
  }

  function renderReady(t) {
    body.innerHTML = '';
    const card = el('div', 'card trivia-ready');
    card.append(el('div', 'trivia-ready-icon', '❓'), el('h2', null, '¡Prepárate!'), el('p', 'muted', `${t.total} preguntas · ${t.time} segundos cada una`));
    body.append(card);
  }

  function renderPlayers(room) {
    const t = room.trivia;
    const list = $('#trivia-players');
    renderPlayerList(list, room, { scores: true });
    if (!t) return;
    const answered = new Set(t.answered || []);
    list.querySelectorAll('.player').forEach((li) => {
      const id = li.dataset.id;
      if (t.sub === 'question' && answered.has(id)) {
        li.classList.add('guessed');
        li.append(el('span', 'basta-progress full', '✓'));
      }
      if (t.sub === 'reveal' && t.result && t.result.gains.some((g) => g.id === id)) li.classList.add('guessed');
    });
  }

  function render(room) {
    const overlay = $('#trivia-overlay');
    if (room.phase === 'gameOver') {
      clearInterval(ui.clock);
      ui.key = null;
      renderPlayerList($('#trivia-players'), room, { scores: true });
      overlay.innerHTML = '';
      if (room.ranking) overlay.append(gameOverCard(room));
      overlay.classList.remove('hidden');
      return;
    }
    overlay.classList.add('hidden');
    const t = room.trivia;
    if (!t) return;
    $('#trivia-progress').textContent = t.sub === 'ready' ? `${t.total} preguntas` : `Pregunta ${t.index + 1}/${t.total}`;
    const cat = t.question ? catInfo(t.question.cat) : null;
    $('#trivia-cat').textContent = cat ? `${cat.emoji} ${cat.label}` : '❓ Trivia';
    renderPlayers(room);
    startClock(t);
    preload(t.preload);

    if (t.sub === 'ready') { ui.key = 'ready'; return renderReady(t); }
    const key = `q${t.index}`;
    if (ui.key !== key) {
      ui.key = key;
      ui.revealed = false;
      ui.lastBeep = null;
      buildQuestion(t);
    }
    paint(t);
    if (t.sub === 'reveal' && !ui.revealed) {
      ui.revealed = true;
      renderReveal(t);
    }
  }

  return { render };
};
