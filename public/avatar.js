/* ═══════════════════════════════════════════════════════════════════════════
   Avatar personalizable en SVG
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
    const ch = (x) => Math.max(0, Math.min(255, Math.round(x * f)));
    return `#${[(n >> 16) & 255, (n >> 8) & 255, n & 255].map((x) => ch(x).toString(16).padStart(2, '0')).join('')}`;
  }

  // ─── Piezas ─────────────────────────────────────────────────────────────
  function hairBack(type, c) {
    switch (type) {
      case 3: { // rizado: rizos detrás de la cabeza
        let out = '';
        for (let i = 0; i <= 10; i++) {
          const a = Math.PI * (0.95 + i * 0.11);
          out += `<circle cx="${(50 + 27 * Math.cos(a)).toFixed(1)}" cy="${(47 + 27 * Math.sin(a)).toFixed(1)}" r="8.5" fill="${c}"/>`;
        }
        return out + `<circle cx="24" cy="58" r="7" fill="${c}"/><circle cx="76" cy="58" r="7" fill="${c}"/>`;
      }
      case 4: return `<path d="M25 44 C25 18 75 18 75 44 L79 84 C70 89 30 89 21 84 Z" fill="${c}"/>`; // largo
      case 6: return `<path d="M24 46 C24 19 76 19 76 46 L77 67 C68 72 32 72 23 67 Z" fill="${c}"/>`; // melena
      default: return '';
    }
  }

  function hairFront(type, c) {
    switch (type) {
      case 1: return `<path d="M27 47 C25 25 40 20 50 20 C62 20 76 26 73 47 C70 37 63 32 50 32 C38 32 30 37 27 47 Z" fill="${c}"/>`;
      case 2: return `<path d="M28 43 C30 27 41 23 50 23 C59 23 70 27 72 43 C68 35 60 31 50 31 C40 31 32 35 28 43 Z" fill="${c}" opacity=".85"/>`;
      case 3: {
        let out = '';
        const pts = [[29, 40], [33, 31], [40, 25], [50, 22], [60, 25], [67, 31], [71, 40], [44, 30], [56, 30]];
        pts.forEach(([x, y]) => { out += `<circle cx="${x}" cy="${y}" r="7" fill="${c}"/>`; });
        return out;
      }
      case 4: return `<path d="M26 52 C23 24 40 19 50 19 C64 19 78 27 74 52 C71 41 63 33 53 31 C46 37 36 42 26 52 Z" fill="${c}"/>`;
      case 5: return `<circle cx="50" cy="17" r="9" fill="${c}"/><path d="M27 46 C26 27 40 22 50 22 C61 22 74 27 73 46 C69 37 61 33 50 33 C39 33 31 37 27 46 Z" fill="${c}"/>`;
      case 6: return `<path d="M25 50 C23 25 39 19 50 19 C62 19 77 25 75 50 C73 43 72 39 70 37 C59 40 41 40 30 37 C28 39 27 43 25 50 Z" fill="${c}"/>`;
      case 7: return `<path d="M29 42 C31 29 41 25 50 25 C59 25 69 29 71 42 C67 36 60 33 50 33 C40 33 33 36 29 42 Z" fill="${c}" opacity=".4"/><path d="M44 31 C43 19 47 11 50 8 C53 11 57 19 56 31 C53 32 47 32 44 31 Z" fill="${c}"/>`;
      default: return '';
    }
  }

  function eyes(type, irisColor, lineColor) {
    const one = (x) => {
      switch (type) {
        case 1: return `<ellipse cx="${x}" cy="50" rx="5.2" ry="5.8" fill="#fff"/><circle cx="${x}" cy="50.6" r="3.6" fill="${irisColor}"/><circle cx="${x}" cy="50.6" r="1.8" fill="#111"/><circle cx="${x + 1.4}" cy="49" r="1.2" fill="#fff"/>`;
        case 2: return `<ellipse cx="${x}" cy="50.5" rx="5" ry="2.9" fill="#fff"/><circle cx="${x}" cy="50.5" r="2.3" fill="${irisColor}"/><circle cx="${x}" cy="50.5" r="1.1" fill="#111"/><path d="M${x - 5.6} 50 Q${x} 46 ${x + 5.6} 50" stroke="${lineColor}" stroke-width="1.1" fill="none"/>`;
        case 4: return `<path d="M${x - 4.5} 51.5 Q${x} 46.5 ${x + 4.5} 51.5" stroke="${lineColor}" stroke-width="2" fill="none" stroke-linecap="round"/>`;
        case 5: return x > 50 // guiño: el ojo derecho cerrado
          ? `<path d="M${x - 4.5} 50.5 Q${x} 53.5 ${x + 4.5} 50.5" stroke="${lineColor}" stroke-width="2" fill="none" stroke-linecap="round"/>`
          : `<ellipse cx="${x}" cy="50" rx="4.3" ry="4.4" fill="#fff"/><circle cx="${x}" cy="50.4" r="2.8" fill="${irisColor}"/><circle cx="${x}" cy="50.4" r="1.3" fill="#111"/><circle cx="${x + 1}" cy="49.2" r=".8" fill="#fff"/>`;
        default: return `<ellipse cx="${x}" cy="50" rx="4.3" ry="4.4" fill="#fff"/><circle cx="${x}" cy="50.4" r="2.8" fill="${irisColor}"/><circle cx="${x}" cy="50.4" r="1.3" fill="#111"/><circle cx="${x + 1}" cy="49.2" r=".8" fill="#fff"/>`;
      }
    };
    let out = `<g class="av-eyes">${one(41)}${one(59)}</g>`;
    if (type === 3) { // pestañas
      out += `<g stroke="${lineColor}" stroke-width="1.2" stroke-linecap="round" fill="none">
        <path d="M37 47.5 L35 45.5"/><path d="M39 46.2 L38 43.8"/><path d="M63 47.5 L65 45.5"/><path d="M61 46.2 L62 43.8"/></g>`;
    }
    return out;
  }

  function mouth(type, lipColor) {
    const dark = '#5a2230';
    switch (type) {
      case 1: return `<path d="M42 62 Q50 72 58 62 Z" fill="${dark}"/><path d="M43 62.4 Q50 64.6 57 62.4 L56.3 64 Q50 65.8 43.7 64 Z" fill="#fff"/>`;
      case 2: return `<path d="M42 63 Q46 59.6 50 61.6 Q54 59.6 58 63 Q50 64.6 42 63 Z" fill="${shade(lipColor, 0.85)}"/><path d="M42 63 Q50 64.6 58 63 Q55 69.5 50 69.5 Q45 69.5 42 63 Z" fill="${lipColor}"/>`;
      case 3: return `<path d="M44.5 64 L55.5 64" stroke="${dark}" stroke-width="1.8" stroke-linecap="round"/>`;
      case 4: return `<ellipse cx="50" cy="64.5" rx="3.2" ry="4" fill="${dark}"/>`;
      case 5: return `<path d="M43 62 Q50 70 57 62 Z" fill="${dark}"/><path d="M47 65 Q50 71 53 65 Z" fill="#ff7a8a"/>`;
      default: return `<path d="M43.5 62.5 Q50 68.5 56.5 62.5" stroke="${dark}" stroke-width="1.9" fill="none" stroke-linecap="round"/>`;
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
    const browColor = a.hair === 0 && a.hairColor === 5 ? '#9a9aa0' : hairC;

    return `<svg class="av-svg" viewBox="${CROPS[crop] || CROPS.full}" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" focusable="false">
<rect x="0" y="0" width="100" height="100" fill="${bg.c}"/>
<rect x="42.5" y="58" width="15" height="28" rx="6" fill="${skinShade}"/>
${shirt(a)}
<g class="av-head"><g transform="translate(50 44) scale(.82) translate(-50 -48)">
${hairBack(a.hair, hairC)}
<circle cx="27" cy="52" r="5" fill="${skinShade}"/><circle cx="73" cy="52" r="5" fill="${skinShade}"/>
<ellipse cx="50" cy="50" rx="23" ry="26" fill="${skin}"/>
${a.g === 'm' ? `<circle cx="27" cy="57.5" r="1.6" fill="#f2c94c"/><circle cx="73" cy="57.5" r="1.6" fill="#f2c94c"/>` : ''}
<ellipse cx="38" cy="58" rx="3.6" ry="2" fill="#ff8fa3" opacity=".28"/><ellipse cx="62" cy="58" rx="3.6" ry="2" fill="#ff8fa3" opacity=".28"/>
${beard(a.beard, hairC)}
<path d="M50 52 Q47.6 57.5 50.4 58.6" stroke="${shade(skin, 0.7)}" stroke-width="1.5" fill="none" stroke-linecap="round"/>
${mouth(a.lips, lip)}
${eyes(a.eyes, EYE_COLORS[a.eyeColor].c, '#23243a')}
<path d="M35.5 43.5 Q41 40.6 46.5 43" stroke="${browColor}" stroke-width="2.2" fill="none" stroke-linecap="round"/>
<path d="M53.5 43 Q59 40.6 64.5 43.5" stroke="${browColor}" stroke-width="2.2" fill="none" stroke-linecap="round"/>
${glasses(a.glasses, FRAME_COLORS[a.glassesColor].c, LENSES[a.lens].c)}
${hairFront(a.hair, hairC)}
</g></g>
</svg>`;
  }

  window.Avatar = { SPEC, DEFAULTS, normalize, random, render };
})();
