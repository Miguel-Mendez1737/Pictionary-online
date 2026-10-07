(() => {
  'use strict';

  const $ = (sel) => document.querySelector(sel);
  const root = document.documentElement;
  const socket = io({ autoConnect: false });

  const state = {
    me: null,
    room: null,
    joinData: null,
    themes: [],
    roundOptions: [],
    turnSeconds: 90,
    avatar: null,       // avatar personalizado (ver avatar.js)
    editorTab: 'base',
    account: null,      // perfil de la cuenta si inició sesión
    editing: false,     // ventana "Editar perfil" abierta
    tool: { size: 4, eraser: false },
    lastPhase: null,
    lastDrawerId: null
  };

  const storage = {
    get(key, area = localStorage) { try { return area.getItem(key); } catch { return null; } },
    set(key, val, area = localStorage) { try { area.setItem(key, val); } catch { /* sin almacenamiento */ } }
  };

  // Clave estable por pestaña: permite volver a la partida (con el mismo puntaje)
  // tras bloquear el celular, cambiar de red o recargar la página.
  function playerKey() {
    let key = storage.get('pictionary:key', sessionStorage);
    if (!key) {
      key = (crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`).replace(/[^A-Za-z0-9_-]/g, '');
      storage.set('pictionary:key', key, sessionStorage);
    }
    return key;
  }

  // ─── Utilidades de UI ──────────────────────────────────────────────────────
  // Avatar SVG animado. Cada uno arranca su animación en un momento distinto
  // para que no parpadeen todos a la vez.
  function avatarEl(cfg, size = 'md', crop = 'full') {
    const node = document.createElement('span');
    node.className = `avatar size-${size}`;
    node.setAttribute('aria-hidden', 'true');
    node.style.setProperty('--delay', `${(-Math.random() * 4).toFixed(2)}s`);
    node.innerHTML = Avatar.render(cfg, crop);
    return node;
  }

  function el(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text != null) node.textContent = text;
    return node;
  }

  function showScreen(id) {
    const current = document.querySelector('.screen.active');
    if (current && current.id === id) return;
    document.querySelectorAll('.screen').forEach((s) => s.classList.toggle('active', s.id === id));
    window.scrollTo(0, 0); // cada pantalla empieza arriba
  }

  let toastTimer;
  function toast(text, kind = 'info') {
    const t = $('#toast');
    t.textContent = text;
    t.className = `toast show ${kind}`;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => t.classList.remove('show'), 2600);
  }

  // Vibración háptica (Android; iOS la ignora sin error).
  function vibrate(pattern) {
    try { if (navigator.vibrate) navigator.vibrate(pattern); } catch { /* no soportado */ }
  }

  // ─── Bienvenida: nombre de la app, autor y versión ──────────────────────────
  const APP = Object.assign({ name: 'Pictionary Online', author: 'Miguel Mendez', version: '' }, window.APP_INFO || {});
  document.querySelectorAll('[data-app="name"]').forEach((n) => { n.textContent = APP.name; });
  document.querySelectorAll('[data-app="author"]').forEach((n) => { n.textContent = APP.author; });
  document.querySelectorAll('[data-app="version"]').forEach((n) => { n.textContent = APP.version ? `v${APP.version}` : ''; });

  const splash = $('#splash');
  const hideSplash = () => {
    if (splash.classList.contains('hide')) return;
    splash.classList.add('hide');
    setTimeout(() => splash.remove(), 500);
  };
  splash.addEventListener('click', hideSplash); // un toque la cierra antes
  setTimeout(hideSplash, 2400);

  // ─── Sonido y voz del anunciador (se pueden apagar con 🔊/🔇) ─────────────
  let soundOn = storage.get('pictionary:sound') !== 'off';

  function renderSoundToggles() {
    document.querySelectorAll('.sound-toggle').forEach((b) => {
      b.textContent = soundOn ? '🔊' : '🔇';
      b.title = soundOn ? 'Silenciar sonidos y anuncios' : 'Activar sonidos y anuncios';
      b.setAttribute('aria-label', b.title);
      b.setAttribute('aria-pressed', String(!soundOn));
    });
  }
  document.querySelectorAll('.sound-toggle').forEach((b) => b.addEventListener('click', () => {
    soundOn = !soundOn;
    storage.set('pictionary:sound', soundOn ? 'on' : 'off');
    if (!soundOn && 'speechSynthesis' in window) speechSynthesis.cancel();
    renderSoundToggles();
    vibrate(10);
  }));

  // Voz sintetizada del celular (Android e iPhone), en español si está disponible.
  const speech = {
    unlocked: false,
    voice: null,
    pickVoice() {
      if (!('speechSynthesis' in window)) return;
      const voices = speechSynthesis.getVoices();
      this.voice = voices.find((v) => /^es[-_](MX|US|419|CO)/i.test(v.lang))
        || voices.find((v) => /^es/i.test(v.lang)) || null;
    },
    // iOS solo permite hablar si la primera frase ocurre dentro de un toque.
    unlock() {
      if (this.unlocked || !('speechSynthesis' in window)) return;
      this.unlocked = true;
      const u = new SpeechSynthesisUtterance(' ');
      u.volume = 0;
      speechSynthesis.speak(u);
    },
    say(text) {
      if (!soundOn || !('speechSynthesis' in window)) return;
      if (!this.voice) this.pickVoice();
      speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(text);
      u.lang = this.voice ? this.voice.lang : 'es-MX';
      if (this.voice) u.voice = this.voice;
      u.rate = 1.05;
      speechSynthesis.speak(u);
    }
  };
  if ('speechSynthesis' in window) {
    speech.pickVoice();
    speechSynthesis.addEventListener && speechSynthesis.addEventListener('voiceschanged', () => speech.pickVoice());
  }

  // Aviso grande en pantalla: "¡Miguel ganó 170 puntos!"
  let announceTimer;
  function announce(avatarIndex, text) {
    const box = $('#announce');
    box.innerHTML = '';
    box.append(avatarEl(avatarIndex, 'md'), el('span', 'announce-text', text));
    box.classList.remove('show');
    void box.offsetWidth; // reinicia la animación si llegan dos aciertos seguidos
    box.classList.add('show');
    clearTimeout(announceTimer);
    announceTimer = setTimeout(() => box.classList.remove('show'), 2800);
  }

  // ─── Colores de la interfaz según el tema ──────────────────────────────────
  // Cada tema trae dos colores (words.js) y toda la app se pinta con ellos.
  const DEFAULT_COLORS = ['#5b5bd6', '#e64980'];
  const hexRgb = (hex) => { const n = parseInt(hex.slice(1), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; };
  const mixHex = (hex, target, t) => {
    const a = hexRgb(hex);
    const b = hexRgb(target);
    return `#${a.map((v, i) => Math.round(v + (b[i] - v) * t).toString(16).padStart(2, '0')).join('')}`;
  };
  let appliedColors = '';
  function applyThemeColors(colors) {
    const [c1, c2] = colors && colors.length === 2 ? colors : DEFAULT_COLORS;
    const key = `${c1}${c2}`;
    if (key === appliedColors) return;
    appliedColors = key;
    const [r1, g1, b1] = hexRgb(c1);
    const [r2, g2, b2] = hexRgb(c2);
    const set = (k, v) => root.style.setProperty(k, v);
    set('--accent', c1);
    set('--accent-2', c2);
    set('--accent-strong', mixHex(c1, '#000000', 0.18));
    set('--accent-soft', mixHex(c1, '#ffffff', 0.88));
    set('--bg', mixHex(c1, '#ffffff', 0.94));
    set('--blob-1', `rgba(${r1},${g1},${b1},.22)`);
    set('--blob-2', `rgba(${r2},${g2},${b2},.2)`);
    set('--accent-shadow', `rgba(${r1},${g1},${b1},.35)`);
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute('content', c1); // barra del navegador del mismo color
  }

  // ─── Título animado: cada letra rebota con su propio color ─────────────────
  const LETTER_COLORS = ['#ff6b6b', '#ffa94d', '#fcc419', '#51cf66', '#339af0', '#845ef7', '#f06595'];
  function animateTitle(node) {
    if (!node) return;
    const word = node.dataset.word || 'Pictionary';
    node.textContent = '';
    [...word].forEach((ch, i) => {
      const span = el('span', 'logo-letter', ch);
      span.style.setProperty('--i', i);
      span.style.setProperty('--c', LETTER_COLORS[i % LETTER_COLORS.length]);
      node.append(span);
    });
  }
  document.querySelectorAll('.logo-word').forEach(animateTitle);

  // ─── Pantalla de inicio: objetos animados al azar ──────────────────────────
  // Cada vez que se abre la app aparecen objetos distintos: algo que vuela,
  // algo que rueda, una herramienta y protagonistas icónicos de películas.
  const HERO_OBJECTS = {
    flyers: [['✈️', 'Avión'], ['🚀', 'Cohete'], ['🛸', 'Platillo volador'], ['🚁', 'Helicóptero'], ['🎈', 'Globo']],
    drivers: [['🚗', 'Carro'], ['🚕', 'Taxi'], ['🚌', 'Autobús'], ['🏎️', 'Carro de carreras'], ['🚲', 'Bicicleta'], ['🚒', 'Bomberos']],
    tools: [['🔨', 'Martillo'], ['🔧', 'Llave'], ['✂️', 'Tijeras'], ['🖌️', 'Pincel'], ['✏️', 'Lápiz']],
    movies: [
      ['🦖', 'Jurassic Park', 'stomp'], ['🦈', 'Tiburón', 'swim'], ['🦁', 'El Rey León', 'stomp'], ['🤖', 'Wall-E', 'bob'],
      ['👻', 'Los Cazafantasmas', 'ghost'], ['🦸', 'Superhéroe', 'hero'], ['🧙', 'Mago', 'float'], ['🐠', 'Buscando a Nemo', 'swim'],
      ['🦍', 'King Kong', 'stomp'], ['👽', 'ET', 'bob'], ['🧞', 'Aladdín', 'float'], ['🐼', 'Kung Fu Panda', 'roll'],
      ['⛄', 'Frozen', 'wobble'], ['🤠', 'Toy Story', 'bob'], ['🧜‍♀️', 'La Sirenita', 'swim'], ['🕷️', 'Spiderman', 'dangle']
    ],
    things: [['⚽', 'Pelota', 'bounce'], ['🎸', 'Guitarra', 'wobble'], ['🍕', 'Pizza', 'spin'], ['⏰', 'Reloj', 'shake'],
      ['☂️', 'Paraguas', 'float'], ['🎬', 'Claqueta', 'clap'], ['🍿', 'Palomitas', 'bounce'], ['💡', 'Bombilla', 'glow']]
  };

  function buildHero() {
    const stage = $('#hero-stage');
    if (!stage) return;
    stage.innerHTML = '';
    const pick = (list, n) => [...list].sort(() => Math.random() - 0.5).slice(0, n);
    const rand = (a, b) => a + Math.random() * (b - a);
    const add = ([emoji, label, anim], cls, style) => {
      const o = el('span', `hero-obj ${cls}`);
      o.setAttribute('aria-hidden', 'true');
      o.title = label;
      const inner = el('span', `obj-inner anim-${anim || 'float'}`, emoji);
      inner.style.animationDelay = `${-rand(0, 3).toFixed(2)}s`;
      o.append(inner);
      Object.entries(style).forEach(([k, v]) => o.style.setProperty(k, v));
      // Al tocarlo, salta y suena
      o.addEventListener('click', () => {
        o.classList.remove('pop');
        void o.offsetWidth;
        o.classList.add('pop');
        sfx.beep(600 + Math.random() * 600, 0.12, 'triangle', 0.06);
        vibrate(15);
      });
      stage.append(o);
    };
    // Uno que vuela por arriba y uno que rueda por abajo
    add(pick(HERO_OBJECTS.flyers, 1)[0], 'lane-fly', { '--dur': `${rand(9, 13).toFixed(1)}s`, '--delay': `${-rand(0, 6).toFixed(1)}s` });
    add(pick(HERO_OBJECTS.drivers, 1)[0], 'lane-drive', { '--dur': `${rand(7, 10).toFixed(1)}s`, '--delay': `${-rand(0, 5).toFixed(1)}s` });
    // A los lados: herramienta, personajes de película y objetos
    const sides = [
      [...pick(HERO_OBJECTS.tools, 1)[0], 'hammer'],
      ...pick(HERO_OBJECTS.movies, 3),
      ...pick(HERO_OBJECTS.things, 2)
    ].sort(() => Math.random() - 0.5);
    const spots = [[4, 20], [5, 58], [16, 82], [82, 18], [86, 56], [72, 82]]; // % izquierda, % arriba
    sides.forEach((obj, i) => {
      const [x, y] = spots[i];
      add(obj, 'spot', { left: `${x + rand(-2, 2)}%`, top: `${y + rand(-4, 4)}%`, '--size': `${rand(30, 42).toFixed(0)}px` });
    });
  }

  // ─── Instalar la app en el teléfono (acceso directo) ───────────────────────
  // Android/Chrome: abre el cuadro de instalación. iPhone: Safari no lo
  // permite por código, así que se muestran los pasos.
  let installPrompt = null;
  const isStandalone = () => window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;
  const isIOS = () => /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  function updateInstallButton() {
    const btn = $('#install-btn');
    if (btn) btn.hidden = isStandalone();
  }
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    installPrompt = e;
    updateInstallButton();
  });
  window.addEventListener('appinstalled', () => {
    installPrompt = null;
    toast('📲 ¡App instalada! Búscala en tu pantalla de inicio.', 'success');
    updateInstallButton();
  });
  function showInstallHelp() {
    const ios = isIOS();
    $('#install-steps').innerHTML = ios
      ? `<li>Abre esta página en <strong>Safari</strong>.</li>
         <li>Toca el botón <strong>Compartir</strong> <span class="key">⬆️</span> (abajo, en el centro).</li>
         <li>Desliza y elige <strong>“Agregar a inicio”</strong>.</li>
         <li>Toca <strong>Agregar</strong>. ¡Listo! Aparecerá el ícono en tu pantalla.</li>`
      : `<li>Abre esta página en <strong>Chrome</strong>.</li>
         <li>Toca el menú <span class="key">⋮</span> (arriba a la derecha).</li>
         <li>Elige <strong>“Instalar app”</strong> o <strong>“Agregar a la pantalla principal”</strong>.</li>
         <li>Confirma con <strong>Instalar</strong>. ¡Listo! Aparecerá el ícono en tu pantalla.</li>`;
    $('#install-modal').classList.remove('hidden');
  }
  $('#install-btn').addEventListener('click', async () => {
    if (installPrompt) {
      installPrompt.prompt();
      try { await installPrompt.userChoice; } catch { /* cancelado */ }
      installPrompt = null;
      return;
    }
    showInstallHelp();
  });
  $('#install-close').addEventListener('click', () => $('#install-modal').classList.add('hidden'));
  $('#install-modal').addEventListener('click', (e) => { if (e.target.id === 'install-modal') e.currentTarget.classList.add('hidden'); });

  // ─── Efectos de sonido (Web Audio, sin archivos) ───────────────────────────
  // iPhone/iPad solo permiten audio después de un toque del usuario: el
  // contexto se "desbloquea" en el primer toque, clic o tecla.
  const sfx = {
    ctx: null,
    unlock() {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      if (!this.ctx) {
        this.ctx = new AC();
        // búfer silencioso: truco necesario en iOS para habilitar el audio
        const src = this.ctx.createBufferSource();
        src.buffer = this.ctx.createBuffer(1, 1, 22050);
        src.connect(this.ctx.destination);
        src.start(0);
      }
      if (this.ctx.state === 'suspended') this.ctx.resume().catch(() => {});
    },
    beep(freq, dur, type = 'square', vol = 0.04) {
      const c = this.ctx;
      if (!soundOn || !c || c.state !== 'running') return;
      const t = c.currentTime;
      const osc = c.createOscillator();
      const gain = c.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(freq, t);
      gain.gain.setValueAtTime(vol, t);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      osc.connect(gain);
      gain.connect(c.destination);
      osc.start(t);
      osc.stop(t + dur + 0.02);
    },
    tick() { this.beep(1400, 0.025, 'square', 0.025); },
    win() { [523, 659, 784, 1047].forEach((f, i) => setTimeout(() => this.beep(f, 0.2, 'triangle', 0.07), i * 110)); }
  };
  ['touchend', 'click', 'keydown'].forEach((ev) => window.addEventListener(ev, () => {
    sfx.unlock();
    speech.unlock();
    // iPhone puede bloquear el audio de voz que llegó sin un toque: se reanuda aquí.
    document.querySelectorAll('#voice-audio audio').forEach((a) => { if (a.paused) a.play().catch(() => {}); });
  }, { passive: true }));

  // ─── Viewport móvil y teclado ──────────────────────────────────────────────
  // El juego ocupa exactamente el área visible. Al abrir el teclado el
  // visualViewport se reduce; el CSS encoge el lienzo y oculta la franja de
  // jugadores para que el dibujo y el último mensaje sigan a la vista.
  const chatInput = $('#chat-input');
  let baseHeight = 0;

  // Orientación según la pantalla física del celular (no cambia con el teclado).
  function isPhoneLandscape() {
    const type = (screen.orientation && screen.orientation.type)
      || (Math.abs(window.orientation || 0) === 90 ? 'landscape' : 'portrait');
    return type.startsWith('landscape') && Math.min(screen.width, screen.height) <= 520;
  }

  function updateViewport() {
    const vv = window.visualViewport;
    const h = vv ? vv.height : window.innerHeight;
    baseHeight = Math.max(baseHeight, h, window.innerHeight);
    root.style.setProperty('--app-h', `${Math.round(h)}px`);
    root.style.setProperty('--vv-top', `${Math.round(vv ? vv.offsetTop : 0)}px`);
    document.body.classList.toggle('is-landscape', isPhoneLandscape());
    const kbOpen = document.activeElement === chatInput && h < baseHeight * 0.8;
    document.body.classList.toggle('kb-open', kbOpen);
    if (kbOpen) scrollMessagesToEnd();
  }
  if (window.visualViewport) {
    visualViewport.addEventListener('resize', updateViewport);
    visualViewport.addEventListener('scroll', updateViewport);
  }
  window.addEventListener('resize', updateViewport);
  const onRotate = () => { baseHeight = 0; setTimeout(updateViewport, 300); };
  if (screen.orientation) screen.orientation.addEventListener('change', onRotate);
  else window.addEventListener('orientationchange', onRotate);
  chatInput.addEventListener('focus', () => setTimeout(updateViewport, 50));
  chatInput.addEventListener('blur', () => setTimeout(updateViewport, 50));

  // ─── Pantalla siempre encendida durante la partida ─────────────────────────
  let wakeLock = null;
  async function updateWakeLock() {
    const want = state.room && state.room.phase !== 'lobby' && document.visibilityState === 'visible';
    try {
      if (want && !wakeLock && 'wakeLock' in navigator) {
        wakeLock = await navigator.wakeLock.request('screen');
        wakeLock.addEventListener('release', () => { wakeLock = null; });
      } else if (!want && wakeLock) {
        await wakeLock.release();
        wakeLock = null;
      }
    } catch { wakeLock = null; }
  }
  document.addEventListener('visibilitychange', () => {
    updateWakeLock();
    // Al volver a la app (p. ej. tras desbloquear el celular) reconecta de inmediato.
    if (document.visibilityState === 'visible' && state.joinData && !socket.connected) socket.connect();
  });

  // ─── 1. Registro ───────────────────────────────────────────────────────────
  const nameInput = $('#name-input');
  const roomInput = $('#room-input');

  // ─── Editor de avatar: pestañas por rasgo, miniaturas y muestras de color ──
  const EDITOR_TABS = [
    { id: 'base', icon: '🧑', label: 'Sexo y piel' },
    { id: 'hair', icon: '💇', label: 'Cabello' },
    { id: 'eyes', icon: '👁️', label: 'Ojos' },
    { id: 'glasses', icon: '🕶️', label: 'Lentes' },
    { id: 'mouth', icon: '👄', label: 'Labios' },
    { id: 'beard', icon: '🧔', label: 'Barba', onlyMen: true },
    { id: 'shirt', icon: '👕', label: 'Playera' }
  ];

  function setAvatar(patch) {
    state.avatar = Avatar.normalize({ ...state.avatar, ...patch });
    if (!state.editing) storage.set('pictionary:avatar', JSON.stringify(state.avatar));
    vibrate(8);
    renderAvatarEditor();
  }

  // Grupo de opciones: miniaturas del avatar con esa variante aplicada.
  function thumbGroup(title, key, names, crop) {
    const wrap = el('div', 'editor-group');
    wrap.append(el('span', 'editor-label', title));
    const grid = el('div', 'thumb-grid');
    grid.setAttribute('role', 'radiogroup');
    grid.setAttribute('aria-label', title);
    names.forEach((name, i) => {
      const btn = el('button', 'thumb');
      btn.type = 'button';
      btn.setAttribute('role', 'radio');
      btn.setAttribute('aria-checked', String(state.avatar[key] === i));
      btn.setAttribute('aria-label', name);
      btn.title = name;
      btn.classList.toggle('selected', state.avatar[key] === i);
      const preview = { ...state.avatar, [key]: i };
      if (key === 'beard' && i === 0) preview.beard = 0;
      btn.append(avatarEl(preview, 'thumb', crop), el('span', 'thumb-name', name));
      btn.addEventListener('click', () => setAvatar({ [key]: i }));
      grid.append(btn);
    });
    wrap.append(grid);
    return wrap;
  }

  // Grupo de colores: círculos de muestra.
  function swatchGroup(title, key, colors) {
    const wrap = el('div', 'editor-group');
    wrap.append(el('span', 'editor-label', `${title}: ${colors[state.avatar[key]].name}`));
    const row = el('div', 'swatches');
    row.setAttribute('role', 'radiogroup');
    row.setAttribute('aria-label', title);
    colors.forEach((c, i) => {
      const btn = el('button', 'swatch');
      btn.type = 'button';
      btn.setAttribute('role', 'radio');
      btn.setAttribute('aria-checked', String(state.avatar[key] === i));
      btn.setAttribute('aria-label', c.name);
      btn.title = c.name;
      btn.style.setProperty('--sw', c.sw || c.c);
      btn.classList.toggle('selected', state.avatar[key] === i);
      btn.addEventListener('click', () => setAvatar({ [key]: i }));
      row.append(btn);
    });
    wrap.append(row);
    return wrap;
  }

  function renderAvatarEditor() {
    const a = state.avatar;
    const preview = $('#avatar-preview');
    preview.innerHTML = '';
    preview.append(avatarEl(a, 'xl'));

    if (a.g === 'm' && state.editorTab === 'beard') state.editorTab = 'base';
    const tabs = $('#editor-tabs');
    tabs.innerHTML = '';
    EDITOR_TABS.filter((t) => !(t.onlyMen && a.g === 'm')).forEach((t) => {
      const b = el('button', 'editor-tab');
      b.append(el('span', 'tab-icon', t.icon), el('span', 'tab-label', t.label));
      b.type = 'button';
      b.setAttribute('role', 'tab');
      b.setAttribute('aria-selected', String(state.editorTab === t.id));
      b.classList.toggle('active', state.editorTab === t.id);
      b.addEventListener('click', () => { state.editorTab = t.id; renderAvatarEditor(); });
      tabs.append(b);
    });

    const panel = $('#editor-panel');
    panel.innerHTML = '';
    const S = Avatar.SPEC;
    switch (state.editorTab) {
      case 'hair':
        panel.append(thumbGroup('Tipo de cabello', 'hair', S.hair, 'hair'), swatchGroup('Color de cabello', 'hairColor', S.hairColor));
        break;
      case 'eyes':
        panel.append(thumbGroup('Tipo de ojos', 'eyes', S.eyes, 'eyes'), swatchGroup('Color de ojos', 'eyeColor', S.eyeColor));
        break;
      case 'glasses':
        panel.append(thumbGroup('Tipo de lentes', 'glasses', S.glasses, 'glasses'));
        if (a.glasses > 0) panel.append(swatchGroup('Color del marco', 'glassesColor', S.glassesColor), swatchGroup('Cristales', 'lens', S.lens));
        break;
      case 'mouth':
        panel.append(thumbGroup('Tipo de labios', 'lips', S.lips, 'mouth'));
        break;
      case 'beard':
        panel.append(thumbGroup('Barba', 'beard', S.beard, 'beard'));
        break;
      case 'shirt':
        panel.append(thumbGroup('Playera', 'shirt', S.shirt, 'shirt'), swatchGroup('Color', 'shirtColor', S.shirtColor));
        if (a.shirt > 0) panel.append(swatchGroup('Color de las rayas', 'stripeColor', S.stripeColor));
        break;
      default: {
        const sex = el('div', 'editor-group');
        sex.append(el('span', 'editor-label', 'Sexo'));
        const seg = el('div', 'segmented');
        seg.setAttribute('role', 'radiogroup');
        seg.setAttribute('aria-label', 'Sexo');
        [['h', '👨 Hombre'], ['m', '👩 Mujer']].forEach(([g, label]) => {
          const b = el('button', 'seg-btn', label);
          b.type = 'button';
          b.setAttribute('role', 'radio');
          b.setAttribute('aria-checked', String(a.g === g));
          b.classList.toggle('active', a.g === g);
          // Al cambiar de sexo se proponen rasgos típicos; todo sigue siendo editable.
          b.addEventListener('click', () => {
            if (a.g === g) return;
            const d = Avatar.DEFAULTS[g];
            setAvatar({ g, hair: d.hair, eyes: d.eyes, lips: d.lips, beard: 0 });
          });
          seg.append(b);
        });
        sex.append(seg);
        panel.append(sex, swatchGroup('Color de piel', 'skin', S.skin), swatchGroup('Fondo', 'bg', S.bg));
      }
    }
  }

  // ─── Cuentas: registrarse / iniciar sesión para no repetir la creación ─────
  async function api(method, url, body) {
    const headers = { 'Content-Type': 'application/json' };
    const token = storage.get('pictionary:token');
    if (token) headers.Authorization = `Bearer ${token}`;
    let res;
    try {
      res = await fetch(url, { method, headers, body: body ? JSON.stringify(body) : undefined });
    } catch {
      throw new Error('No hay conexión con el servidor.');
    }
    let data = {};
    try { data = await res.json(); } catch { /* sin cuerpo */ }
    if (!res.ok) {
      if (res.status === 401 && url !== '/api/login') setAccount(null);
      throw new Error(data.error || 'Ocurrió un error. Intenta de nuevo.');
    }
    return data;
  }

  function setAccount(profile, token) {
    if (token) storage.set('pictionary:token', token);
    if (!profile) {
      try { localStorage.removeItem('pictionary:token'); } catch { /* sin almacenamiento */ }
      state.account = null;
      return;
    }
    state.account = profile;
    state.avatar = Avatar.normalize(profile.avatar);
    storage.set('pictionary:avatar', JSON.stringify(state.avatar));
    storage.set('pictionary:name', profile.name);
    nameInput.value = profile.name;
  }

  // Vistas de la pantalla de inicio: 'account' (con cuenta), 'guest' (nuevo) o 'login'.
  function showRegisterView(view) {
    $('#view-account').hidden = view !== 'account';
    $('#register-form').hidden = view !== 'guest';
    $('#login-form').hidden = view !== 'login';
    ['#register-error', '#login-error', '#account-error'].forEach((id) => { $(id).textContent = ''; });
    if (view === 'account' && state.account) {
      const box = $('#account-avatar');
      box.innerHTML = '';
      box.append(avatarEl(state.account.avatar, 'xl'));
      $('#account-hello').textContent = `¡Hola, ${state.account.name}!`;
      $('#account-user').textContent = `Tu usuario: @${state.account.username}`;
      refreshFriendsCount();
    }
    if (view === 'guest') {
      $('#editor-home').append($('#avatar-editor'));
      renderAvatarEditor();
    }
    window.scrollTo(0, 0);
  }

  // Une al jugador a la sala con su nombre y avatar.
  // createPrivate: crea una sala privada nueva (solo el dueño y sus amigos).
  function startJoin(name, room, createPrivate = false) {
    storage.set('pictionary:name', name);
    storage.set('pictionary:avatar', JSON.stringify(state.avatar));
    state.joinData = { name, avatar: state.avatar, room, key: playerKey() };
    if (createPrivate) state.joinData.createPrivate = true;
    if (socket.connected) join(); else socket.connect();
  }

  function initRegister() {
    const params = new URLSearchParams(location.search);
    nameInput.value = storage.get('pictionary:name') || '';
    roomInput.value = params.get('sala') || '';
    $('#room-input-acc').value = params.get('sala') || '';
    let savedAvatar = null;
    try { savedAvatar = JSON.parse(storage.get('pictionary:avatar') || 'null'); } catch { /* inválido */ }
    state.avatar = savedAvatar && typeof savedAvatar === 'object' ? Avatar.normalize(savedAvatar) : Avatar.random();
    $('#avatar-random').addEventListener('click', () => {
      const r = Avatar.random();
      state.avatar = r;
      if (!state.editing) storage.set('pictionary:avatar', JSON.stringify(r));
      vibrate(15);
      renderAvatarEditor();
    });

    nameInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') { e.preventDefault(); roomInput.focus(); }
    });
    $('#go-login').addEventListener('click', () => showRegisterView('login'));
    $('#go-register').addEventListener('click', () => showRegisterView('guest'));

    // Nuevo jugador (y, si llenó usuario y contraseña, crea su cuenta)
    $('#register-form').addEventListener('submit', async (e) => {
      e.preventDefault();
      const err = $('#register-error');
      const name = nameInput.value.trim();
      if (!name) { err.textContent = 'Escribe tu nombre para continuar.'; nameInput.focus(); return; }
      const username = $('#reg-username').value.trim();
      const password = $('#reg-password').value;
      err.textContent = '';
      document.activeElement.blur();
      $('#join-btn').disabled = true;
      if (username || password) {
        try {
          const res = await api('POST', '/api/register', { username, password, name, avatar: state.avatar });
          setAccount(res.profile, res.token);
          $('#reg-password').value = '';
          toast('💾 ¡Cuenta creada! La próxima vez entras directo.', 'success');
        } catch (ex) {
          err.textContent = ex.message;
          $('#save-account').open = true;
          $('#join-btn').disabled = false;
          return;
        }
      }
      startJoin(name, roomInput.value.trim());
    });

    // Iniciar sesión
    $('#login-form').addEventListener('submit', async (e) => {
      e.preventDefault();
      const err = $('#login-error');
      err.textContent = '';
      $('#login-btn').disabled = true;
      try {
        const res = await api('POST', '/api/login', { username: $('#login-username').value.trim(), password: $('#login-password').value });
        setAccount(res.profile, res.token);
        $('#login-password').value = '';
        showRegisterView('account');
      } catch (ex) {
        err.textContent = ex.message;
      } finally {
        $('#login-btn').disabled = false;
      }
    });

    // Con cuenta: entrar directo
    $('#account-play').addEventListener('click', () => {
      if (!state.account) return;
      $('#account-play').disabled = true;
      startJoin(state.account.name, $('#room-input-acc').value.trim());
    });
    $('#account-private').addEventListener('click', () => {
      if (!state.account) return;
      $('#account-private').disabled = true;
      startJoin(state.account.name, '', true);
    });
    $('#account-friends').addEventListener('click', () => openFriends());
    $('#account-edit').addEventListener('click', () => openProfile());
    $('#account-logout').addEventListener('click', async () => {
      try { await api('POST', '/api/logout'); } catch { /* ya expirada */ }
      setAccount(null);
      toast('Sesión cerrada');
      showRegisterView('guest');
    });

    // Si la pestaña se recargó en medio de una partida, vuelve a entrar sola.
    const saved = storage.get('pictionary:session', sessionStorage);
    let rejoining = false;
    if (saved) {
      try {
        const s = JSON.parse(saved);
        // Si abrió un enlace de invitación a OTRA sala, manda el enlace.
        const linkRoom = (params.get('sala') || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
        if (s && s.name && s.room && (!linkRoom || linkRoom === s.room)) {
          state.avatar = Avatar.normalize(s.avatar);
          state.joinData = { ...s, key: playerKey() };
          rejoining = true;
          socket.connect();
        }
      } catch { /* sesión inválida */ }
    }

    // ¿Tiene cuenta guardada en este celular? Entra sin volver a crear el jugador.
    showRegisterView('guest');
    if (storage.get('pictionary:token')) {
      api('GET', '/api/me')
        .then((res) => {
          const keep = rejoining ? state.avatar : null;
          setAccount(res.profile);
          if (keep) state.avatar = keep;
          showRegisterView('account');
        })
        .catch(() => showRegisterView('guest'));
    }
  }

  function join() {
    // El token identifica la cuenta (para crear o entrar a salas privadas).
    const payload = { ...state.joinData, token: storage.get('pictionary:token') || undefined };
    socket.emit('player:join', payload, (res) => {
      $('#join-btn').disabled = false;
      $('#account-play').disabled = false;
      $('#account-private').disabled = false;
      if (!res || res.error) {
        const msg = res ? res.error : 'No se pudo entrar a la sala.';
        const errEl = $(state.account ? '#account-error' : '#register-error');
        errEl.textContent = msg;
        toast(msg, 'warn');
        setTimeout(() => errEl.scrollIntoView({ behavior: 'smooth', block: 'center' }), 50);
        state.joinData = null;
        storage.set('pictionary:session', '', sessionStorage);
        showScreen('screen-register');
        return;
      }
      state.me = res.id;
      state.themes = res.themes;
      state.roundOptions = res.roundOptions;
      state.turnSeconds = res.turnSeconds || 90;
      state.joinData.room = res.room;
      delete state.joinData.createPrivate; // al reconectar vuelve a ESTA sala
      saveSession();
      history.replaceState(null, '', `?sala=${encodeURIComponent(res.room)}`);
      fillSelects();
      if (voice.wasActive) joinVoice(); // vuelve al audio tras una reconexión
    });
  }

  function saveSession() {
    if (!state.joinData) return;
    const { name, avatar, room } = state.joinData;
    storage.set('pictionary:session', JSON.stringify({ name, avatar, room }), sessionStorage);
  }

  // ─── Mis amigos (para las salas privadas) ──────────────────────────────────
  function renderFriends(list) {
    const ul = $('#friend-list');
    ul.innerHTML = '';
    $('#friends-count').textContent = String(list.length);
    if (!list.length) {
      ul.append(el('li', 'friend-empty', 'Aún no tienes amigos agregados. Escribe el usuario de un amigo arriba.'));
      return;
    }
    list.forEach((f) => {
      const li = el('li', 'friend');
      const info = el('div', 'friend-info');
      info.append(el('strong', null, f.name), el('span', 'muted small', `@${f.username}`));
      const del = el('button', 'btn btn-ghost btn-icon friend-del', '✕');
      del.type = 'button';
      del.setAttribute('aria-label', `Quitar a ${f.name}`);
      del.addEventListener('click', async () => {
        try { renderFriends((await api('DELETE', `/api/friends/${encodeURIComponent(f.username)}`)).friends); } catch (ex) { $('#friends-error').textContent = ex.message; }
      });
      li.append(avatarEl(f.avatar, 'sm'), info, del);
      ul.append(li);
    });
  }

  async function refreshFriendsCount() {
    try { renderFriends((await api('GET', '/api/friends')).friends); } catch { /* sin conexión */ }
  }

  async function openFriends() {
    if (!state.account) return;
    $('#friends-error').textContent = '';
    $('#friend-input').value = '';
    $('#my-username').textContent = `@${state.account.username}`;
    $('#friends-modal').classList.remove('hidden');
    document.body.classList.add('modal-open');
    await refreshFriendsCount();
  }
  function closeFriends() {
    $('#friends-modal').classList.add('hidden');
    document.body.classList.remove('modal-open');
  }
  $('#friends-close').addEventListener('click', closeFriends);
  $('#friends-modal').addEventListener('click', (e) => { if (e.target.id === 'friends-modal') closeFriends(); });
  $('#privacy-friends').addEventListener('click', () => openFriends());
  $('#friend-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const username = $('#friend-input').value.trim();
    if (!username) return;
    $('#friends-error').textContent = '';
    try {
      const res = await api('POST', '/api/friends', { username });
      renderFriends(res.friends);
      $('#friend-input').value = '';
      toast(`👥 ${res.added.name} ahora es tu amigo`, 'success');
      vibrate(20);
    } catch (ex) {
      $('#friends-error').textContent = ex.message;
    }
  });

  // ─── Editar perfil (en cualquier momento) ─────────────────────────────────
  // El mismo editor de avatar se "muda" a la ventana mientras está abierta.
  let profileBackup = null;

  function openProfile() {
    state.editing = true;
    profileBackup = { ...state.avatar };
    const inRoom = Boolean(state.joinData && state.me);
    $('#profile-name').value = (inRoom && state.joinData.name) || (state.account && state.account.name) || nameInput.value;
    $('#profile-account-fields').hidden = !state.account;
    if (state.account) $('#profile-username').value = state.account.username;
    $('#profile-current').value = '';
    $('#profile-new').value = '';
    $('#profile-error').textContent = '';
    $('#editor-modal').append($('#avatar-editor'));
    renderAvatarEditor();
    $('#profile-modal').classList.remove('hidden');
    document.body.classList.add('modal-open');
  }

  function closeProfile(restore) {
    if (restore && profileBackup) state.avatar = profileBackup;
    state.editing = false;
    $('#profile-modal').classList.add('hidden');
    document.body.classList.remove('modal-open');
    $('#editor-home').append($('#avatar-editor'));
    renderAvatarEditor();
  }

  $('#profile-close').addEventListener('click', () => closeProfile(true));
  $('#profile-cancel').addEventListener('click', () => closeProfile(true));
  $('#profile-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const err = $('#profile-error');
    const name = $('#profile-name').value.trim();
    if (!name) { err.textContent = 'Escribe tu nombre.'; return; }
    const saveBtn = $('#profile-save');
    saveBtn.disabled = true;
    err.textContent = '';
    try {
      if (state.account) {
        const body = { name, avatar: state.avatar, username: $('#profile-username').value.trim() };
        if ($('#profile-new').value) {
          body.currentPassword = $('#profile-current').value;
          body.newPassword = $('#profile-new').value;
        }
        const res = await api('PUT', '/api/me', body);
        setAccount(res.profile);
      }
      storage.set('pictionary:name', name);
      storage.set('pictionary:avatar', JSON.stringify(state.avatar));
      nameInput.value = name;
      if (state.joinData && state.me) {
        state.joinData.name = name;
        state.joinData.avatar = state.avatar;
        saveSession();
        socket.emit('player:update', { name, avatar: state.avatar });
      }
      profileBackup = null;
      closeProfile(false);
      if (!state.joinData) showRegisterView(state.account ? 'account' : 'guest');
      toast('✅ Perfil actualizado', 'success');
    } catch (ex) {
      err.textContent = ex.message;
    } finally {
      saveBtn.disabled = false;
    }
  });

  // ─── 2. Lobby ──────────────────────────────────────────────────────────────
  const roundsSelect = $('#rounds-select');
  const muteDrawerInput = $('#mute-drawer');

  const themeSelect = $('#theme-select');
  themeSelect.addEventListener('change', () => { if (themeSelect.value) { vibrate(10); sendSettings({ theme: themeSelect.value }); } });

  function fillSelects() {
    themeSelect.innerHTML = '<option value="" disabled>Elige un tema…</option>'
      + state.themes.map((t) => `<option value="${t.id}">${t.emoji} ${t.label}</option>`).join('');
    roundsSelect.innerHTML = state.roundOptions.map((n) => `<option value="${n}">${n} ${n === 1 ? 'ronda' : 'rondas'}</option>`).join('');
  }

  const isHost = () => state.room && state.room.hostId === state.me;
  const sendSettings = (patch) => socket.emit('lobby:settings', patch);

  roundsSelect.addEventListener('change', () => sendSettings({ rounds: Number(roundsSelect.value) }));
  muteDrawerInput.addEventListener('change', () => sendSettings({ muteDrawer: muteDrawerInput.checked }));
  $('#start-btn').addEventListener('click', () => socket.emit('game:start'));
  $('#lobby-edit').addEventListener('click', () => openProfile());

  // En el celular abre el menú nativo para compartir (WhatsApp, etc.).
  $('#share-btn').addEventListener('click', async () => {
    const url = `${location.origin}${location.pathname}?sala=${encodeURIComponent(state.room.code)}`;
    const text = `¡Juguemos Pictionary! Entra a la sala ${state.room.code}`;
    if (navigator.share) {
      try { await navigator.share({ title: 'Pictionary Online', text, url }); return; } catch (e) { if (e.name === 'AbortError') return; }
    }
    try {
      await navigator.clipboard.writeText(url);
      toast('🔗 Enlace copiado');
    } catch {
      prompt('Copia este enlace:', url);
    }
  });

  document.querySelectorAll('[data-action="leave"]').forEach((b) => b.addEventListener('click', () => {
    storage.set('pictionary:session', '', sessionStorage);
    location.href = location.pathname;
  }));

  function renderPlayerList(listEl, room, { scores = false } = {}) {
    listEl.innerHTML = '';
    const players = scores ? [...room.players].sort((a, b) => b.score - a.score) : room.players;
    players.forEach((p, i) => {
      const li = el('li', 'player');
      li.dataset.id = p.id;
      if (voice.speaking.has(p.id)) li.classList.add('speaking');
      if (p.id === state.me) {
        li.classList.add('me');
        li.title = 'Editar mi perfil';
        li.addEventListener('click', () => openProfile());
      }
      if (!p.connected) li.classList.add('offline');
      if (p.id === room.drawerId && room.phase === 'drawing') li.classList.add('drawing');
      if (p.guessed) li.classList.add('guessed');

      if (scores) li.append(el('span', 'rank', `#${i + 1}`));
      li.append(avatarEl(p.avatar, 'sm'));

      const info = el('div', 'player-info');
      const name = el('span', 'player-name', p.name);
      if (p.id === state.me) name.append(el('small', 'you', ' (tú)'));
      info.append(name);
      if (scores) info.append(el('span', 'player-score', `${p.score} pts`));
      li.append(info);

      const badges = el('span', 'badges');
      if (p.id === room.hostId) badges.append(el('span', 'badge', '👑'));
      if (p.id === room.drawerId && room.phase === 'drawing') badges.append(el('span', 'badge', '✏️'));
      if (p.guessed) badges.append(el('span', 'badge', '✅'));
      if (!p.connected) badges.append(el('span', 'badge', '📴'));
      if (p.voice) {
        const mic = el('span', `badge mic${p.muted ? ' off' : ''}`, p.muted ? '🔇' : '🎙️');
        mic.title = p.muted ? 'Micrófono apagado' : 'En el audio';
        badges.append(mic);
      }
      li.append(badges);
      listEl.append(li);
    });
  }

  function renderLobby(room) {
    const host = isHost();
    $('#lobby-code').textContent = room.code;
    const priv = room.privacy;
    const isOwner = Boolean(priv && state.account && state.account.username === priv.owner);
    $('#privacy-banner').hidden = !priv;
    if (priv) {
      $('#privacy-text').textContent = isOwner
        ? '🔒 Tu sala privada: solo pueden entrar tus amigos. Comparte el enlace con ellos.'
        : `🔒 Sala privada de ${priv.ownerName} (@${priv.owner}): solo entran sus amigos.`;
      $('#privacy-friends').hidden = !isOwner;
    }
    $('#lobby-sub').textContent = priv ? 'Solo tus amigos podrán entrar con el enlace.' : 'Sala abierta: entra cualquiera que tenga el código.';
    $('#lobby-count').textContent = `${room.players.length}/12`;
    renderPlayerList($('#lobby-players'), room, { scores: true });

    const hostName = (room.players.find((p) => p.id === room.hostId) || {}).name || '';
    $('#lobby-role-hint').textContent = host
      ? 'Eres el anfitrión: elige el tema y configura la partida.'
      : `${hostName} (anfitrión) está eligiendo el tema.`;

    themeSelect.value = room.settings.theme || '';
    themeSelect.disabled = !host;
    themeSelect.classList.toggle('empty', !room.settings.theme);
    const theme = state.themes.find((t) => t.id === room.settings.theme);
    $('#theme-info').textContent = theme
      ? `🎡 La ruleta usará las ${theme.count} palabras de ${theme.emoji} ${theme.label}. No se repiten en la partida.`
      : host ? 'Elige un tema para llenar la ruleta de palabras.' : 'Esperando a que el anfitrión elija el tema…';

    roundsSelect.value = room.settings.rounds;
    muteDrawerInput.checked = room.settings.muteDrawer;
    roundsSelect.disabled = !host;
    muteDrawerInput.disabled = !host;

    const startBtn = $('#start-btn');
    const enough = room.players.filter((p) => p.connected).length >= 2;
    startBtn.hidden = !host;
    startBtn.disabled = !enough || !room.settings.theme;
    $('#start-hint').textContent = !host
      ? '⏳ Esperando a que el anfitrión inicie la partida…'
      : !room.settings.theme ? 'Selecciona un tema para empezar.'
      : !enough ? 'Se necesitan al menos 2 jugadores.' : '¡Todo listo!';
  }

  // ─── 3. Juego ──────────────────────────────────────────────────────────────
  const canvas = $('#canvas');
  const ctx = canvas.getContext('2d');

  function clearCanvas() {
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }

  function drawSegment(seg) {
    ctx.strokeStyle = seg.e ? '#ffffff' : '#111111';
    ctx.lineWidth = seg.w;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.beginPath();
    ctx.moveTo(seg.x0 * canvas.width, seg.y0 * canvas.height);
    ctx.lineTo(seg.x1 * canvas.width, seg.y1 * canvas.height);
    ctx.stroke();
  }

  const amDrawer = () => state.room && state.room.phase === 'drawing' && state.room.drawerId === state.me;
  const round4 = (n) => Math.round(n * 10000) / 10000;

  function pointerPos(e) {
    const r = canvas.getBoundingClientRect();
    return {
      x: Math.min(1, Math.max(0, (e.clientX - r.left) / r.width)),
      y: Math.min(1, Math.max(0, (e.clientY - r.top) / r.height))
    };
  }

  function emitSegment(a, b) {
    const seg = { x0: round4(a.x), y0: round4(a.y), x1: round4(b.x), y1: round4(b.y), w: state.tool.size, e: state.tool.eraser };
    drawSegment(seg);
    socket.emit('draw:segment', seg);
  }

  // Dibujo con dedo, lápiz o mouse (Pointer Events). Solo se sigue el primer
  // dedo: un segundo dedo (p. ej. al apoyar la palma) se ignora.
  let activePointer = null;
  let last = null;
  canvas.addEventListener('pointerdown', (e) => {
    if (!amDrawer() || activePointer !== null) return;
    e.preventDefault();
    activePointer = e.pointerId;
    canvas.setPointerCapture(e.pointerId);
    last = pointerPos(e);
    emitSegment(last, last); // un toque deja un punto
  });
  canvas.addEventListener('pointermove', (e) => {
    if (e.pointerId !== activePointer) return;
    e.preventDefault();
    const events = e.getCoalescedEvents ? e.getCoalescedEvents() : [];
    for (const ev of (events.length ? events : [e])) {
      const p = pointerPos(ev);
      emitSegment(last, p);
      last = p;
    }
  });
  const stopDrawing = (e) => { if (e.pointerId === activePointer) { activePointer = null; last = null; } };
  canvas.addEventListener('pointerup', stopDrawing);
  canvas.addEventListener('pointercancel', stopDrawing);
  // Evita el menú contextual / lupa de iOS al mantener presionado el lienzo.
  canvas.addEventListener('contextmenu', (e) => e.preventDefault());
  canvas.addEventListener('touchstart', (e) => { if (amDrawer()) e.preventDefault(); }, { passive: false });

  document.querySelectorAll('.tool.size').forEach((btn) => btn.addEventListener('click', () => {
    state.tool.size = Number(btn.dataset.size);
    state.tool.eraser = false;
    $('#eraser-btn').classList.remove('active');
    canvas.classList.remove('erasing');
    document.querySelectorAll('.tool.size').forEach((b) => b.classList.toggle('active', b === btn));
    vibrate(8);
  }));
  $('#eraser-btn').addEventListener('click', (e) => {
    state.tool.eraser = !state.tool.eraser;
    e.currentTarget.classList.toggle('active', state.tool.eraser);
    canvas.classList.toggle('erasing', state.tool.eraser);
    vibrate(8);
  });
  $('#clear-btn').addEventListener('click', () => { vibrate(20); socket.emit('draw:clear'); });

  function renderWord(room) {
    const display = $('#word-display');
    const caption = $('#word-caption');
    display.innerHTML = '';
    const me = room.players.find((p) => p.id === state.me);

    if (room.phase === 'gameOver') { caption.textContent = 'Fin de la partida'; return; }
    if (room.phase === 'spinning') { caption.textContent = '🎡 Girando la ruleta…'; return; }
    if (!room.mask) { caption.textContent = ''; return; }

    const chars = room.word ? [...room.word] : room.mask;
    const letters = room.mask.filter((c) => c !== ' ').length;
    if (room.phase === 'reveal') caption.textContent = 'La palabra era';
    else if (amDrawer()) caption.textContent = '✏️ Dibuja esto';
    else if (me && me.guessed) caption.textContent = '✅ ¡Adivinaste!';
    else caption.textContent = `🔤 ${letters} letras`;

    chars.forEach((ch, i) => {
      if (ch === ' ') { display.append(el('span', 'gap')); return; }
      const hidden = ch === '_';
      const span = el('span', `letter${hidden ? ' hidden' : ''}${!room.word && !hidden ? ' hint' : ''}`, hidden ? '' : ch);
      span.style.setProperty('--i', i);
      display.append(span);
    });
  }

  function setTimer(seconds) {
    const total = state.room ? state.room.settings.drawTime : 1;
    const s = Math.max(0, seconds);
    const clock = `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`; // 1:30 → 0:00
    $('#timer-text').textContent = clock;
    $('#time-bar-text').textContent = `⏱️ ${clock}`;
    $('#timer-progress').style.strokeDashoffset = String(100 - (s / total) * 100);
    const drawing = state.room && state.room.phase === 'drawing';
    const visible = drawing || (state.room && state.room.phase === 'spinning');
    $('#timer').classList.toggle('urgent', s <= 10 && drawing);
    // Barra de tiempo sobre el lienzo: se vacía y cambia de color
    const pct = Math.max(0, Math.min(100, (s / total) * 100));
    const bar = $('#time-bar');
    $('#time-bar-fill').style.width = `${pct}%`;
    bar.classList.toggle('warn', drawing && s <= 30 && s > 10);
    bar.classList.toggle('urgent', drawing && s <= 10);
    bar.classList.toggle('active', Boolean(visible));
    if (drawing && (s === 10 || s === 3)) vibrate(40);
    if (drawing && s <= 5 && s > 0 && s !== lastTickSecond) { lastTickSecond = s; sfx.beep(s === 1 ? 1320 : 880, 0.09, 'square', 0.05); }
  }
  let lastTickSecond = null;

  // ─── 🎡 Ruleta de palabras ─────────────────────────────────────────────────
  // El servidor decide la casilla ganadora, las vueltas y el desfase; cada
  // cliente anima el mismo giro con requestAnimationFrame (igual en Android
  // y iPhone). Quien adivina ve "?" en lugar de las palabras.
  const WHEEL_COLORS = ['#ffd166', '#63e6be', '#ffa8c5', '#74c0fc', '#ff8787', '#b197fc', '#c0eb75', '#ffa94d'];
  const SVG_NS = 'http://www.w3.org/2000/svg';
  const wheelUI = { key: null, rotor: null, segs: [], raf: 0, spunId: null, countdown: 0, deadline: 0 };

  // Parte la palabra en máximo 2 líneas de ~13 caracteres para que quepa en la casilla.
  function wrapLabel(txt, max = 13) {
    if (txt.length <= max) return [txt];
    const words = txt.split(' ');
    const lines = [''];
    for (const word of words) {
      const cur = lines[lines.length - 1];
      if (!cur) lines[lines.length - 1] = word;
      else if ((cur + ' ' + word).length <= max) lines[lines.length - 1] = cur + ' ' + word;
      else lines.push(word);
    }
    const out = lines.slice(0, 2).map((l) => (l.length > max ? `${l.slice(0, max - 1)}…` : l));
    if (lines.length > 2) out[1] = `${out[1].slice(0, max - 1)}…`;
    return out;
  }
  const easeOut = (t) => 1 - Math.pow(1 - t, 4);

  function svgEl(tag, attrs) {
    const node = document.createElementNS(SVG_NS, tag);
    Object.entries(attrs).forEach(([k, v]) => node.setAttribute(k, v));
    return node;
  }

  function stopWheel() {
    cancelAnimationFrame(wheelUI.raf);
    clearInterval(wheelUI.countdown);
    wheelUI.raf = 0;
    wheelUI.countdown = 0;
    wheelUI.key = null;
    wheelUI.spunId = null;
  }

  function buildWheel(room) {
    const w = room.wheel;
    const overlay = $('#overlay');
    stopWheel();
    overlay.innerHTML = '';
    const theme = state.themes.find((t) => t.id === room.settings.theme);
    const drawerName = (room.players.find((p) => p.id === room.drawerId) || {}).name || '';
    const isDrawer = room.drawerId === state.me;

    const card = el('div', 'overlay-card wheel-card');
    card.append(
      el('p', 'wheel-theme', theme ? `${theme.emoji} ${theme.label}` : ''),
      el('h2', 'wheel-title', isDrawer ? '¡Te toca! Gira la ruleta' : `${drawerName} gira la ruleta`)
    );

    // Ruleta en SVG: casillas en sentido horario empezando arriba.
    const n = w.count;
    const seg = 360 / n;
    const R = 150;
    const svg = svgEl('svg', { viewBox: '-160 -160 320 320', class: 'wheel-svg', 'aria-hidden': 'true' });
    svg.append(svgEl('circle', { r: 157, fill: '#23243a' }));
    wheelUI.segs = [];
    for (let i = 0; i < n; i++) {
      const a0 = ((i * seg - 90) * Math.PI) / 180;
      const a1 = (((i + 1) * seg - 90) * Math.PI) / 180;
      const path = svgEl('path', {
        d: `M0 0 L${(R * Math.cos(a0)).toFixed(2)} ${(R * Math.sin(a0)).toFixed(2)} A${R} ${R} 0 0 1 ${(R * Math.cos(a1)).toFixed(2)} ${(R * Math.sin(a1)).toFixed(2)} Z`,
        fill: WHEEL_COLORS[i % WHEEL_COLORS.length],
        class: 'wheel-seg'
      });
      svg.append(path);
      wheelUI.segs.push(path);

      const mid = i * seg + seg / 2 - 90;
      if (w.items) {
        // palabra a lo largo del radio, en 1 o 2 líneas
        const lines = wrapLabel(w.items[i]);
        const label = svgEl('text', {
          x: R - 12, y: 0, 'text-anchor': 'end', transform: `rotate(${mid})`,
          class: lines.length > 1 ? 'wheel-label two' : 'wheel-label'
        });
        lines.forEach((line, k) => {
          const span = svgEl('tspan', { x: R - 12, dy: k === 0 ? (lines.length > 1 ? '-0.2em' : '0.35em') : '1.1em' });
          span.textContent = line;
          label.append(span);
        });
        svg.append(label);
      } else {
        const label = svgEl('text', {
          x: 0, y: 0, dy: '0.35em', 'text-anchor': 'middle',
          transform: `rotate(${mid}) translate(102 0) rotate(${-mid})`,
          class: 'wheel-label hidden-word'
        });
        label.textContent = '?';
        svg.append(label);
      }
    }
    // bolitas decorativas en el borde
    for (let i = 0; i < n; i++) {
      const a = ((i * seg - 90) * Math.PI) / 180;
      svg.append(svgEl('circle', { cx: (153.5 * Math.cos(a)).toFixed(2), cy: (153.5 * Math.sin(a)).toFixed(2), r: 3, fill: '#fff' }));
    }

    const rotor = el('div', 'wheel-rotor');
    rotor.append(svg);
    const hub = el('button', 'wheel-hub', theme ? theme.emoji : '🎡');
    hub.type = 'button';
    hub.setAttribute('aria-label', 'Girar la ruleta');
    const stage = el('div', 'wheel-stage');
    stage.append(el('div', 'wheel-pointer'), rotor, hub);
    card.append(stage);

    const result = el('p', 'wheel-result');
    const hint = el('p', 'muted small wheel-hint');
    card.append(result, hint);

    if (isDrawer) {
      const btn = el('button', 'btn btn-primary btn-lg wheel-btn', '🎡 Girar la ruleta');
      btn.type = 'button';
      const spin = () => {
        if (btn.disabled) return;
        btn.disabled = true;
        btn.textContent = 'Girando…';
        vibrate(15);
        socket.emit('wheel:spin');
      };
      btn.addEventListener('click', spin);
      hub.addEventListener('click', spin);
      rotor.addEventListener('click', spin);
      hub.classList.add('can-spin');
      rotor.classList.add('can-spin'); // iOS solo envía "click" a elementos con cursor: pointer
      card.append(btn);
    } else {
      hub.disabled = true;
    }

    overlay.append(card);
    overlay.classList.remove('hidden');
    wheelUI.rotor = rotor;
    wheelUI.key = `${w.id}:${w.items ? 'v' : 'h'}`;

    // Cuenta regresiva del giro automático
    wheelUI.deadline = performance.now() + w.autoIn;
    const updateHint = () => {
      if (wheelUI.spunId !== null) return;
      const secs = Math.max(0, Math.ceil((wheelUI.deadline - performance.now()) / 1000));
      hint.textContent = isDrawer ? `Toca la ruleta o el botón · gira sola en ${secs} s` : 'Prepárate para adivinar…';
    };
    updateHint();
    wheelUI.countdown = setInterval(updateHint, 250);
  }

  function animateSpin(room) {
    const w = room.wheel;
    const sp = w.spin;
    wheelUI.spunId = w.id;
    clearInterval(wheelUI.countdown);
    const card = $('#overlay .wheel-card');
    const btn = card.querySelector('.wheel-btn');
    if (btn) { btn.disabled = true; btn.textContent = 'Girando…'; }
    card.querySelector('.wheel-hub').classList.remove('can-spin');
    wheelUI.rotor.classList.remove('can-spin');
    card.querySelector('.wheel-hint').textContent = '';

    const seg = 360 / w.count;
    const center = sp.target * seg + seg / 2;
    const finalRot = sp.turns * 360 + (360 - center) - sp.jitter * seg;
    const start = performance.now() - sp.elapsed;
    let lastIdx = -1;

    const finish = () => {
      wheelUI.rotor.style.transform = `rotate(${finalRot}deg)`;
      // contorno de la casilla ganadora, encima de todo para que se vea completo
      const outline = wheelUI.segs[sp.target].cloneNode(false);
      outline.setAttribute('class', 'wheel-win');
      wheelUI.segs[sp.target].ownerSVGElement.append(outline);
      const isDrawer = room.drawerId === state.me;
      const result = card.querySelector('.wheel-result');
      result.textContent = isDrawer && w.items ? `✏️ ${w.items[sp.target]}` : '¡Palabra elegida! 👀';
      result.classList.add('show');
      if (btn) btn.hidden = true;
      sfx.win();
      vibrate(isDrawer ? [40, 40, 90] : 30);
    };

    if (sp.elapsed >= sp.duration) { finish(); return; } // entró tarde: muestra el resultado

    const frame = (now) => {
      const t = Math.min(1, (now - start) / sp.duration);
      const rot = finalRot * easeOut(t);
      wheelUI.rotor.style.transform = `rotate(${rot}deg)`;
      // "tic" cada vez que una casilla pasa por la flecha
      const idx = Math.floor((((360 - (rot % 360)) % 360) + 360) % 360 / seg);
      if (idx !== lastIdx) {
        if (lastIdx !== -1) { sfx.tick(); if (t < 0.85) vibrate(4); }
        lastIdx = idx;
      }
      if (t < 1) wheelUI.raf = requestAnimationFrame(frame);
      else finish();
    };
    wheelUI.raf = requestAnimationFrame(frame);
  }

  function renderWheel(room) {
    const w = room.wheel;
    if (wheelUI.key !== `${w.id}:${w.items ? 'v' : 'h'}`) buildWheel(room);
    if (w.spin && wheelUI.spunId !== w.id) animateSpin(room);
  }

  function renderOverlay(room) {
    const overlay = $('#overlay');
    if (room.phase === 'spinning' && room.wheel) { renderWheel(room); return; }
    stopWheel();
    overlay.innerHTML = '';

    if (room.phase === 'reveal' && room.lastTurn) {
      const box = el('div', 'overlay-card');
      box.append(el('p', 'muted', 'La palabra era'), el('h2', 'reveal-word', room.lastTurn.word));
      if (room.lastTurn.gains.length) {
        const ul = el('ul', 'gains');
        room.lastTurn.gains.forEach((g) => {
          const li = el('li');
          li.append(avatarEl(g.avatar, 'sm'), el('span', 'gain-name', g.name), el('strong', 'gain-pts', `+${g.points}`));
          ul.append(li);
        });
        box.append(ul);
      } else {
        box.append(el('p', 'muted', room.lastTurn.reason === 'time' ? '⏰ Se acabó el tiempo y nadie adivinó: nadie suma puntos 😅' : 'Nadie adivinó esta vez 😅'));
      }
      box.append(el('p', 'muted small', 'Siguiente turno en unos segundos…'));
      overlay.append(box);
      overlay.classList.remove('hidden');
      return;
    }

    if (room.phase === 'gameOver' && room.ranking) {
      const box = el('div', 'overlay-card');
      box.append(el('h2', null, '🏆 ¡Fin de la partida!'));
      const podium = el('div', 'podium');
      const medals = ['🥇', '🥈', '🥉'];
      [1, 0, 2].forEach((pos) => {
        const p = room.ranking[pos];
        if (!p) return;
        const col = el('div', `podium-col place-${pos + 1}`);
        col.append(avatarEl(p.avatar, pos === 0 ? 'lg' : 'md'), el('span', 'podium-name', p.name), el('span', 'podium-score', `${p.score} pts`), el('div', 'podium-step', medals[pos]));
        podium.append(col);
      });
      box.append(podium);
      if (room.ranking.length > 3) {
        const rest = el('ul', 'rest-list');
        room.ranking.slice(3).forEach((p, i) => {
          const li = el('li');
          li.append(el('span', null, `#${i + 4} ${p.name}`), el('span', null, `${p.score} pts`));
          rest.append(li);
        });
        box.append(rest);
      }
      if (isHost()) {
        const btn = el('button', 'btn btn-primary btn-lg', 'Volver al lobby');
        btn.type = 'button';
        btn.addEventListener('click', () => socket.emit('game:lobby'));
        box.append(btn);
      } else {
        box.append(el('p', 'muted', 'Esperando a que el anfitrión vuelva al lobby…'));
      }
      overlay.append(box);
      overlay.classList.remove('hidden');
      return;
    }

    overlay.classList.add('hidden');
  }

  function renderGame(room) {
    const theme = state.themes.find((t) => t.id === room.settings.theme);
    $('#round-label').textContent = `Ronda ${Math.max(1, room.round)}/${room.settings.rounds}`;
    $('#theme-label').textContent = theme ? `${theme.emoji} ${theme.label}` : '';
    renderPlayerList($('#game-players'), room, { scores: true });
    renderWord(room);
    setTimer(room.timeLeft);
    renderOverlay(room);

    const drawer = amDrawer();
    const me = room.players.find((p) => p.id === state.me);
    $('#game').classList.toggle('is-drawer', drawer);
    $('#toolbar').classList.toggle('visible', drawer);
    $('#guess-hint').classList.toggle('visible', room.phase === 'drawing' && !drawer && !(me && me.guessed));
    canvas.classList.toggle('can-draw', drawer);

    chatInput.disabled = drawer;
    if (drawer && document.activeElement === chatInput) chatInput.blur();
    chatInput.placeholder = drawer ? 'Estás dibujando… 🎨'
      : me && me.guessed && room.phase === 'drawing' ? 'Ya adivinaste: chatea con quienes acertaron'
      : 'Escribe tu respuesta…';
  }

  function render() {
    const room = state.room;
    if (!room) return;
    const theme = state.themes.find((t) => t.id === room.settings.theme);
    applyThemeColors(theme && theme.colors);
    if (room.phase === 'lobby') {
      showScreen('screen-lobby');
      renderLobby(room);
    } else {
      showScreen('screen-game');
      renderGame(room);
    }
    renderVoiceControls();
    applyMicState();

    // Aviso (y vibración) cuando empieza tu turno de dibujar.
    const newTurn = room.phase === 'drawing' && (state.lastPhase !== 'drawing' || state.lastDrawerId !== room.drawerId);
    if (newTurn && amDrawer()) {
      toast(`🎨 ¡Te toca dibujar: ${room.word}!`, 'success');
      vibrate([80, 60, 80]);
    }
    state.lastPhase = room.phase;
    state.lastDrawerId = room.drawerId;
    updateWakeLock();
    updateViewport();
  }

  // ─── Chat de voz (WebRTC en malla: cada jugador se conecta con los demás) ──
  // El audio viaja directo entre navegadores; el servidor solo intercambia las
  // ofertas/respuestas SDP y los candidatos ICE.
  const voice = {
    active: false,
    joining: false,
    wasActive: false,   // para volver al audio solo tras una reconexión
    muted: false,       // silencio elegido por el jugador
    sentMuted: null,    // último estado enviado al servidor
    stream: null,
    iceServers: [],
    peers: new Map(),   // id -> { pc, audio, pending: [] }
    meters: new Map(),  // id -> { analyser, data, source }
    speaking: new Set(),
    audioCtx: null,
    meterTimer: null
  };

  const drawerMuted = () => Boolean(state.room && state.room.settings.muteDrawer && amDrawer());

  async function joinVoice() {
    if (voice.active || voice.joining) return;
    sfx.unlock(); // dentro del toque: en iOS el audio solo se habilita así
    if (!window.isSecureContext || !navigator.mediaDevices || !window.RTCPeerConnection) {
      voice.wasActive = false;
      toast('El audio requiere abrir el juego con https:// o en localhost', 'warn');
      return;
    }
    voice.joining = true;
    renderVoiceControls();
    try {
      voice.stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
        video: false
      });
    } catch {
      voice.joining = false;
      voice.wasActive = false;
      renderVoiceControls();
      toast('No se pudo usar el micrófono. Revisa los permisos del navegador.', 'warn');
      return;
    }
    voice.audioCtx = voice.audioCtx || sfx.ctx || new (window.AudioContext || window.webkitAudioContext)();
    voice.audioCtx.resume().catch(() => {});
    voice.active = true;
    voice.wasActive = true;
    voice.joining = false;
    voice.sentMuted = false;
    addMeter(state.me, voice.stream);
    startMeterLoop();

    socket.emit('voice:join', null, (res) => {
      voice.iceServers = res.iceServers || [];
      res.peers.forEach(callPeer);
      voice.sentMuted = null;
      applyMicState();
    });
    renderVoiceControls();
    toast('🎙️ Te uniste al audio');
  }

  function leaveVoice(notify = true) {
    if (notify) {
      socket.emit('voice:leave');
      voice.wasActive = false;
    }
    [...voice.peers.keys()].forEach(closePeer);
    removeMeter(state.me);
    if (voice.stream) voice.stream.getTracks().forEach((t) => t.stop());
    voice.stream = null;
    voice.active = false;
    voice.sentMuted = null;
    clearInterval(voice.meterTimer);
    voice.meterTimer = null;
    voice.speaking.clear();
    document.querySelectorAll('.player.speaking').forEach((n) => n.classList.remove('speaking'));
    renderVoiceControls();
  }

  function createPeer(id) {
    const pc = new RTCPeerConnection({ iceServers: voice.iceServers });
    const entry = { pc, audio: null, pending: [] };
    voice.peers.set(id, entry);
    voice.stream.getTracks().forEach((t) => pc.addTrack(t, voice.stream));

    pc.onicecandidate = (e) => {
      if (e.candidate) socket.emit('voice:signal', { to: id, data: { candidate: e.candidate } });
    };
    pc.ontrack = (e) => {
      if (!entry.audio) {
        entry.audio = document.createElement('audio');
        entry.audio.autoplay = true;
        entry.audio.playsInline = true;
        $('#voice-audio').append(entry.audio);
      }
      entry.audio.srcObject = e.streams[0];
      entry.audio.play().catch(() => {});
      addMeter(id, e.streams[0]);
    };
    pc.onconnectionstatechange = () => {
      if (pc.connectionState === 'failed') {
        closePeer(id);
        toast('No se pudo conectar el audio con un jugador (red restringida).', 'warn');
      }
    };
    return entry;
  }

  function closePeer(id) {
    const entry = voice.peers.get(id);
    if (!entry) return;
    entry.pc.close();
    if (entry.audio) { entry.audio.srcObject = null; entry.audio.remove(); }
    voice.peers.delete(id);
    removeMeter(id);
  }

  async function flushCandidates(entry) {
    for (const c of entry.pending.splice(0)) {
      try { await entry.pc.addIceCandidate(c); } catch { /* candidato obsoleto */ }
    }
  }

  async function callPeer(id) {
    const entry = createPeer(id);
    const offer = await entry.pc.createOffer();
    await entry.pc.setLocalDescription(offer);
    socket.emit('voice:signal', { to: id, data: { sdp: entry.pc.localDescription } });
  }

  socket.on('voice:signal', async ({ from, data }) => {
    if (!voice.active || !data) return;
    try {
      if (data.sdp && data.sdp.type === 'offer') {
        closePeer(from);
        const entry = createPeer(from);
        await entry.pc.setRemoteDescription(data.sdp);
        await flushCandidates(entry);
        const answer = await entry.pc.createAnswer();
        await entry.pc.setLocalDescription(answer);
        socket.emit('voice:signal', { to: from, data: { sdp: entry.pc.localDescription } });
      } else if (data.sdp && data.sdp.type === 'answer') {
        const entry = voice.peers.get(from);
        if (!entry) return;
        await entry.pc.setRemoteDescription(data.sdp);
        await flushCandidates(entry);
      } else if (data.candidate) {
        const entry = voice.peers.get(from);
        if (!entry) return;
        if (entry.pc.remoteDescription) await entry.pc.addIceCandidate(data.candidate);
        else entry.pending.push(data.candidate);
      }
    } catch (err) {
      console.warn('Error de señalización de voz', err);
    }
  });

  socket.on('voice:peer-left', ({ id }) => closePeer(id));

  // Micrófono efectivo = elección del jugador + silencio automático del dibujante.
  function applyMicState() {
    if (!voice.active || !voice.stream) return;
    const off = voice.muted || drawerMuted();
    voice.stream.getAudioTracks().forEach((t) => { t.enabled = !off; });
    if (voice.sentMuted !== off) {
      voice.sentMuted = off;
      socket.emit('voice:mute', off);
    }
  }

  function toggleMute() {
    voice.muted = !voice.muted;
    vibrate(10);
    applyMicState();
    renderVoiceControls();
  }

  // Indicador de "está hablando": analiza el volumen de cada flujo de audio.
  function addMeter(id, stream) {
    removeMeter(id);
    if (!voice.audioCtx) return;
    const source = voice.audioCtx.createMediaStreamSource(stream);
    const analyser = voice.audioCtx.createAnalyser();
    analyser.fftSize = 512;
    source.connect(analyser);
    voice.meters.set(id, { source, analyser, data: new Uint8Array(analyser.fftSize) });
  }

  function removeMeter(id) {
    const m = voice.meters.get(id);
    if (m) m.source.disconnect();
    voice.meters.delete(id);
    voice.speaking.delete(id);
  }

  function startMeterLoop() {
    if (voice.meterTimer) return;
    voice.meterTimer = setInterval(() => {
      for (const [id, m] of voice.meters) {
        m.analyser.getByteTimeDomainData(m.data);
        let sum = 0;
        for (const v of m.data) sum += (v - 128) * (v - 128);
        const player = state.room && state.room.players.find((p) => p.id === id);
        const talking = Math.sqrt(sum / m.data.length) > 4 && !(player && player.muted);
        if (talking !== voice.speaking.has(id)) {
          if (talking) voice.speaking.add(id); else voice.speaking.delete(id);
          document.querySelectorAll(`.player[data-id="${id}"]`).forEach((n) => n.classList.toggle('speaking', talking));
        }
      }
    }, 150);
  }

  function renderVoiceControls() {
    const forced = voice.active && drawerMuted();
    document.querySelectorAll('.voice-controls').forEach((box) => {
      box.innerHTML = '';
      if (!voice.active) {
        const join = el('button', 'btn btn-ghost voice-btn');
        join.type = 'button';
        join.disabled = voice.joining;
        join.title = 'Unirse al audio';
        join.setAttribute('aria-label', 'Unirse al audio');
        join.append(voice.joining ? '⏳' : '🎙️', el('span', 'label', voice.joining ? 'Conectando…' : 'Audio'));
        join.addEventListener('click', joinVoice);
        box.append(join);
        return;
      }
      const off = voice.muted || forced;
      const mute = el('button', `btn voice-btn ${off ? 'btn-muted' : 'btn-live'}`, off ? '🔇' : '🎤');
      mute.type = 'button';
      mute.disabled = forced;
      mute.title = forced ? 'Silenciado mientras dibujas' : voice.muted ? 'Activar micrófono' : 'Silenciar micrófono';
      mute.setAttribute('aria-label', mute.title);
      mute.addEventListener('click', toggleMute);
      const leave = el('button', 'btn btn-ghost voice-btn', '📞');
      leave.type = 'button';
      leave.title = 'Salir del audio';
      leave.setAttribute('aria-label', 'Salir del audio');
      leave.addEventListener('click', () => leaveVoice());
      box.append(mute, leave);
    });
  }

  // ─── Chat ──────────────────────────────────────────────────────────────────
  const messages = $('#messages');

  function scrollMessagesToEnd() {
    messages.scrollTop = messages.scrollHeight;
  }

  function pushMessage(li) {
    const nearBottom = messages.scrollHeight - messages.scrollTop - messages.clientHeight < 60;
    messages.append(li);
    while (messages.children.length > 150) messages.firstChild.remove();
    if (nearBottom) scrollMessagesToEnd();
  }

  // Enviar sin cerrar el teclado, para seguir intentando rápido.
  $('#chat-form').addEventListener('submit', (e) => {
    e.preventDefault();
    const text = chatInput.value.trim();
    if (!text) return;
    socket.emit('chat:send', text);
    chatInput.value = '';
    chatInput.focus();
  });

  // ─── Eventos del servidor ──────────────────────────────────────────────────
  socket.on('connect', () => {
    $('#net-banner').hidden = true;
    if (state.joinData) join();
  });
  socket.on('connect_error', () => {
    $('#join-btn').disabled = false;
    if (!state.room) $('#register-error').textContent = 'No se pudo conectar con el servidor.';
  });
  socket.on('disconnect', () => {
    if (voice.active) leaveVoice(false);
    if (state.joinData) $('#net-banner').hidden = false;
  });
  socket.io.on('reconnect', () => { $('#net-banner').hidden = true; });
  window.addEventListener('online', () => { if (state.joinData && !socket.connected) socket.connect(); });
  socket.on('session:replaced', () => {
    state.joinData = null;
    $('#net-banner').hidden = true;
    toast('Abriste la partida en otra pestaña.', 'warn');
  });

  socket.on('room:state', (room) => { state.room = room; render(); });
  socket.on('timer', setTimer);

  socket.on('draw:segment', drawSegment);
  socket.on('canvas:clear', clearCanvas);
  socket.on('canvas:history', (segs) => { clearCanvas(); segs.forEach(drawSegment); });

  socket.on('chat:message', (m) => {
    const li = el('li', `msg${m.private ? ' private' : ''}${m.id === state.me ? ' mine' : ''}`);
    li.append(avatarEl(m.avatar, 'xs'));
    const body = el('div', 'msg-body');
    body.append(el('span', 'msg-name', m.name), el('span', 'msg-text', m.text));
    li.append(body);
    pushMessage(li);
  });

  socket.on('chat:system', (m) => pushMessage(el('li', `msg system ${m.kind || 'info'}`, m.text)));
  socket.on('guess:correct', () => vibrate([60, 40, 120]));

  // Alguien escribió la palabra exacta: se anuncia en pantalla y en voz alta.
  socket.on('guess:announce', ({ id, name, avatar, points }) => {
    const mine = id === state.me;
    const pts = `${points} ${points === 1 ? 'punto' : 'puntos'}`;
    announce(avatar, mine ? `¡Ganaste ${pts}!` : `¡${name} ganó ${pts}!`);
    sfx.win();
    speech.say(mine ? `¡Correcto! Ganaste ${pts}` : `${name} ganó ${pts}`);
  });

  // ─── PWA: service worker para instalar la app en el celular ────────────────
  if ('serviceWorker' in navigator && window.isSecureContext) {
    window.addEventListener('load', () => navigator.serviceWorker.register('sw.js').catch(() => {}));
  }

  clearCanvas();
  updateViewport();
  applyThemeColors(null);
  buildHero();
  updateInstallButton();
  initRegister();
  renderVoiceControls();
  renderSoundToggles();
})();
