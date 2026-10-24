/* ═══════════════════════════════════════════════════════════════════════════
   Avatar personalizable en SVG (estilo anime japonés)
   Rasgos: sexo, color de piel, tipo y color de cabello, tipo y color de ojos,
   tipo de labios, barba, lentes (marco de colores; cristales transparentes
   o de color), playera (lisa o de rayas, dos colores) y fondo.
   Se ven cuello y hombros. Parpadea y se mueve (CSS).
   Los límites de cada rasgo deben coincidir con AVATAR_LIMITS de server.js.
   ═══════════════════════════════════════════════════════════════════════════ */
(() => {
  'use strict';

  const SKIN = [
    { name: 'Muy clara', c: '#ffe0c7' },
    { name: 'Clara', c: '#f6c9a0' },
    { name: 'Trigueña', c: '#e2a676' },
    { name: 'Morena clara', c: '#c58450' },
    { name: 'Morena', c: '#8f5a34' },
    { name: 'Oscura', c: '#5e3a22' }
  ];
  const HAIR_COLORS = [
    { name: 'Negro', c: '#1f1a17' },
    { name: 'Castaño oscuro', c: '#4a2c1a' },
    { name: 'Castaño', c: '#83512c' },
    { name: 'Rubio', c: '#e3bb63' },
    { name: 'Pelirrojo', c: '#b8482a' },
    { name: 'Canoso', c: '#c4c4c8' },
    { name: 'Azul', c: '#4d6bff' },
    { name: 'Rosa', c: '#ff6fae' }
  ];
  const EYE_COLORS = [
    { name: 'Café', c: '#6b3e1f' },
    { name: 'Negro', c: '#1c1c1c' },
    { name: 'Azul', c: '#3d8bd9' },
    { name: 'Verde', c: '#3f9a52' },
    { name: 'Avellana', c: '#a5772f' },
    { name: 'Gris', c: '#8a96a3' }
  ];
  const BG = [
    { name: 'Lavanda', c: '#e4e4fb' },
    { name: 'Menta', c: '#d5f5e8' },
    { name: 'Durazno', c: '#ffe3d1' },
    { name: 'Cielo', c: '#d6ecff' },
    { name: 'Rosa', c: '#ffdcea' },
    { name: 'Limón', c: '#f5f3c2' },
    { name: 'Lila', c: '#eddcff' },
    { name: 'Gris', c: '#e6e8ee' }
  ];
  const SHIRT_COLORS = [
    { name: 'Blanco', c: '#f8f9fa' },
    { name: 'Negro', c: '#26283a' },
    { name: 'Gris', c: '#868e96' },
    { name: 'Rojo', c: '#e03131' },
    { name: 'Naranja', c: '#f76707' },
    { name: 'Amarillo', c: '#fcc419' },
    { name: 'Verde', c: '#2f9e44' },
    { name: 'Azul', c: '#1c7ed6' },
    { name: 'Morado', c: '#7048e8' },
    { name: 'Rosa', c: '#e64980' }
  ];
  const SHIRT_TYPES = ['Lisa', 'Rayas', 'Rayitas', 'Verticales'];
  const HAIR_TYPES = ['Calvo', 'Corto', 'Rapado', 'Rizado', 'Largo', 'Moño', 'Melena', 'Cresta'];
  const EYE_TYPES = ['Normales', 'Grandes', 'Almendrados', 'Con pestañas', 'Felices', 'Guiño'];
  const GLASSES_TYPES = ['Sin lentes', 'Redondos', 'Cuadrados', 'Aviador', 'Ojo de gato'];
  const FRAME_COLORS = [
    { name: 'Negro', c: '#23243a' },
    { name: 'Carey', c: '#7a4a2a' },
    { name: 'Dorado', c: '#d4a72c' },
    { name: 'Plateado', c: '#aab2bd' },
    { name: 'Rojo', c: '#e03131' },
    { name: 'Azul', c: '#1c7ed6' },
    { name: 'Rosa', c: '#e64980' },
    { name: 'Verde', c: '#2f9e44' },
    { name: 'Morado', c: '#7048e8' },
    { name: 'Blanco', c: '#f8f9fa' }
  ];
  // Cristales: transparentes (solo se ve el marco) o de color.
  const LENSES = [
    { name: 'Transparentes (solo marco)', c: 'rgba(255,255,255,.12)', sw: 'repeating-conic-gradient(#dfe1ea 0 25%, #fff 0 50%) 0 0 / 12px 12px' },
    { name: 'Oscuros', c: 'rgba(25,25,35,.88)', sw: '#24242e' },
    { name: 'Azules', c: 'rgba(51,154,240,.6)', sw: '#5fb0f5' },
    { name: 'Rosas', c: 'rgba(240,101,149,.6)', sw: '#f37ea6' },
    { name: 'Verdes', c: 'rgba(64,192,87,.55)', sw: '#6ccf7f' },
    { name: 'Amarillos', c: 'rgba(252,196,25,.6)', sw: '#fdd255' },
    { name: 'Morados', c: 'rgba(132,94,247,.6)', sw: '#9d80f8' }
  ];
  const LIP_TYPES = ['Sonrisa', 'Risa', 'Labios gruesos', 'Serio', 'Sorpresa', 'Lengua'];
  const BEARD_TYPES = ['Sin barba', 'Completa', 'Candado', 'Bigote', 'De 3 días', 'Bigote y candado'];

  const SPEC = {
    g: [{ id: 'h', name: 'Hombre' }, { id: 'm', name: 'Mujer' }],
    skin: SKIN, hair: HAIR_TYPES, hairColor: HAIR_COLORS, eyes: EYE_TYPES,
    eyeColor: EYE_COLORS, lips: LIP_TYPES, beard: BEARD_TYPES, bg: BG,
    shirt: SHIRT_TYPES, shirtColor: SHIRT_COLORS, stripeColor: SHIRT_COLORS,
    glasses: GLASSES_TYPES, glassesColor: FRAME_COLORS, lens: LENSES
  };

  const DEFAULTS = {
    h: { g: 'h', skin: 1, hair: 1, hairColor: 1, eyes: 0, eyeColor: 0, lips: 0, beard: 0, bg: 3, shirt: 0, shirtColor: 7, stripeColor: 0, glasses: 0, glassesColor: 0, lens: 0 },
    m: { g: 'm', skin: 1, hair: 4, hairColor: 2, eyes: 3, eyeColor: 0, lips: 2, beard: 0, bg: 4, shirt: 0, shirtColor: 9, stripeColor: 0, glasses: 0, glassesColor: 0, lens: 0 }
  };

  const clampInt = (v, n) => {
    const x = parseInt(v, 10);
    return Number.isInteger(x) ? Math.min(n - 1, Math.max(0, x)) : 0;
  };

  // Normaliza cualquier valor (incluidos avatares viejos numéricos) a un avatar válido.
  function normalize(a) {
    if (!a || typeof a !== 'object') return { ...DEFAULTS.h };
    const g = a.g === 'm' ? 'm' : 'h';
    const out = { g };
    out.skin = clampInt(a.skin, SKIN.length);
    out.hair = clampInt(a.hair, HAIR_TYPES.length);
    out.hairColor = clampInt(a.hairColor, HAIR_COLORS.length);
    out.eyes = clampInt(a.eyes, EYE_TYPES.length);
    out.eyeColor = clampInt(a.eyeColor, EYE_COLORS.length);
    out.lips = clampInt(a.lips, LIP_TYPES.length);
    out.beard = g === 'm' ? 0 : clampInt(a.beard, BEARD_TYPES.length);
    out.bg = clampInt(a.bg, BG.length);
    out.shirt = clampInt(a.shirt, SHIRT_TYPES.length);
    out.shirtColor = a.shirtColor === undefined ? 7 : clampInt(a.shirtColor, SHIRT_COLORS.length);
    out.stripeColor = clampInt(a.stripeColor, SHIRT_COLORS.length);
    out.glasses = clampInt(a.glasses, GLASSES_TYPES.length);
    out.glassesColor = clampInt(a.glassesColor, FRAME_COLORS.length);
    out.lens = clampInt(a.lens, LENSES.length);
    // Avatares guardados antes de v1.6: "Con lentes" era un tipo de ojos.
    if (a.glasses === undefined && parseInt(a.eyes, 10) === 5) { out.eyes = 0; out.glasses = 1; }
    return out;
  }

  function random() {
    const pick = (n) => Math.floor(Math.random() * n);
    const g = Math.random() < 0.5 ? 'h' : 'm';
    return normalize({
      g,
      skin: pick(SKIN.length),
      hair: g === 'm' ? [3, 4, 5, 6][pick(4)] : [0, 1, 2, 3, 7][pick(5)],
      hairColor: Math.random() < 0.8 ? pick(6) : pick(HAIR_COLORS.length),
      eyes: g === 'm' ? [1, 2, 3, 4][pick(4)] : [0, 1, 2, 4][pick(4)],
      eyeColor: pick(EYE_COLORS.length),
      lips: pick(LIP_TYPES.length),
      beard: g === 'h' && Math.random() < 0.5 ? pick(BEARD_TYPES.length) : 0,
      bg: pick(BG.length),
      shirt: pick(SHIRT_TYPES.length),
      shirtColor: pick(SHIRT_COLORS.length),
      stripeColor: pick(SHIRT_COLORS.length),
      glasses: Math.random() < 0.35 ? 1 + pick(GLASSES_TYPES.length - 1) : 0,
      glassesColor: pick(FRAME_COLORS.length),
      lens: Math.random() < 0.6 ? 0 : pick(LENSES.length)
    });
  }

  // Oscurece un color hex (para sombras, nariz y labios).
  function shade(hex, f) {
    const n = parseInt(hex.slice(1), 16);
    // f > 1 aclara (los colores muy oscuros también: se suma un poco de luz).
    const ch = (x) => Math.max(0, Math.min(255, Math.round(f > 1 ? x * f + (f - 1) * 60 : x * f)));
    return `#${[(n >> 16) & 255, (n >> 8) & 255, n & 255].map((x) => ch(x).toString(16).padStart(2, '0')).join('')}`;
  }

  // ─── Piezas (estilo anime) ──────────────────────────────────────────────
  // Cabello: degradado (más claro arriba), mechones en punta y un brillo
  // tipo "anillo de luz". Las piezas usan los degradados definidos en render().
  const SHINE = (op = 0.45) => `<path d="M34 29 Q50 22 66 29" stroke="#fff" stroke-width="2.4" fill="none" stroke-linecap="round" stroke-dasharray="7 3 4 3" opacity="${op}"/>`;

  function hairBack(type, fill) {
    switch (type) {
      case 1: return `<path d="M25 46 C24 22 76 22 75 46 L74 54 L26 54 Z" fill="${fill}"/>`; // corto: volumen detrás
      case 3: { // rizado: rizos detrás de la cabeza
        let out = '';
        for (let i = 0; i <= 12; i++) {
          const a = Math.PI * (0.92 + i * 0.097);
          out += `<circle cx="${(50 + 28 * Math.cos(a)).toFixed(1)}" cy="${(47 + 28 * Math.sin(a)).toFixed(1)}" r="8" fill="${fill}"/>`;
        }
        return out + `<circle cx="23" cy="60" r="7" fill="${fill}"/><circle cx="77" cy="60" r="7" fill="${fill}"/>`;
      }
      case 4: // largo: cae por la espalda con puntas
        return `<path d="M24 44 C21 17 79 17 76 44 L80 82 L75 79 L73 89 L66 83 L61 92 L55 85 L50 93 L45 85 L39 92 L34 83 L27 89 L25 79 L20 82 Z" fill="${fill}"/>`;
      case 5: return `<path d="M25 46 C24 22 76 22 75 46 L74 54 L26 54 Z" fill="${fill}"/>`;
      case 6: // melena (bob) con puntas hacia adentro
        return `<path d="M22 46 C22 17 78 17 78 46 L79 68 Q76 73 71 69 L68 74 Q50 77 32 74 L29 69 Q24 73 21 68 Z" fill="${fill}"/>`;
      default: return '';
    }
  }

  function hairFront(type, fill, base) {
    const dark = shade(base, 0.72);
    const strands = (d) => `<path d="${d}" stroke="${dark}" stroke-width=".8" fill="none" stroke-linecap="round" opacity=".7"/>`;
    switch (type) {
      case 1: // corto: flequillo en puntas
        return `<path d="M25 49 C23 25 36 17 50 17 C64 17 77 25 75 49 L72 41 L69 47 L65 36 L60 44 L55 33 L50 43 L44 33 L40 44 L35 36 L31 47 L28 41 Z" fill="${fill}"/>`
          + strands('M44 33 L42 25 M55 33 L56 25 M35 36 L36 29') + SHINE();
      case 2: // rapado: casi al ras, con textura
        return `<path d="M28 44 C29 27 40 22 50 22 C60 22 71 27 72 44 C68 35 60 31 50 31 C40 31 32 35 28 44 Z" fill="${fill}" opacity=".88"/>`
          + `<path d="M33 33 Q50 25 67 33" stroke="#fff" stroke-width="1.2" fill="none" opacity=".25"/>`;
      case 3: { // rizado
        let out = '';
        const pts = [[28, 41], [32, 32], [39, 26], [47, 22], [55, 22], [62, 26], [68, 32], [72, 41], [43, 31], [57, 31], [50, 29]];
        pts.forEach(([x, y]) => { out += `<circle cx="${x}" cy="${y}" r="6.6" fill="${fill}"/><path d="M${x - 3} ${y - 1} q3 -3 5 0" stroke="#fff" stroke-width=".9" fill="none" opacity=".35"/>`; });
        return out;
      }
      case 4: // largo: flequillo de lado y mechones a los lados de la cara
        return `<path d="M23 60 C19 24 37 16 50 16 C65 16 81 24 77 60 L74 50 L73 64 L70 42 L64 34 L60 43 L54 31 L48 41 L41 32 L36 42 L32 37 L30 52 L27 66 Z" fill="${fill}"/>`
          + strands('M54 31 L57 22 M41 32 L43 23 M70 42 L69 30') + SHINE();
      case 5: // moño alto
        return `<circle cx="50" cy="14" r="9.5" fill="${fill}"/><path d="M44 13 Q50 8 56 13" stroke="#fff" stroke-width="1.4" fill="none" opacity=".4"/>`
          + `<path d="M26 47 C25 26 39 20 50 20 C61 20 75 26 74 47 L71 40 L66 43 L62 34 L56 40 L50 32 L44 40 L38 34 L34 43 L29 40 Z" fill="${fill}"/>` + SHINE(0.4);
      case 6: // melena con flequillo recto (hime)
        return `<path d="M23 52 C21 23 38 17 50 17 C62 17 79 23 77 52 L74 52 L73 40 L68 42 L63 40 L57 42 L50 40 L43 42 L37 40 L32 42 L27 40 L26 52 Z" fill="${fill}"/>`
          + strands('M37 40 L38 28 M50 40 L50 27 M63 40 L62 28') + SHINE();
      case 7: // cresta en punta
        return `<path d="M29 42 C31 29 41 25 50 25 C59 25 69 29 71 42 C67 36 60 33 50 33 C40 33 33 36 29 42 Z" fill="${fill}" opacity=".45"/>`
          + `<path d="M42 32 L40 15 L46 22 L50 6 L54 22 L60 15 L58 32 Q50 34 42 32 Z" fill="${fill}"/>`;
      default: return '';
    }
  }

  // Sombra que el flequillo proyecta sobre la frente.
  const BANG_SHADOW = new Set([1, 4, 5, 6]);

  // Ojos grandes estilo anime: delineado grueso arriba, iris con degradado,
  // pupila y dos brillos. La clase av-eyes permite el parpadeo (CSS).
  function eyes(type, irisFill, lineColor) {
    const one = (x) => {
      const out = x < 50 ? -1 : 1; // lado exterior del ojo
      const open = (rx, ry, irx, iry) => `<ellipse cx="${x}" cy="50.5" rx="${rx}" ry="${ry}" fill="#fff"/>`
        + `<ellipse cx="${x + out * 0.3}" cy="51" rx="${irx}" ry="${iry}" fill="${irisFill}"/>`
        + `<ellipse cx="${x + out * 0.3}" cy="51.6" rx="${irx * 0.45}" ry="${iry * 0.5}" fill="#160e1a"/>`
        + `<ellipse cx="${x + 1.6}" cy="${51 - iry * 0.45}" rx="1.6" ry="1.3" fill="#fff"/>`
        + `<circle cx="${x - 1.4}" cy="${51 + iry * 0.5}" r=".7" fill="#fff" opacity=".85"/>`
        + `<path d="M${x - rx - 0.8} ${50.5 - ry * 0.35} Q${x} ${50.5 - ry - 1.6} ${x + rx + 0.8} ${50.5 - ry * 0.35}" stroke="${lineColor}" stroke-width="2.1" fill="none" stroke-linecap="round"/>`
        + `<path d="M${x + out * (rx + 0.6)} ${50.5 - ry * 0.4} l${out * 1.8} -1.6" stroke="${lineColor}" stroke-width="1.5" stroke-linecap="round"/>`
        + `<path d="M${x - rx * 0.6} ${50.5 + ry + 0.5} Q${x} ${50.5 + ry + 1.2} ${x + rx * 0.6} ${50.5 + ry + 0.5}" stroke="${lineColor}" stroke-width=".7" fill="none" opacity=".5" stroke-linecap="round"/>`;
      switch (type) {
        case 1: return open(6, 7.2, 4.9, 6.2) + `<circle cx="${x - 2}" cy="48.6" r=".8" fill="#fff"/>`; // grandes (shōjo)
        case 2: // almendrados: más finos y afilados
          return `<path d="M${x - 6} 51.5 Q${x - 1} 45.6 ${x + 6} ${out > 0 ? 49 : 51} Q${x} 55.5 ${x - 6} 51.5 Z" fill="#fff"/>`
            + `<circle cx="${x}" cy="51" r="3.1" fill="${irisFill}"/><circle cx="${x}" cy="51.3" r="1.5" fill="#160e1a"/><circle cx="${x + 1.1}" cy="49.8" r=".9" fill="#fff"/>`
            + `<path d="M${x - 6.6} 51.2 Q${x - 1} 44.8 ${x + 6.8} ${out > 0 ? 48.6 : 50.6}" stroke="${lineColor}" stroke-width="2.1" fill="none" stroke-linecap="round"/>`;
        case 3: // con pestañas largas
          return open(5.4, 6.4, 4.3, 5.4)
            + `<g stroke="${lineColor}" stroke-width="1.2" stroke-linecap="round"><path d="M${x + out * 5.6} 47.6 l${out * 2.4} -1.4"/><path d="M${x + out * 4.4} 45.6 l${out * 1.8} -2"/><path d="M${x + out * 2.6} 44.4 l${out * 1} -2.2"/></g>`;
        case 4: // felices (^ ^)
          return `<path d="M${x - 5} 52.5 Q${x} 45.5 ${x + 5} 52.5" stroke="${lineColor}" stroke-width="2.3" fill="none" stroke-linecap="round"/>`;
        case 5: return x > 50 // guiño
          ? `<path d="M${x - 5} 50 L${x + 4.5} 52 L${x - 4} 54" stroke="${lineColor}" stroke-width="2.1" fill="none" stroke-linecap="round" stroke-linejoin="round"/>`
          : open(5.4, 6.4, 4.3, 5.4);
        default: return open(5.4, 6.4, 4.3, 5.4); // normales
      }
    };
    return `<g class="av-eyes">${one(40.5)}${one(59.5)}</g>`;
  }

  // Bocas pequeñas, al estilo anime.
  function mouth(type, lipColor) {
    const dark = '#5a2230';
    switch (type) {
      case 1: return `<path d="M44.5 64 Q50 65 55.5 64 Q54.5 70.5 50 70.5 Q45.5 70.5 44.5 64 Z" fill="${dark}"/><ellipse cx="50" cy="68.6" rx="3.2" ry="1.6" fill="#ff8a98"/>`; // risa
      case 2: return `<path d="M45 64.6 Q47.5 62.6 50 63.6 Q52.5 62.6 55 64.6 Q50 65.6 45 64.6 Z" fill="${shade(lipColor, 0.85)}"/><path d="M45 64.6 Q50 65.6 55 64.6 Q53 68.4 50 68.4 Q47 68.4 45 64.6 Z" fill="${lipColor}"/><path d="M48 66.6 Q50 67.2 52 66.6" stroke="#fff" stroke-width=".7" opacity=".5" fill="none"/>`; // labios
      case 3: return `<path d="M47 65.4 L53 65.4" stroke="${dark}" stroke-width="1.5" stroke-linecap="round"/>`; // serio
      case 4: return `<ellipse cx="50" cy="66" rx="2.4" ry="3" fill="${dark}"/>`; // sorpresa
      case 5: return `<path d="M45 64.2 Q50 68 55 64.2" stroke="${dark}" stroke-width="1.6" fill="none" stroke-linecap="round"/><path d="M50.5 65.6 Q51 70 53.4 69.6 Q55.2 69 54 65.2 Z" fill="#ff7a8a"/>`; // lengua
      default: return `<path d="M46 64.6 Q50 67.6 54 64.6" stroke="${dark}" stroke-width="1.6" fill="none" stroke-linecap="round"/>`; // sonrisa
    }
  }

  // Lentes: marco de color + cristales transparentes o de color.
  function glasses(type, frame, lens) {
    if (!type) return '';
    const g = (shapes, bridge) => `<g stroke="${frame}" stroke-width="1.7" stroke-linejoin="round" stroke-linecap="round">
      <path d="M34 48.5 L27.5 47" fill="none"/><path d="M66 48.5 L72.5 47" fill="none"/>
      <g fill="${lens}">${shapes}</g><path d="${bridge}" fill="none"/></g>`;
    switch (type) {
      case 2: return g('<rect x="34" y="44.6" width="14" height="11" rx="2.6"/><rect x="52" y="44.6" width="14" height="11" rx="2.6"/>', 'M48 48.5 Q50 47 52 48.5');
      case 3: return g('<path d="M34 45 L48 45 Q48.6 53 44 56 Q38 57.6 35 53.2 Q33.4 49 34 45 Z"/><path d="M66 45 L52 45 Q51.4 53 56 56 Q62 57.6 65 53.2 Q66.6 49 66 45 Z"/>', 'M48 45.6 L52 45.6');
      case 4: return g('<path d="M32.5 43.6 Q41 44 48 45.6 Q48.3 53.4 42 54.8 Q35.6 55.4 34.2 50 Z"/><path d="M67.5 43.6 Q59 44 52 45.6 Q51.7 53.4 58 54.8 Q64.4 55.4 65.8 50 Z"/>', 'M48 48 Q50 46.8 52 48');
      default: return g('<circle cx="41" cy="50" r="6.6"/><circle cx="59" cy="50" r="6.6"/>', 'M47.6 49.5 Q50 48 52.4 49.5');
    }
  }

  function beard(type, c) {
    const full = `M26 52 C27 75 40 82 50 82 C60 82 73 75 74 52 C71 62 63 67.5 50 67.5 C37 67.5 29 62 26 52 Z`;
    const goatee = `<path d="M44.5 67 C44 75 56 75 55.5 67 C53 68.5 47 68.5 44.5 67 Z" fill="${c}"/>`;
    const mustache = `<path d="M40.5 61.5 C44 57.5 48.5 59 50 60.3 C51.5 59 56 57.5 59.5 61.5 C56 62.6 52.5 62.2 50 61.6 C47.5 62.2 44 62.6 40.5 61.5 Z" fill="${c}"/>`;
    switch (type) {
      case 1: return `<path d="${full}" fill="${c}"/>${mustache}`;
      case 2: return goatee;
      case 3: return mustache;
      case 4: return `<path d="${full}" fill="${c}" opacity=".32"/><path d="M41 61 Q50 58 59 61 Q50 62.5 41 61 Z" fill="${c}" opacity=".32"/>`;
      case 5: return mustache + goatee;
      default: return '';
    }
  }

  // ─── Avatar completo ────────────────────────────────────────────────────
  // crop: muestra solo una parte (para las miniaturas del editor).
  // La cabeza se dibuja reducida (82 %) para dejar ver cuello y hombros;
  // los recortes ya consideran esa escala.
  const CROPS = {
    full: '0 0 100 100', eyes: '32 35.8 36 19.7', mouth: '36 47.3 28 18',
    beard: '25.4 40.7 49.2 34.4', hair: '17 6 66 66', shirt: '18 36 64 64', glasses: '29 31 42 24'
  };
  let uid = 0;

  // Playera con cuello redondo: lisa o con rayas (recortadas a la silueta).
  function shirt(a) {
    const main = SHIRT_COLORS[a.shirtColor].c;
    const stripe = SHIRT_COLORS[a.stripeColor === a.shirtColor ? (a.stripeColor + 1) % SHIRT_COLORS.length : a.stripeColor].c;
    const body = a.g === 'm'
      ? 'M13 100 C15 87 27 79.5 40.5 78.5 Q50 88 59.5 78.5 C73 79.5 85 87 87 100 Z'
      : 'M6 100 C8 86 22 78.5 39.5 77.5 Q50 88 60.5 77.5 C78 78.5 92 86 94 100 Z';
    let stripes = '';
    if (a.shirt > 0) {
      const id = `avc${Date.now().toString(36)}${(uid++).toString(36)}`;
      let rects = '';
      if (a.shirt === 3) for (let x = 2; x < 100; x += 8) rects += `<rect x="${x}" y="70" width="4" height="30"/>`;
      else {
        const step = a.shirt === 1 ? 7 : 4;
        const h = a.shirt === 1 ? 3.5 : 1.6;
        for (let y = 80; y < 100; y += step) rects += `<rect x="0" y="${y}" width="100" height="${h}"/>`;
      }
      stripes = `<clipPath id="${id}"><path d="${body}"/></clipPath><g clip-path="url(#${id})" fill="${stripe}">${rects}</g>`;
    }
    const collar = a.g === 'm' ? 'M40.5 78.5 Q50 88 59.5 78.5' : 'M39.5 77.5 Q50 88 60.5 77.5';
    return `<path d="${body}" fill="${main}"/>${stripes}<path d="${collar}" fill="none" stroke="${shade(main, 0.78)}" stroke-width="2.4" stroke-linecap="round"/>`;
  }

  function render(input, crop = 'full') {
    const a = normalize(input);
    const skin = SKIN[a.skin].c;
    const hairC = HAIR_COLORS[a.hairColor].c;
    const bg = BG[a.bg];
    const skinShade = shade(skin, 0.86);
    const lip = a.skin >= 4 ? shade(skin, 0.7) : '#d0566e';
    const browColor = a.hair === 0 && a.hairColor === 5 ? '#9a9aa0' : shade(hairC, 0.85);
    const id = `av${(uid++).toString(36)}${Math.random().toString(36).slice(2, 6)}`;
    const iris = EYE_COLORS[a.eyeColor].c;
    const hairFill = `url(#${id}h)`;
    // Cara anime: frente ancha y barbilla en punta suave.
    const face = 'M27 47 C27 30 37 24 50 24 C63 24 73 30 73 47 C73 59 69 67 62 72.5 C57 76.5 53 78 50 78 C47 78 43 76.5 38 72.5 C31 67 27 59 27 47 Z';

    return `<svg class="av-svg" viewBox="${CROPS[crop] || CROPS.full}" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" focusable="false">
<defs>
  <linearGradient id="${id}h" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${shade(hairC, 1.35)}"/><stop offset=".45" stop-color="${hairC}"/><stop offset="1" stop-color="${shade(hairC, 0.7)}"/></linearGradient>
  <linearGradient id="${id}i" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${shade(iris, 0.55)}"/><stop offset=".55" stop-color="${iris}"/><stop offset="1" stop-color="${shade(iris, 1.45)}"/></linearGradient>
  <radialGradient id="${id}b" cx=".5" cy=".35" r=".8"><stop offset="0" stop-color="#fff" stop-opacity=".55"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></radialGradient>
  <clipPath id="${id}f"><path d="${face}"/></clipPath>
</defs>
<rect x="0" y="0" width="100" height="100" fill="${bg.c}"/>
<rect x="0" y="0" width="100" height="100" fill="url(#${id}b)"/>
<rect x="42.5" y="58" width="15" height="28" rx="6" fill="${skinShade}"/>
<path d="M42.5 78 Q50 83 57.5 78 L57.5 74 Q50 79 42.5 74 Z" fill="${shade(skin, 0.75)}" opacity=".5"/>
${shirt(a)}
<g class="av-head"><g transform="translate(50 44) scale(.82) translate(-50 -48)">
${hairBack(a.hair, hairFill)}
<path d="M27.5 47 Q23 47 23.6 52.5 Q24.4 57.5 29 57" fill="${skinShade}"/><path d="M72.5 47 Q77 47 76.4 52.5 Q75.6 57.5 71 57" fill="${skinShade}"/>
<path d="${face}" fill="${skin}"/>
${BANG_SHADOW.has(a.hair) ? `<g clip-path="url(#${id}f)"><path d="M24 38 L76 38 L76 46 Q63 50 50 47.5 Q37 50 24 46 Z" fill="${shade(skin, 0.8)}" opacity=".38"/></g>` : ''}
${a.g === 'm' ? `<circle cx="25.6" cy="57.5" r="1.6" fill="#f2c94c"/><circle cx="74.4" cy="57.5" r="1.6" fill="#f2c94c"/>` : ''}
<g opacity=".55"><ellipse cx="36.5" cy="60" rx="4.2" ry="2.2" fill="#ff8fa3" opacity=".55"/><ellipse cx="63.5" cy="60" rx="4.2" ry="2.2" fill="#ff8fa3" opacity=".55"/>
<path d="M34 61 l1.6 -2.4 M36.4 61 l1.6 -2.4 M38.8 61 l1.6 -2.4 M60 61 l1.6 -2.4 M62.4 61 l1.6 -2.4 M64.8 61 l1.6 -2.4" stroke="#f06f86" stroke-width=".7" stroke-linecap="round"/></g>
${beard(a.beard, hairC)}
<path d="M50.6 57.4 L49.6 59.8 L51 60" stroke="${shade(skin, 0.68)}" stroke-width="1.1" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
${mouth(a.lips, lip)}
${eyes(a.eyes, `url(#${id}i)`, '#23182a')}
<path d="M34.5 41.8 Q40 39.6 45.6 41.6" stroke="${browColor}" stroke-width="1.6" fill="none" stroke-linecap="round"/>
<path d="M54.4 41.6 Q60 39.6 65.5 41.8" stroke="${browColor}" stroke-width="1.6" fill="none" stroke-linecap="round"/>
${glasses(a.glasses, FRAME_COLORS[a.glassesColor].c, LENSES[a.lens].c)}
${hairFront(a.hair, hairFill, hairC)}
${a.hair === 0 ? `<ellipse cx="44" cy="31" rx="7" ry="3" fill="#fff" opacity=".22"/>` : ''}
</g></g>
</svg>`;
  }

  window.Avatar = { SPEC, DEFAULTS, normalize, random, render };
})();
