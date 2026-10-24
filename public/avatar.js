/* ═══════════════════════════════════════════════════════════════════════════
   Avatar personalizable en SVG (estilo humano tipo avatar de redes sociales, con opción de ojos anime)
   Rasgos: sexo, color de piel, tipo y color de cabello, cejas, tipo y color
   de ojos (realistas o anime), labios, barba, lentes ópticos o de sol (marco
   de colores; cristales transparentes o de color), playera y fondo.
   Se ven cuello y hombros. Parpadea y se mueve (CSS).
   Las opciones nuevas se agregan AL FINAL de cada lista para que los avatares
   guardados no cambien. Los límites deben coincidir con AVATAR_LIMITS de server.js.
   ═══════════════════════════════════════════════════════════════════════════ */
(() => {
  'use strict';

  const SKIN = [
    { name: 'Muy clara', c: '#ffe0c7' },
    { name: 'Clara', c: '#f6c9a0' },
    { name: 'Trigueña', c: '#e2a676' },
    { name: 'Morena clara', c: '#c58450' },
    { name: 'Morena', c: '#8f5a34' },
    { name: 'Oscura', c: '#5e3a22' },
    { name: 'Porcelana', c: '#fbe9df' },
    { name: 'Oliva', c: '#c9a27a' },
    { name: 'Canela', c: '#a8693f' },
    { name: 'Ébano', c: '#3e2618' }
  ];
  const HAIR_COLORS = [
    { name: 'Negro', c: '#1f1a17' },
    { name: 'Castaño oscuro', c: '#4a2c1a' },
    { name: 'Castaño', c: '#83512c' },
    { name: 'Rubio', c: '#e3bb63' },
    { name: 'Pelirrojo', c: '#b8482a' },
    { name: 'Canoso', c: '#c4c4c8' },
    { name: 'Azul', c: '#4d6bff' },
    { name: 'Rosa', c: '#ff6fae' },
    { name: 'Castaño claro', c: '#a8763f' },
    { name: 'Rubio platino', c: '#ece0bd' },
    { name: 'Caoba', c: '#7a2e22' },
    { name: 'Gris', c: '#7b7e86' },
    { name: 'Morado', c: '#8a5bd6' },
    { name: 'Verde', c: '#3fae7a' },
    { name: 'Rojo fuego', c: '#d42a1f' },
    { name: 'Turquesa', c: '#1fb5b0' },
    { name: 'Lila', c: '#c39be8' },
    { name: 'Miel', c: '#c58b3a' },
    { name: 'Negro azulado', c: '#1d2540' },
    { name: 'Blanco', c: '#f1f1f1' }
  ];
  const EYE_COLORS = [
    { name: 'Café', c: '#6b3e1f' },
    { name: 'Negro', c: '#1c1c1c' },
    { name: 'Azul', c: '#3d8bd9' },
    { name: 'Verde', c: '#3f9a52' },
    { name: 'Avellana', c: '#a5772f' },
    { name: 'Gris', c: '#8a96a3' },
    { name: 'Miel', c: '#c98a2b' },
    { name: 'Violeta', c: '#7d5bd6' }
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
  const HAIR_TYPES = ['Calvo', 'Corto', 'Rapado', 'Rizado', 'Largo', 'Moño', 'Melena', 'Cresta',
    'Ondulado', 'Raya al lado', 'Coleta', 'Trenzas', 'Afro', 'Hacia atrás',
    'Pixie', 'Rastas', 'Copete', 'Dos moños', 'Rapado a los lados', 'Media melena'];
  const FACE_TYPES = ['Normal', 'Ovalada', 'Cuadrada', 'Redonda', 'Alargada', 'Corazón'];
  const HAT_TYPES = ['Sin gorra', 'Gorra', 'Gorra al revés', 'Gorro de lana', 'Sombrero', 'Boina', 'Sombrero vueltiao', 'Bandana', 'Diadema'];
  const ACC_TYPES = ['Ninguno', 'Aretes pequeños', 'Argollas', 'Perlas', 'Aretes largos', 'Piercing en la nariz', 'Audífonos', 'Collar'];
  const BROW_TYPES = ['Naturales', 'Gruesas', 'Finas', 'Arqueadas', 'Rectas'];
  const EYE_TYPES = ['Normales', 'Grandes', 'Almendrados', 'Con pestañas', 'Felices', 'Guiño',
    'Anime brillantes', 'Anime', 'Anime serios', 'Rasgados'];
  const GLASSES_TYPES = ['Sin lentes', 'Redondos', 'Cuadrados', 'Aviador', 'Ojo de gato',
    'Rectangulares', 'Media montura', 'Sin montura', 'Hexagonales', 'Ovalados',
    'Grandes', 'De lectura', 'Deportivos', 'Corazón'];
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
  // Cristales: transparentes (lentes ópticos: solo se ve el marco) o de color.
  const LENSES = [
    { name: 'Transparentes (ópticos)', c: 'rgba(220,235,255,.16)', sw: 'repeating-conic-gradient(#dfe1ea 0 25%, #fff 0 50%) 0 0 / 12px 12px' },
    { name: 'Oscuros', c: 'rgba(25,25,35,.88)', sw: '#24242e' },
    { name: 'Azules', c: 'rgba(51,154,240,.6)', sw: '#5fb0f5' },
    { name: 'Rosas', c: 'rgba(240,101,149,.6)', sw: '#f37ea6' },
    { name: 'Verdes', c: 'rgba(64,192,87,.55)', sw: '#6ccf7f' },
    { name: 'Amarillos', c: 'rgba(252,196,25,.6)', sw: '#fdd255' },
    { name: 'Morados', c: 'rgba(132,94,247,.6)', sw: '#9d80f8' }
  ];
  const LIP_TYPES = ['Sonrisa', 'Risa', 'Labios gruesos', 'Serio', 'Sorpresa', 'Lengua', 'Labios finos', 'Sonrisa de lado'];
  const BEARD_TYPES = ['Sin barba', 'Completa', 'Candado', 'Bigote', 'De 3 días', 'Bigote y candado',
    'Larga', 'Patillas', 'Chivo', 'Bigote fino', 'Corta', 'Herradura', 'Imperial', 'Mosca'];

  const SPEC = {
    g: [{ id: 'h', name: 'Hombre' }, { id: 'm', name: 'Mujer' }],
    skin: SKIN, hair: HAIR_TYPES, hairColor: HAIR_COLORS, brows: BROW_TYPES, eyes: EYE_TYPES,
    eyeColor: EYE_COLORS, lips: LIP_TYPES, beard: BEARD_TYPES, bg: BG,
    shirt: SHIRT_TYPES, shirtColor: SHIRT_COLORS, stripeColor: SHIRT_COLORS,
    glasses: GLASSES_TYPES, glassesColor: FRAME_COLORS, lens: LENSES,
    face: FACE_TYPES, hat: HAT_TYPES, hatColor: SHIRT_COLORS, acc: ACC_TYPES
  };

  const DEFAULTS = {
    h: { g: 'h', skin: 1, hair: 1, hairColor: 1, brows: 0, eyes: 0, eyeColor: 0, lips: 0, beard: 0, bg: 3, shirt: 0, shirtColor: 7, stripeColor: 0, glasses: 0, glassesColor: 0, lens: 0, face: 0, hat: 0, hatColor: 1, acc: 0 },
    m: { g: 'm', skin: 1, hair: 4, hairColor: 2, brows: 3, eyes: 3, eyeColor: 0, lips: 2, beard: 0, bg: 4, shirt: 0, shirtColor: 9, stripeColor: 0, glasses: 0, glassesColor: 0, lens: 0, face: 0, hat: 0, hatColor: 1, acc: 1 }
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
    out.brows = a.brows === undefined ? (g === 'm' ? 3 : 0) : clampInt(a.brows, BROW_TYPES.length);
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
    out.face = clampInt(a.face, FACE_TYPES.length);
    out.hat = clampInt(a.hat, HAT_TYPES.length);
    out.hatColor = a.hatColor === undefined ? 1 : clampInt(a.hatColor, SHIRT_COLORS.length);
    // Antes las mujeres llevaban aretes pequeños siempre: se conservan.
    out.acc = a.acc === undefined ? (g === 'm' ? 1 : 0) : clampInt(a.acc, ACC_TYPES.length);
    // Avatares guardados antes de v1.6: "Con lentes" era un tipo de ojos.
    if (a.glasses === undefined && parseInt(a.eyes, 10) === 5) { out.eyes = 0; out.glasses = 1; }
    return out;
  }

  function random() {
    const pick = (n) => Math.floor(Math.random() * n);
    const any = (list) => list[pick(list.length)];
    const g = Math.random() < 0.5 ? 'h' : 'm';
    return normalize({
      g,
      skin: pick(SKIN.length),
      hair: g === 'm' ? any([3, 4, 5, 6, 8, 10, 11, 12, 14, 15, 17, 19]) : any([0, 1, 2, 3, 7, 8, 9, 12, 13, 15, 16, 18]),
      hairColor: Math.random() < 0.8 ? any([0, 1, 2, 3, 4, 5, 8, 9, 10, 11]) : pick(HAIR_COLORS.length),
      brows: pick(BROW_TYPES.length),
      eyes: g === 'm' ? any([0, 1, 2, 3, 4, 6, 7]) : any([0, 1, 2, 4, 7, 8, 9]),
      eyeColor: pick(EYE_COLORS.length),
      lips: pick(LIP_TYPES.length),
      beard: g === 'h' && Math.random() < 0.5 ? pick(BEARD_TYPES.length) : 0,
      bg: pick(BG.length),
      shirt: pick(SHIRT_TYPES.length),
      shirtColor: pick(SHIRT_COLORS.length),
      stripeColor: pick(SHIRT_COLORS.length),
      glasses: Math.random() < 0.35 ? 1 + pick(GLASSES_TYPES.length - 1) : 0,
      glassesColor: pick(FRAME_COLORS.length),
      lens: Math.random() < 0.7 ? 0 : pick(LENSES.length),
      face: pick(FACE_TYPES.length),
      hat: Math.random() < 0.25 ? 1 + pick(HAT_TYPES.length - 1) : 0,
      hatColor: pick(SHIRT_COLORS.length),
      acc: Math.random() < (g === 'm' ? 0.8 : 0.25) ? 1 + pick(ACC_TYPES.length - 1) : 0
    });
  }

  // Oscurece (f < 1) o aclara (f > 1) un color hex. Los muy oscuros también se aclaran.
  function shade(hex, f) {
    const n = parseInt(hex.slice(1), 16);
    const ch = (x) => Math.max(0, Math.min(255, Math.round(f > 1 ? x * f + (f - 1) * 60 : x * f)));
    return `#${[(n >> 16) & 255, (n >> 8) & 255, n & 255].map((x) => ch(x).toString(16).padStart(2, '0')).join('')}`;
  }

  // ─── Cabello ─────────────────────────────────────────────────────────────
  // fill = degradado del cabello; dark = color para los mechones.
  const strands = (d, dark, w = 0.7) => `<path d="${d}" stroke="${dark}" stroke-width="${w}" fill="none" stroke-linecap="round" opacity=".55"/>`;
  let FX = ''; // id del filtro de desenfoque del avatar que se está dibujando
  const shine = (d) => `<path d="${d}" stroke="#fff" stroke-width="3.4" fill="none" stroke-linecap="round" opacity=".32" filter="url(#${FX}s1)"/>`;

  function hairBack(type, fill) {
    switch (type) {
      case 1: case 5: case 9: case 13: return `<path d="M26 46 C25 22 75 22 74 46 L73 53 L27 53 Z" fill="${fill}"/>`;
      case 3: { // rizado
        let out = '';
        for (let i = 0; i <= 12; i++) {
          const a = Math.PI * (0.92 + i * 0.097);
          out += `<circle cx="${(50 + 27.5 * Math.cos(a)).toFixed(1)}" cy="${(47 + 27.5 * Math.sin(a)).toFixed(1)}" r="8" fill="${fill}"/>`;
        }
        return out + `<circle cx="23.5" cy="60" r="7" fill="${fill}"/><circle cx="76.5" cy="60" r="7" fill="${fill}"/>`;
      }
      case 4: return `<path d="M25 44 C22 17 78 17 75 44 L79 86 Q65 91 50 90 Q35 91 21 86 Z" fill="${fill}"/>`; // largo
      case 6: return `<path d="M23 46 C23 18 77 18 77 46 L78 70 Q64 75 50 75 Q36 75 22 70 Z" fill="${fill}"/>`; // melena
      case 8: return `<path d="M24 45 C22 18 78 18 76 45 C80 54 75 60 79 68 C76 74 70 72 66 76 L34 76 C30 72 24 74 21 68 C25 60 20 54 24 45 Z" fill="${fill}"/>`; // ondulado
      case 10: return `<path d="M26 46 C25 22 75 22 74 46 L73 53 L27 53 Z" fill="${fill}"/><path d="M70 34 C84 38 86 58 80 76 C78 82 73 84 72 78 C76 64 76 48 68 40 Z" fill="${fill}"/>`; // coleta
      case 11: { // trenzas a los lados
        const braid = (x) => {
          let out = '';
          for (let y = 54; y <= 86; y += 6.5) out += `<ellipse cx="${x}" cy="${y}" rx="4.6" ry="3.8" fill="${fill}"/>`;
          return out + `<path d="M${x - 2} 91 L${x + 2} 91 L${x} 95 Z" fill="${fill}"/>`;
        };
        return `<path d="M25 46 C24 20 76 20 75 46 L74 55 L26 55 Z" fill="${fill}"/>${braid(25)}${braid(75)}`;
      }
      case 12: return `<circle cx="50" cy="40" r="31" fill="${fill}"/><circle cx="24" cy="54" r="12" fill="${fill}"/><circle cx="76" cy="54" r="12" fill="${fill}"/>`; // afro
      case 14: case 16: case 18: return `<path d="M26 46 C25 22 75 22 74 46 L73 52 L27 52 Z" fill="${fill}"/>`; // pixie, copete, rapado a los lados
      case 15: { // rastas largas
        let out = `<path d="M25 46 C24 20 76 20 75 46 L74 54 L26 54 Z" fill="${fill}"/>`;
        [22, 27, 32, 68, 73, 78].forEach((x, i) => { out += `<rect x="${x - 2.6}" y="40" width="5.2" height="${40 + (i % 3) * 5}" rx="2.6" fill="${fill}"/>`; });
        return out;
      }
      case 17: return `<circle cx="32" cy="22" r="9" fill="${fill}"/><circle cx="68" cy="22" r="9" fill="${fill}"/><path d="M26 46 C25 22 75 22 74 46 L73 52 L27 52 Z" fill="${fill}"/>`; // dos moños
      case 19: return `<path d="M24 45 C22 18 78 18 76 45 L77 76 Q64 80 50 80 Q36 80 23 76 Z" fill="${fill}"/>`; // media melena
      default: return '';
    }
  }

  function hairFront(type, fill, base) {
    const dark = shade(base, 0.62);
    switch (type) {
      case 1: // corto
        return `<path d="M27 47 C25 26 37 19 50 19 C63 19 75 26 73 47 C71 39 67 34 61 32 C56 34 44 34 38 31.6 C33 34 29 39 27 47 Z" fill="${fill}"/>`
          + strands('M38 31.6 Q42 25 49 22 M50 33.5 Q53 26 60 23 M61 32 Q66 28 69 32', dark) + shine('M38 25 Q50 20 62 25');
      case 2: // rapado
        return `<path d="M28 44 C29 27 40 22 50 22 C60 22 71 27 72 44 C68 35 60 31 50 31 C40 31 32 35 28 44 Z" fill="${fill}" opacity=".75"/>`
          + `<path d="M28.5 44 C30 36 34 32 38 31" stroke="${dark}" stroke-width=".5" fill="none" opacity=".4"/>`;
      case 3: { // rizado
        let out = '';
        const pts = [[28, 41], [32, 32], [39, 26], [47, 22], [55, 22], [62, 26], [68, 32], [72, 41], [43, 31], [57, 31], [50, 29]];
        pts.forEach(([x, y]) => { out += `<circle cx="${x}" cy="${y}" r="6.4" fill="${fill}"/><path d="M${x - 3} ${y + 1} q3 -4 6 -1" stroke="${dark}" stroke-width=".7" fill="none" opacity=".6"/>`; });
        return out;
      }
      case 4: // largo con raya en medio
        return `<path d="M25 60 C21 28 35 18 50 18 C65 18 79 28 75 60 C73 47 69 38 61 32 Q54 30 50 25 Q46 30 39 32 C31 38 27 47 25 60 Z" fill="${fill}"/>`
          + strands('M50 25 Q42 30 33 42 M50 25 Q58 30 67 42 M30 48 Q28 54 27 60 M70 48 Q72 54 73 60', dark) + shine('M37 26 Q44 21 49 21');
      case 5: // moño alto
        return `<circle cx="50" cy="15" r="9.5" fill="${fill}"/>${strands('M43 15 Q50 9 57 15', dark)}`
          + `<path d="M27 46 C26 26 39 20 50 20 C61 20 74 26 73 46 C70 37 63 32 50 31 C37 32 30 37 27 46 Z" fill="${fill}"/>`
          + strands('M33 36 Q40 26 50 23 M67 36 Q60 26 50 23', dark) + shine('M40 24 Q50 20 60 24');
      case 6: // melena con flequillo recto
        return `<path d="M24 54 C21 24 37 17 50 17 C63 17 79 24 76 54 L73 54 L72 41 Q50 44 28 41 L27 54 Z" fill="${fill}"/>`
          + strands('M36 42 L37 28 M44 43 L44 26 M56 43 L56 26 M64 42 L63 28', dark) + shine('M36 24 Q50 19 64 24');
      case 7: // cresta
        return `<path d="M29 42 C31 29 41 25 50 25 C59 25 69 29 71 42 C67 36 60 33 50 33 C40 33 33 36 29 42 Z" fill="${fill}" opacity=".45"/>`
          + `<path d="M43 33 C42 22 45 12 50 7 C55 12 58 22 57 33 Q50 35 43 33 Z" fill="${fill}"/>${strands('M50 10 L50 32 M46.5 16 L47 32 M53.5 16 L53 32', dark)}`;
      case 8: // ondulado, de lado
        return `<path d="M24 58 C20 30 34 18 50 18 C66 18 80 30 76 58 C74 50 73 44 69 40 C66 37 63 38 60 35 C55 31 50 34 45 31 C40 29 36 33 33 37 C29 42 26 49 24 58 Z" fill="${fill}"/>`
          + strands('M45 31 Q40 24 47 20 M60 35 Q60 26 66 25 M33 37 Q30 30 35 25 M27 50 Q24 56 27 62 M73 50 Q76 56 73 62', dark) + shine('M38 23 Q48 18 58 22');
      case 9: // raya al lado
        return `<path d="M27 47 C25 26 38 19 52 19 C64 19 75 27 73 47 C71 38 67 32 59 29.5 C51 29 41 30.5 34 35 C31 38 28.5 42 27 47 Z" fill="${fill}"/>`
          + `<path d="M40 22 Q39 27 38 31" stroke="${shade(base, 0.45)}" stroke-width=".9" fill="none" opacity=".7"/>`
          + strands('M40 23 Q52 22 66 28 M42 27 Q55 26 68 33', dark) + shine('M45 22 Q56 20 64 24');
      case 10: // coleta: peinado hacia atrás
        return `<path d="M27 46 C26 26 39 20 50 20 C61 20 74 26 73 46 C70 37 63 31.5 50 31 C37 31.5 30 37 27 46 Z" fill="${fill}"/>`
          + strands('M30 40 Q38 27 52 23 M40 33 Q48 26 60 24 M56 31 Q64 28 70 36', dark) + shine('M40 24 Q50 20 60 24');
      case 11: // trenzas: raya en medio
        return `<path d="M26 52 C24 26 37 19 50 19 C63 19 76 26 74 52 C72 41 66 34 58 31 Q53 30 50 24 Q47 30 42 31 C34 34 28 41 26 52 Z" fill="${fill}"/>`
          + strands('M50 24 Q43 28 35 37 M50 24 Q57 28 65 37', dark) + shine('M38 26 Q44 22 49 22');
      case 12: // afro: frente
        return `<path d="M26 44 C24 24 38 14 50 14 C62 14 76 24 74 44 C70 36 61 32 50 32 C39 32 30 36 26 44 Z" fill="${fill}"/>`
          + `<g fill="none" stroke="${dark}" stroke-width=".6" opacity=".5"><path d="M33 26 q2 -2 4 0"/><path d="M45 20 q2 -2 4 0"/><path d="M58 22 q2 -2 4 0"/><path d="M66 30 q2 -2 4 0"/><path d="M38 33 q2 -2 4 0"/><path d="M55 30 q2 -2 4 0"/></g>`;
      case 14: // pixie: corto con flequillo de lado
        return `<path d="M26 52 C23 25 38 17 52 17 C66 17 77 26 73 47 C70 39 64 34 57 33 C49 36 40 40 32 47 C30 49 28 51 26 52 Z" fill="${fill}"/>`
          + strands('M57 33 Q50 25 40 22 M48 37 Q42 30 33 31 M66 36 Q66 28 62 23', dark) + shine('M42 22 Q52 18 62 22');
      case 15: { // rastas: frente
        let out = `<path d="M27 46 C26 26 39 20 50 20 C61 20 74 26 73 46 C70 37 63 32 50 31 C37 32 30 37 27 46 Z" fill="${fill}"/>`;
        [36, 44, 56, 64].forEach((x) => { out += `<rect x="${x - 2.4}" y="24" width="4.8" height="${x === 44 || x === 56 ? 15 : 19}" rx="2.4" fill="${fill}"/>`; });
        return out + strands('M33 32 L33 44 M40 28 L40 40 M60 28 L60 40 M67 32 L67 44', dark, 0.5);
      }
      case 16: // copete (pompadour)
        return `<path d="M28 44 C26 24 33 11 50 11 C65 11 76 19 72 44 C70 34 62 30 50 30 C40 30 32 34 28 44 Z" fill="${fill}"/>`
          + strands('M34 32 Q38 18 52 14 M44 30 Q48 19 60 16 M56 30 Q62 22 68 22', dark) + shine('M40 17 Q52 12 62 16');
      case 17: // dos moños: frente con raya en medio
        return `<path d="M27 47 C26 27 38 20 50 20 C62 20 74 27 73 47 C71 38 65 33 57 31 Q53 30 50 25 Q47 30 43 31 C35 33 29 38 27 47 Z" fill="${fill}"/>`
          + strands('M28 22 Q32 16 37 20 M63 20 Q68 16 72 22', dark) + shine('M38 26 Q44 22 49 22');
      case 18: // rapado a los lados, largo arriba
        return `<path d="M28 44 C29 30 34 26 38 26 L62 26 C66 26 71 30 72 44 C69 38 66 35 62 34 L38 34 C34 35 31 38 28 44 Z" fill="${fill}" opacity=".4"/>`
          + `<path d="M34 34 C32 20 42 15 52 15 C64 15 72 21 69 35 C64 30 57 28 49 28.5 C43 29 38 31 34 34 Z" fill="${fill}"/>`
          + strands('M38 30 Q44 20 56 18 M48 28.5 Q54 21 64 22', dark) + shine('M42 19 Q52 15 62 19');
      case 19: // media melena con raya en medio
        return `<path d="M25 58 C21 28 35 18 50 18 C65 18 79 28 75 58 C73 46 69 38 61 32 Q54 30 50 25 Q46 30 39 32 C31 38 27 46 25 58 Z" fill="${fill}"/>`
          + strands('M50 25 Q42 30 33 42 M50 25 Q58 30 67 42', dark) + shine('M37 26 Q44 21 49 21');
      case 13: // hacia atrás (engominado)
        return `<path d="M28 45 C26 25 38 18 50 18 C62 18 74 25 72 45 C70 36 64 30 50 29.5 C36 30 30 36 28 45 Z" fill="${fill}"/>`
          + strands('M33 37 Q36 25 46 20 M42 31 Q45 23 54 20 M52 30 Q56 23 64 23 M61 31 Q66 28 69 35', dark, 0.8) + shine('M40 22 Q50 18 60 22');
      default: return '';
    }
  }

  // Con qué peinados el cabello deja sombra en la frente.
  const BANG_SHADOW = new Set([1, 4, 5, 6, 8, 9, 10, 11, 13, 14, 16, 17, 18, 19]);

  // ─── Cejas ───────────────────────────────────────────────────────────────
  function brows(type, c, anime) {
    const w = [1.9, 2.8, 1.1, 1.7, 2.2][type] || 1.9;
    const y = anime ? -0.8 : 0;
    const pair = (l, r) => `<path d="${l}" stroke="${c}" stroke-width="${w}" fill="none" stroke-linecap="round"/><path d="${r}" stroke="${c}" stroke-width="${w}" fill="none" stroke-linecap="round"/>`;
    switch (type) {
      case 3: return pair(`M34.6 ${43 + y} Q39.5 ${38.8 + y} 45.6 ${41.6 + y}`, `M54.4 ${41.6 + y} Q60.5 ${38.8 + y} 65.4 ${43 + y}`); // arqueadas
      case 4: return pair(`M35 ${42 + y} L45.6 ${41.4 + y}`, `M54.4 ${41.4 + y} L65 ${42 + y}`); // rectas
      default: return pair(`M34.8 ${42.6 + y} Q40 ${40.2 + y} 45.6 ${41.8 + y}`, `M54.4 ${41.8 + y} Q60 ${40.2 + y} 65.2 ${42.6 + y}`);
    }
  }

  // ─── Ojos ────────────────────────────────────────────────────────────────
  // Realistas (0-5, 9) y estilo anime (6-8). La clase av-eyes permite el parpadeo.
  function eyes(type, irisFill, line, lid, id, fem) {
    const one = (x, k) => {
      const out = x < 50 ? -1 : 1; // lado exterior
      // Ojo humano: forma de almendra, iris recortado por los párpados y pliegue.
      const human = (w = 6.1, h = 4.5, ir = 3.35, tilt = 0, lashes = fem, crease = true) => {
        const cid = `${id}e${k}`;
        const shape = `M${x - w} 50.2 Q${x - w * 0.15} ${50.2 - h * 1.7 - tilt} ${x + w} ${50 - tilt * out * 0.6} Q${x + w * 0.1} ${50.2 + h * 1.3} ${x - w} 50.2 Z`;
        return `<clipPath id="${cid}"><path d="${shape}"/></clipPath>`
          + `<path d="${shape}" fill="#fbfbfd"/>`
          + `<g clip-path="url(#${cid})"><circle cx="${x + out * 0.2}" cy="49.9" r="${ir}" fill="${irisFill}"/>`
          + `<circle cx="${x + out * 0.2}" cy="49.9" r="${ir - 0.25}" fill="none" stroke="#000" stroke-width=".5" opacity=".35"/>`
          + `<circle cx="${x + out * 0.2}" cy="49.9" r="${ir * 0.42}" fill="#120c10"/>`
          + `<path d="M${x - w} ${49 - h * 0.4} Q${x} ${46 - h * 0.7} ${x + w} ${49 - h * 0.4} L${x + w} 40 L${x - w} 40 Z" fill="#000" opacity=".14"/></g>`
          + `<circle cx="${x + 1}" cy="48.8" r=".85" fill="#fff"/><circle cx="${x - 1.1}" cy="51.1" r=".4" fill="#fff" opacity=".8"/>`
          + `<path d="M${x - w - 0.3} 50.2 Q${x - w * 0.15} ${50.2 - h * 1.7 - tilt - 0.3} ${x + w + 0.3} ${49.9 - tilt * out * 0.6}" stroke="${line}" stroke-width="${lashes ? 1.7 : 1.25}" fill="none" stroke-linecap="round"/>`
          + (crease ? `<path d="M${x - w * 0.85} ${47.8 - h * 0.62} Q${x} ${45.4 - h * 0.7} ${x + w * 0.9} ${47.6 - h * 0.62}" stroke="${lid}" stroke-width=".7" fill="none" opacity=".55" stroke-linecap="round"/>` : '')
          + `<path d="M${x - w * 0.7} ${50.2 + h * 0.85} Q${x} ${50.2 + h * 1.3} ${x + w * 0.75} ${50.2 + h * 0.8}" stroke="${lid}" stroke-width=".55" fill="none" opacity=".45"/>`
          + (lashes ? `<g stroke="${line}" stroke-width=".55" stroke-linecap="round" fill="none"><path d="M${x + out * w} ${49.9 - tilt} q${out * 1.2} -.2 ${out * 1.9} -1.3"/><path d="M${x + out * w * 0.8} ${48.4 - h * 0.55} q${out * 0.9} -.5 ${out * 1.3} -1.7"/><path d="M${x + out * w * 0.5} ${47.2 - h * 0.7} q${out * 0.5} -.6 ${out * 0.7} -1.7"/><path d="M${x + out * w * 0.15} ${46.9 - h * 0.78} q${out * 0.2} -.7 ${out * 0.2} -1.6"/></g>` : '');
      };
      // Ojo anime: grande, iris alto con degradado y dos brillos.
      const anime = (rx, ry, irx, iry, sparkle) => `<ellipse cx="${x}" cy="50.3" rx="${rx}" ry="${ry}" fill="#fff"/>`
        + `<ellipse cx="${x + out * 0.3}" cy="50.8" rx="${irx}" ry="${iry}" fill="${irisFill}"/>`
        + `<ellipse cx="${x + out * 0.3}" cy="51.4" rx="${irx * 0.45}" ry="${iry * 0.5}" fill="#160e1a"/>`
        + `<ellipse cx="${x + 1.5}" cy="${50.8 - iry * 0.45}" rx="1.5" ry="1.2" fill="#fff"/>`
        + `<circle cx="${x - 1.3}" cy="${50.8 + iry * 0.5}" r=".65" fill="#fff" opacity=".85"/>`
        + (sparkle ? `<circle cx="${x - 1.9}" cy="48.6" r=".7" fill="#fff"/>` : '')
        + `<path d="M${x - rx - 0.8} ${50.3 - ry * 0.35} Q${x} ${50.3 - ry - 1.5} ${x + rx + 0.8} ${50.3 - ry * 0.35}" stroke="${line}" stroke-width="2" fill="none" stroke-linecap="round"/>`
        + `<path d="M${x + out * (rx + 0.6)} ${50.3 - ry * 0.4} l${out * 1.7} -1.5" stroke="${line}" stroke-width="1.4" stroke-linecap="round"/>`;
      const closed = `<path d="M${x - 5} 51 Q${x} 46.6 ${x + 5} 51" stroke="${line}" stroke-width="1.6" fill="none" stroke-linecap="round"/>`
        + `<path d="M${x - 4} 47.2 Q${x} 45.4 ${x + 4} 47.2" stroke="${lid}" stroke-width=".6" fill="none" opacity=".5"/>`;
      switch (type) {
        case 1: return human(6.6, 5.2, 3.7); // grandes
        case 2: return human(6.2, 3.6, 3, 1.1); // almendrados
        case 3: return human(6.1, 4.5, 3.35, 0.4, true); // con pestañas
        case 4: return closed; // felices
        case 5: return x > 50 ? closed : human(); // guiño
        case 6: return anime(6, 7, 4.9, 6, true); // anime brillantes
        case 7: return anime(5.3, 6.2, 4.2, 5.2, false); // anime
        case 8: // anime serios: afilados
          return `<path d="M${x - 6} 51.6 Q${x - 1} 45.8 ${x + 6} ${out > 0 ? 48.8 : 51} Q${x} 55 ${x - 6} 51.6 Z" fill="#fff"/>`
            + `<circle cx="${x}" cy="51" r="3" fill="${irisFill}"/><circle cx="${x}" cy="51.2" r="1.4" fill="#160e1a"/><circle cx="${x + 1}" cy="49.8" r=".8" fill="#fff"/>`
            + `<path d="M${x - 6.6} 51.2 Q${x - 1} 45 ${x + 6.8} ${out > 0 ? 48.4 : 50.6}" stroke="${line}" stroke-width="2" fill="none" stroke-linecap="round"/>`;
        case 9: return human(6, 3, 2.8, 0.7, fem, false); // rasgados (sin pliegue)
        default: return human(); // normales
      }
    };
    return `<g class="av-eyes">${one(40.5, 'l')}${one(59.5, 'r')}</g>`;
  }

  // ─── Boca ────────────────────────────────────────────────────────────────
  function mouth(type, lip, skin) {
    const dark = '#4a1c26';
    const upper = shade(lip, 0.86);
    const line = shade(lip, 0.6);
    const closedLips = (w, up, low, smile) => `<path d="M${50 - w} 65.2 Q${50 - w * 0.5} ${65.2 - up} 50 ${64.6 - up * 0.4} Q${50 + w * 0.5} ${65.2 - up} ${50 + w} 65.2 Q50 ${65.6 + smile} ${50 - w} 65.2 Z" fill="${upper}"/>`
      + `<path d="M${50 - w} 65.2 Q50 ${65.6 + smile} ${50 + w} 65.2 Q${50 + w * 0.5} ${65.4 + low} 50 ${65.6 + low} Q${50 - w * 0.5} ${65.4 + low} ${50 - w} 65.2 Z" fill="${lip}"/>`
      + `<path d="M${50 - w} 65.2 Q50 ${65.6 + smile} ${50 + w} 65.2" stroke="${line}" stroke-width=".7" fill="none" stroke-linecap="round"/>`
      + `<path d="M${50 - w * 0.4} ${65.7 + low * 0.55} Q50 ${66 + low * 0.6} ${50 + w * 0.4} ${65.7 + low * 0.55}" stroke="#fff" stroke-width=".6" opacity=".35" fill="none"/>`;
    switch (type) {
      case 1: // risa con dientes
        return `<path d="M44 64 Q50 65.4 56 64 Q55 71 50 71 Q45 71 44 64 Z" fill="${dark}"/>`
          + `<path d="M44.6 64.4 Q50 65.6 55.4 64.4 L55 66 Q50 67 45 66 Z" fill="#fff"/><path d="M46.5 69.4 Q50 67.6 53.5 69.4 Q50 71 46.5 69.4 Z" fill="#e8707f"/>`
          + `<path d="M43.6 63.8 Q50 65 56.4 63.8" stroke="${upper}" stroke-width="1.2" fill="none" stroke-linecap="round"/>`;
      case 2: return closedLips(5.6, 1.9, 2.8, 0.4); // gruesos
      case 3: return closedLips(4.8, 1.1, 1.6, -0.3); // serio
      case 4: return `<ellipse cx="50" cy="66.2" rx="2.4" ry="3" fill="${dark}"/><path d="M47.6 64.6 Q50 62.8 52.4 64.6" stroke="${upper}" stroke-width="1.1" fill="none"/>`; // sorpresa
      case 5: return `<path d="M45 64.4 Q50 67.4 55 64.4" stroke="${line}" stroke-width="1.3" fill="none" stroke-linecap="round"/><path d="M50.2 65.6 Q50.6 70.4 53.2 70 Q55 69.4 53.8 65.2 Z" fill="#e8707f"/>`; // lengua
      case 6: return closedLips(4.6, 0.7, 1.1, 0.4); // finos
      case 7: // sonrisa de lado
        return `<path d="M45.4 65.6 Q50 66.6 54.8 64" stroke="${line}" stroke-width="1.2" fill="none" stroke-linecap="round"/><path d="M46 65.4 Q50 64.6 54 64.2 Q50 67.8 46 65.4 Z" fill="${lip}" opacity=".8"/>`;
      default: // sonrisa natural
        return closedLips(5, 1.3, 2, 1.2) + `<path d="M44.6 64.6 Q44.2 64 44.8 63.6 M55.4 64.6 Q55.8 64 55.2 63.6" stroke="${shade(skin, 0.7)}" stroke-width=".6" fill="none"/>`;
    }
  }

  // ─── Lentes (ópticos o de sol) ───────────────────────────────────────────
  function glasses(type, frame, lens) {
    if (!type) return '';
    const g = (shapes, bridge, sw = 1.6, extra = '') => `<g stroke="${frame}" stroke-width="${sw}" stroke-linejoin="round" stroke-linecap="round">
      <path d="M34 48.5 L27.5 47" fill="none"/><path d="M66 48.5 L72.5 47" fill="none"/>
      <g fill="${lens}">${shapes}</g><path d="${bridge}" fill="none"/>${extra}</g>
      <path d="M36.5 46.6 L39 45.6 M54.5 46.6 L57 45.6" stroke="#fff" stroke-width=".8" opacity=".5" stroke-linecap="round"/>`;
    switch (type) {
      case 2: return g('<rect x="34" y="44.6" width="14" height="11" rx="2.6"/><rect x="52" y="44.6" width="14" height="11" rx="2.6"/>', 'M48 48.5 Q50 47 52 48.5');
      case 3: return g('<path d="M34 45 L48 45 Q48.6 53 44 56 Q38 57.6 35 53.2 Q33.4 49 34 45 Z"/><path d="M66 45 L52 45 Q51.4 53 56 56 Q62 57.6 65 53.2 Q66.6 49 66 45 Z"/>', 'M48 45.6 L52 45.6');
      case 4: return g('<path d="M32.5 43.6 Q41 44 48 45.6 Q48.3 53.4 42 54.8 Q35.6 55.4 34.2 50 Z"/><path d="M67.5 43.6 Q59 44 52 45.6 Q51.7 53.4 58 54.8 Q64.4 55.4 65.8 50 Z"/>', 'M48 48 Q50 46.8 52 48');
      case 5: return g('<rect x="33.6" y="46" width="14.4" height="8" rx="1.4"/><rect x="52" y="46" width="14.4" height="8" rx="1.4"/>', 'M48 49 Q50 48 52 49', 1.15); // rectangulares delgados
      case 6: return g('<path d="M34 46.4 L48 46.4 Q48 54 41 54.6 Q34.4 54.4 34 46.4 Z" stroke-width=".7"/><path d="M52 46.4 L66 46.4 Q65.6 54.4 59 54.6 Q52 54 52 46.4 Z" stroke-width=".7"/>', 'M48 47 Q50 46 52 47', 1.2,
        '<path d="M33.6 46.6 Q41 44.4 48.2 46.4 M51.8 46.4 Q59 44.4 66.4 46.6" stroke-width="2.6" fill="none"/>'); // media montura
      case 7: return g('<rect x="34.4" y="45.6" width="13.4" height="9.4" rx="3.6" stroke-width=".35"/><rect x="52.2" y="45.6" width="13.4" height="9.4" rx="3.6" stroke-width=".35"/>', 'M47.8 48.6 Q50 47.6 52.2 48.6', 0.9); // sin montura
      case 8: return g('<path d="M37 44.8 L45 44.8 L48.4 50 L45 55.2 L37 55.2 L33.6 50 Z"/><path d="M55 44.8 L63 44.8 L66.4 50 L63 55.2 L55 55.2 L51.6 50 Z"/>', 'M48.4 49 Q50 48 51.6 49', 1.4); // hexagonales
      case 9: return g('<ellipse cx="41" cy="50" rx="7" ry="5.2"/><ellipse cx="59" cy="50" rx="7" ry="5.2"/>', 'M48 49.4 Q50 48.2 52 49.4', 1.3); // ovalados
      case 10: return g('<rect x="32.4" y="42.6" width="16" height="14" rx="5"/><rect x="51.6" y="42.6" width="16" height="14" rx="5"/>', 'M48.4 48 Q50 46.8 51.6 48', 1.5); // grandes
      case 11: return g('<path d="M34 50 L48 50 Q47.6 56 41 56 Q34.4 56 34 50 Z"/><path d="M52 50 L66 50 Q65.6 56 59 56 Q52.4 56 52 50 Z"/>', 'M48 50.6 Q50 49.6 52 50.6', 1.2); // de lectura (media luna)
      case 12: return g('<path d="M31 45 Q50 41.4 69 45 Q69.6 52 64 54.4 Q57 56 52 52 Q50 50.6 48 52 Q43 56 36 54.4 Q30.4 52 31 45 Z"/>', 'M48.6 46 L51.4 46', 1.4); // deportivos
      case 13: return g('<path d="M41 55.6 C35 51 33 48.6 34 46 C35 43.6 38.6 43.4 41 46 C43.4 43.4 47 43.6 48 46 C49 48.6 47 51 41 55.6 Z"/><path d="M59 55.6 C53 51 51 48.6 52 46 C53 43.6 56.6 43.4 59 46 C61.4 43.4 65 43.6 66 46 C67 48.6 65 51 59 55.6 Z"/>', 'M48 47.4 Q50 46.4 52 47.4', 1.3); // corazón
      default: return g('<circle cx="41" cy="50" r="6.6"/><circle cx="59" cy="50" r="6.6"/>', 'M47.6 49.5 Q50 48 52.4 49.5'); // redondos
    }
  }

  // ─── Barba ───────────────────────────────────────────────────────────────
  function beard(type, c) {
    const full = 'M28 50 C28.6 66 36 77 50 80.5 C64 77 71.4 66 72 50 C69 59 63 64 57 65.2 Q50 63.6 43 65.2 C37 64 31 59 28 50 Z';
    const goatee = `<path d="M44.4 68.4 C44 75.6 56 75.6 55.6 68.4 C53 69.8 47 69.8 44.4 68.4 Z" fill="${c}"/>`;
    const ring = `<path d="M43 62.6 C42 70 44 75.4 50 75.6 C56 75.4 58 70 57 62.6 C56 66 55 68.6 50 68.6 C45 68.6 44 66 43 62.6 Z" fill="${c}"/>`;
    const mustache = `<path d="M43 63.4 C46 60.6 48.6 61.4 50 62.2 C51.4 61.4 54 60.6 57 63.4 C54 64.2 52 63.8 50 63.4 C48 63.8 46 64.2 43 63.4 Z" fill="${c}"/>`;
    const texture = (op) => `<path d="${full}" fill="${c}" opacity="${op}"/>`;
    switch (type) {
      case 1: return texture(1) + mustache + `<path d="M36 70 Q50 79 64 70" stroke="${shade(c, 0.7)}" stroke-width=".6" fill="none" opacity=".5"/>`;
      case 2: return ring + mustache;
      case 3: return mustache;
      case 4: return texture(0.3) + `<path d="M43.4 63.2 Q50 61.4 56.6 63.2 Q50 64.2 43.4 63.2 Z" fill="${c}" opacity=".35"/>`;
      case 5: return mustache + goatee;
      case 6: return `<path d="M28 50 C28 70 36 88 50 92 C64 88 72 70 72 50 C69 59 63 64 57 65.2 Q50 63.6 43 65.2 C37 64 31 59 28 50 Z" fill="${c}"/>` + mustache
        + `<path d="M42 74 Q46 84 50 88 M58 74 Q54 84 50 88" stroke="${shade(c, 0.7)}" stroke-width=".6" fill="none" opacity=".5"/>`; // larga
      case 7: return `<path d="M27.6 44 L31.6 44 L32 58 Q29.4 57 28.4 53 Z" fill="${c}"/><path d="M72.4 44 L68.4 44 L68 58 Q70.6 57 71.6 53 Z" fill="${c}"/>`; // patillas
      case 8: return `<path d="M46 70 Q50 71.4 54 70 Q53.4 78 50 82 Q46.6 78 46 70 Z" fill="${c}"/>`; // chivo
      case 9: return `<path d="M44 63.4 Q47 61.8 50 62.8 Q53 61.8 56 63.4 Q53 63 50 63.6 Q47 63 44 63.4 Z" fill="${c}"/>`; // bigote fino
      case 10: return texture(0.72) + mustache; // corta
      case 11: return mustache + `<path d="M42.6 63 L45 63.6 L45.4 75 L43 74.6 Z" fill="${c}"/><path d="M57.4 63 L55 63.6 L54.6 75 L57 74.6 Z" fill="${c}"/>`; // herradura
      case 12: return mustache + `<path d="M48.4 69.6 L51.6 69.6 L50 73.4 Z" fill="${c}"/>`; // imperial
      case 13: return `<path d="M48.4 69.6 L51.6 69.6 L50 73 Z" fill="${c}"/>`; // mosca
      default: return '';
    }
  }

  // ─── Gorras y sombreros (encima del cabello) ───────────────────────────
  function hat(type, c) {
    const d = shade(c, 0.78);
    const l = shade(c, 1.18);
    switch (type) {
      case 1: return `<path d="M25.6 41 C24.6 18 75.4 18 74.4 41 Q50 35 25.6 41 Z" fill="${c}"/>` // gorra
        + `<path d="M50 19.6 L50 36 M38 22 Q36 30 36.6 38 M62 22 Q64 30 63.4 38" stroke="${d}" stroke-width=".7" fill="none"/>`
        + `<circle cx="50" cy="19.8" r="1.6" fill="${d}"/>`
        + `<path d="M24.4 41 Q50 34 75.6 41 Q81 44.4 72 46 Q50 41.4 28 46 Q19 44.4 24.4 41 Z" fill="${d}"/>`;
      case 2: return `<path d="M25.6 41 C24.6 18 75.4 18 74.4 41 Q50 36 25.6 41 Z" fill="${c}"/>` // gorra al revés
        + `<path d="M50 19.6 L50 36" stroke="${d}" stroke-width=".7"/><circle cx="50" cy="19.8" r="1.6" fill="${d}"/>`
        + `<path d="M42 39.4 Q50 37.4 58 39.4 L58 41.8 Q50 40 42 41.8 Z" fill="${d}"/><path d="M22 36 Q19 31 24 28 L27 33 Z" fill="${d}"/>`;
      case 3: { // gorro de lana con pompón
        let ribs = '';
        for (let x = 27; x <= 73; x += 3.2) ribs += `<path d="M${x} 36.4 L${x} 42.6" stroke="${d}" stroke-width=".6"/>`;
        return `<path d="M25.4 41 C24 14 76 14 74.6 41 Z" fill="${c}"/><circle cx="50" cy="13" r="5.4" fill="${l}"/>`
          + `<path d="M24 36 Q50 30.4 76 36 L76.4 43.4 Q50 37.6 23.6 43.4 Z" fill="${d}"/>${ribs}`;
      }
      case 4: return `<path d="M8 35 Q50 24 92 35 Q50 44 8 35 Z" fill="${d}"/>` // sombrero
        + `<path d="M30 34 C29 13 71 13 70 34 Q50 29 30 34 Z" fill="${c}"/><path d="M42 16 Q50 20 58 16" stroke="${d}" stroke-width="1.2" fill="none"/>`
        + `<path d="M30.4 30 Q50 25 69.6 30 L70 34 Q50 29 30 34 Z" fill="#23243a"/>`;
      case 5: return `<path d="M23 36 C20 22 58 11 78 22 C84 28 74 36 60 36.6 Q40 38.6 23 36 Z" fill="${c}"/>` // boina
        + `<path d="M24 35 Q50 39 74 33" stroke="${d}" stroke-width="1.6" fill="none"/><circle cx="58" cy="16.4" r="1.6" fill="${d}"/>`;
      case 6: { // sombrero vueltiao (blanco y negro)
        let rings = '';
        [16, 21, 26].forEach((y) => { rings += `<path d="M${33 + (y - 16) * 0.2} ${y} Q50 ${y - 3} ${67 - (y - 16) * 0.2} ${y}" stroke="#23243a" stroke-width="1.5" fill="none"/>`; });
        return `<path d="M8 35 Q50 24 92 35 Q50 45 8 35 Z" fill="#f4efe1"/><path d="M14 34.6 Q50 26 86 34.6 M20 36.4 Q50 29 80 36.4" stroke="#23243a" stroke-width="1" fill="none" stroke-dasharray="3 2"/>`
          + `<path d="M31 33 C30 11 70 11 69 33 Q50 28.6 31 33 Z" fill="#f4efe1"/>${rings}`;
      }
      case 7: return `<path d="M25 38 Q50 31 75 38 L75.4 43 Q50 36 24.6 43 Z" fill="${c}"/>` // bandana
        + `<path d="M75 39 Q82 38 84 43 Q80 44 76 42 Z M75 41 Q80 46 79 50 Q76 47 74.6 43 Z" fill="${d}"/>`
        + `<g fill="${l}" opacity=".7"><circle cx="38" cy="38.4" r=".8"/><circle cx="50" cy="35.4" r=".8"/><circle cx="62" cy="38" r=".8"/></g>`;
      case 8: return `<path d="M26.4 40 Q50 18 73.6 40" stroke="${c}" stroke-width="3" fill="none" stroke-linecap="round"/>`; // diadema
      default: return '';
    }
  }

  // ─── Accesorios: aretes, piercing, audífonos (en la cabeza) ───────────
  function accHead(type, c) {
    switch (type) {
      case 1: return `<circle cx="25.4" cy="57.6" r="1.5" fill="#e9c35a"/><circle cx="74.6" cy="57.6" r="1.5" fill="#e9c35a"/>`;
      case 2: return `<circle cx="25.6" cy="60" r="2.6" fill="none" stroke="#e1b84a" stroke-width="1"/><circle cx="74.4" cy="60" r="2.6" fill="none" stroke="#e1b84a" stroke-width="1"/>`;
      case 3: return `<circle cx="25.4" cy="58" r="1.8" fill="#f6f3ec"/><circle cx="74.6" cy="58" r="1.8" fill="#f6f3ec"/><circle cx="25" cy="57.4" r=".6" fill="#fff"/><circle cx="74.2" cy="57.4" r=".6" fill="#fff"/>`;
      case 4: return `<path d="M25.4 57.4 L25.4 61.6 M74.6 57.4 L74.6 61.6" stroke="#e1b84a" stroke-width=".7"/><path d="M25.4 61.4 L27 64.6 L25.4 67.6 L23.8 64.6 Z M74.6 61.4 L76.2 64.6 L74.6 67.6 L73 64.6 Z" fill="${c}"/>`;
      case 5: return `<circle cx="53.4" cy="59.6" r="1" fill="none" stroke="#c9ccd6" stroke-width=".6"/>`;
      case 6: return `<path d="M24 50 C22 14 78 14 76 50" stroke="#2b2d3c" stroke-width="3" fill="none"/>`
        + `<rect x="19.6" y="45" width="7.6" height="13" rx="3.6" fill="#2b2d3c"/><rect x="72.8" y="45" width="7.6" height="13" rx="3.6" fill="#2b2d3c"/>`
        + `<rect x="21" y="47" width="2.4" height="9" rx="1.2" fill="${c}"/><rect x="76.6" y="47" width="2.4" height="9" rx="1.2" fill="${c}"/>`;
      default: return '';
    }
  }

  // ─── Avatar completo ────────────────────────────────────────────────────
  // crop: muestra solo una parte (para las miniaturas del editor).
  // La cabeza se dibuja reducida (90 %) para dejar ver cuello y hombros;
  // los recortes ya consideran esa escala.
  const CROPS = {
    full: '0 0 100 100', eyes: '32 34.5 36 21', mouth: '36 47.3 28 18',
    beard: '24 38 52 44', hair: '14 4 72 72', shirt: '18 36 64 64', glasses: '29 31 42 24',
    face: '18 10 64 66', hat: '6 0 88 60', acc: '10 10 80 80'
  };
  let uid = 0;

  // Playera con cuello redondo: lisa o con rayas (recortadas a la silueta).
  function shirt(a, id) {
    const main = SHIRT_COLORS[a.shirtColor].c;
    const stripe = SHIRT_COLORS[a.stripeColor === a.shirtColor ? (a.stripeColor + 1) % SHIRT_COLORS.length : a.stripeColor].c;
    const body = a.g === 'm'
      ? 'M13 100 C15 87 27 79.5 40.5 78.5 Q50 88 59.5 78.5 C73 79.5 85 87 87 100 Z'
      : 'M6 100 C8 86 22 78.5 39.5 77.5 Q50 88 60.5 77.5 C78 78.5 92 86 94 100 Z';
    let stripes = '';
    if (a.shirt > 0) {
      let rects = '';
      if (a.shirt === 3) for (let x = 2; x < 100; x += 8) rects += `<rect x="${x}" y="70" width="4" height="30"/>`;
      else {
        const step = a.shirt === 1 ? 7 : 4;
        const h = a.shirt === 1 ? 3.5 : 1.6;
        for (let y = 80; y < 100; y += step) rects += `<rect x="0" y="${y}" width="100" height="${h}"/>`;
      }
      stripes = `<clipPath id="${id}s"><path d="${body}"/></clipPath><g clip-path="url(#${id}s)" fill="${stripe}">${rects}</g>`;
    }
    const collar = a.g === 'm' ? 'M40.5 78.5 Q50 88 59.5 78.5' : 'M39.5 77.5 Q50 88 60.5 77.5';
    // Pliegues para dar volumen.
    const folds = `<path d="M24 92 Q28 86 33 84 M76 92 Q72 86 67 84" stroke="${shade(main, 0.75)}" stroke-width=".8" fill="none" opacity=".5"/>`;
    const volume = `<path d="${body}" fill="url(#${id}t)"/><path d="M36 80 Q50 92 64 80" stroke="#000" stroke-width="3" fill="none" opacity=".16" filter="url(#${id}s1)"/>`;
    return `<path d="${body}" fill="${main}"/>${stripes}${folds}${volume}<path d="${collar}" fill="none" stroke="${shade(main, 0.74)}" stroke-width="2.4" stroke-linecap="round"/>`;
  }

  function render(input, crop = 'full') {
    const a = normalize(input);
    const skin = SKIN[a.skin].c;
    const hairC = HAIR_COLORS[a.hairColor].c;
    const bg = BG[a.bg];
    const skinShade = shade(skin, 0.86);
    const skinDeep = shade(skin, 0.72);
    const deepSkin = a.skin === 4 || a.skin === 5 || a.skin === 9;
    const lip = deepSkin ? shade(skin, 0.72) : a.g === 'm' ? '#c85a6c' : '#c97a72';
    const browColor = a.hair === 0 && a.hairColor === 5 ? '#9a9aa0' : shade(hairC, 0.8);
    const id = `av${(uid++).toString(36)}${Math.random().toString(36).slice(2, 6)}`;
    const iris = EYE_COLORS[a.eyeColor].c;
    const hairFill = `url(#${id}h)`;
    const anime = a.eyes >= 6 && a.eyes <= 8;
    FX = id;
    // Cara: mandíbula más marcada en hombres, más suave en mujeres.
    // Forma de la cara: "Normal" depende del sexo (mandíbula más marcada en hombres).
    const FACES = [
      null,
      'M30 44 C30 28 39 22 50 22 C61 22 70 28 70 44 C70 58 66 69 60.5 74.6 C57 77.8 53.5 79.2 50 79.2 C46.5 79.2 43 77.8 39.5 74.6 C34 69 30 58 30 44 Z', // ovalada
      'M27.6 44 C27.6 29 38 23 50 23 C62 23 72.4 29 72.4 44 L72.4 64 C72.4 69.6 70 72.6 65.4 75 C60.4 77.6 55.4 78.2 50 78.2 C44.6 78.2 39.6 77.6 34.6 75 C30 72.6 27.6 69.6 27.6 64 Z', // cuadrada
      'M26.4 48 C26.4 30 37 23.4 50 23.4 C63 23.4 73.6 30 73.6 48 C73.6 64 64 76.6 50 76.6 C36 76.6 26.4 64 26.4 48 Z', // redonda
      'M29.6 44 C29.6 28 38.6 21.5 50 21.5 C61.4 21.5 70.4 28 70.4 44 C70.4 58 68 68 63 74 C59 78.6 54.6 80 50 80 C45.4 80 41 78.6 37 74 C32 68 29.6 58 29.6 44 Z', // alargada
      'M27.4 45 C27.4 29 38 22.5 50 22.5 C62 22.5 72.6 29 72.6 45 C72.6 55 69 63 63.6 69.4 C58.6 75 54 78.2 50 78.2 C46 78.2 41.4 75 36.4 69.4 C31 63 27.4 55 27.4 45 Z' // corazón
    ];
    const face = FACES[a.face] || (a.g === 'm'
      ? 'M28.6 46 C28.6 30 38 23 50 23 C62 23 71.4 30 71.4 46 C71.4 57 68 65 62.6 71 C58 75.6 54 78 50 78 C46 78 42 75.6 37.4 71 C32 65 28.6 57 28.6 46 Z'
      : 'M28 46 C28 30 38 23 50 23 C62 23 72 30 72 46 C72 55.5 70.5 62 67 67 C63 73.6 56.5 78.5 50 78.5 C43.5 78.5 37 73.6 33 67 C29.5 62 28 55.5 28 46 Z');
    const hatC = SHIRT_COLORS[a.hatColor].c;

    return `<svg class="av-svg" viewBox="${CROPS[crop] || CROPS.full}" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" focusable="false">
<defs>
  <linearGradient id="${id}h" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${shade(hairC, 1.25)}"/><stop offset=".5" stop-color="${hairC}"/><stop offset="1" stop-color="${shade(hairC, 0.72)}"/></linearGradient>
  <radialGradient id="${id}i" cx=".5" cy=".6" r=".6"><stop offset="0" stop-color="${shade(iris, 1.35)}"/><stop offset=".6" stop-color="${iris}"/><stop offset="1" stop-color="${shade(iris, 0.55)}"/></radialGradient>
  <radialGradient id="${id}k" cx=".5" cy=".42" r=".62"><stop offset="0" stop-color="${shade(skin, 1.06)}"/><stop offset=".7" stop-color="${skin}"/><stop offset="1" stop-color="${skinShade}"/></radialGradient>
  <radialGradient id="${id}b" cx=".5" cy=".35" r=".8"><stop offset="0" stop-color="#fff" stop-opacity=".5"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></radialGradient>
  <clipPath id="${id}f"><path d="${face}"/></clipPath>
  <filter id="${id}s1" x="-30%" y="-30%" width="160%" height="160%"><feGaussianBlur stdDeviation="1.1"/></filter>
  <filter id="${id}s2" x="-30%" y="-30%" width="160%" height="160%"><feGaussianBlur stdDeviation="2.4"/></filter>
  <linearGradient id="${id}t" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff" stop-opacity=".22"/><stop offset=".5" stop-color="#fff" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".12"/></linearGradient>
</defs>
<rect x="0" y="0" width="100" height="100" fill="${bg.c}"/>
<rect x="0" y="0" width="100" height="100" fill="url(#${id}b)"/>
<path d="M42.5 64 L57.5 64 L58 84 Q50 88 42 84 Z" fill="${skinShade}"/>
<path d="M41.6 66 Q50 80 58.4 66 L58.4 78 Q50 84 41.6 78 Z" fill="${skinDeep}" opacity=".55" filter="url(#${id}s2)"/>
${shirt(a, id)}
${a.acc === 7 ? `<path d="M41 77 Q50 89 59 77" stroke="#e1b84a" stroke-width=".9" fill="none"/><circle cx="50" cy="84.2" r="1.8" fill="${hatC}" stroke="#e1b84a" stroke-width=".6"/>` : ''}
<g class="av-head"><g transform="translate(50 43) scale(.9) translate(-50 -48)">
${hairBack(a.hair, hairFill)}
<path d="M29 46 Q23.6 44.6 23.8 51.4 Q24.4 57.6 30 57.6 Z" fill="${skinShade}"/><path d="M71 46 Q76.4 44.6 76.2 51.4 Q75.6 57.6 70 57.6 Z" fill="${skinShade}"/>
<path d="M27.4 48.6 Q25.8 51.4 28 55" stroke="${skinDeep}" stroke-width=".7" fill="none" opacity=".6"/><path d="M72.6 48.6 Q74.2 51.4 72 55" stroke="${skinDeep}" stroke-width=".7" fill="none" opacity=".6"/>
<path d="${face}" fill="url(#${id}k)"/>
<g clip-path="url(#${id}f)">
  <g filter="url(#${id}s2)">
    <path d="M22 38 Q26 66 44 82 L18 82 Z" fill="${skinDeep}" opacity=".38"/><path d="M78 38 Q74 66 56 82 L82 82 Z" fill="${skinDeep}" opacity=".38"/>
    <ellipse cx="50" cy="81" rx="15" ry="5" fill="${skinDeep}" opacity=".4"/>
    <ellipse cx="36.5" cy="55.5" rx="5.5" ry="2.6" fill="#fff" opacity=".2"/><ellipse cx="63.5" cy="55.5" rx="5.5" ry="2.6" fill="#fff" opacity=".2"/>
    <ellipse cx="50" cy="33" rx="12" ry="5" fill="#fff" opacity=".2"/>
    ${BANG_SHADOW.has(a.hair) ? `<path d="M22 34 L78 34 L78 42 Q63 46 50 44.6 Q37 46 22 42 Z" fill="${skinDeep}" opacity=".4"/>` : ''}
  </g>
  <g filter="url(#${id}s1)">
    <ellipse cx="40.5" cy="46.6" rx="6.2" ry="2.2" fill="${skinDeep}" opacity=".28"/><ellipse cx="59.5" cy="46.6" rx="6.2" ry="2.2" fill="${skinDeep}" opacity=".28"/>
    <path d="M48.2 47.5 Q47.2 54 46.4 57.4" stroke="${skinDeep}" stroke-width="1.8" fill="none" opacity=".4"/>
    <ellipse cx="50" cy="59.4" rx="3.8" ry="1.3" fill="${skinDeep}" opacity=".35"/>
    <ellipse cx="50" cy="70.6" rx="4.2" ry="1.4" fill="${skinDeep}" opacity=".3"/>
    <path d="M51.2 48 L51.2 55" stroke="#fff" stroke-width="1.4" opacity=".22"/>
  </g>
</g>
${a.acc >= 1 && a.acc <= 5 ? accHead(a.acc, hatC) : ''}
<g filter="url(#${id}s2)"><ellipse cx="36" cy="60" rx="5" ry="2.8" fill="#f07a8a" opacity="${anime ? 0.4 : 0.24}"/><ellipse cx="64" cy="60" rx="5" ry="2.8" fill="#f07a8a" opacity="${anime ? 0.4 : 0.24}"/></g>
${beard(a.beard, hairC)}
<ellipse cx="50" cy="57.4" rx="3.1" ry="2.2" fill="${skinShade}" opacity=".7" filter="url(#${id}s1)"/>
<path d="M46.6 58.2 Q47.2 59.9 48.9 59.5 M53.4 58.2 Q52.8 59.9 51.1 59.5" stroke="${skinDeep}" stroke-width=".9" fill="none" stroke-linecap="round"/>
<ellipse cx="50.6" cy="56.6" rx="1.4" ry=".9" fill="#fff" opacity=".35" filter="url(#${id}s1)"/>
${mouth(a.lips, lip, skin)}
${[0, 2, 3, 6].includes(a.lips) ? `<ellipse cx="51" cy="66.8" rx="2.2" ry=".7" fill="#fff" opacity=".45" filter="url(#${id}s1)"/>` : ''}
${eyes(a.eyes, `url(#${id}i)`, '#231a22', skinDeep, id, a.g === 'm')}
${brows(a.brows, browColor, anime)}
${glasses(a.glasses, FRAME_COLORS[a.glassesColor].c, LENSES[a.lens].c)}
${hairFront(a.hair, hairFill, hairC)}
${a.hair === 0 && !a.hat ? `<ellipse cx="44" cy="30" rx="7" ry="3" fill="#fff" opacity=".2"/>` : ''}
${a.acc === 6 ? accHead(6, hatC) : ''}
${hat(a.hat, hatC)}
</g></g>
</svg>`;
  }

  window.Avatar = { SPEC, DEFAULTS, normalize, random, render };
})();
