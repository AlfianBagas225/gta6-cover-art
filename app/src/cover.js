// Palm Sunset Cover Studio — the cover engine.
//
// Draws a GTA-poster-style multi-panel cover onto any 2D canvas from a plain
// state object: pick a layout, a colour grade and a caption, and the engine
// composes the panels, the lettering, the grain and the vignette. The same
// function renders the live preview and the exported PNG, so what you see is
// exactly what you share. No Rockstar art, logo or font is used anywhere:
// the lettering is Anton, Pacifico and Bebas Neue, all under the SIL Open
// Font License, vendored under app/fonts/.

export const LAYOUTS = {
  'hero-trio': {
    label: 'Hero + Trio',
    hint: 'One big hero panel, three stacked beside it',
    slots: [
      { x: 0, y: 0, w: 0.6, h: 1 },
      { x: 0.6, y: 0, w: 0.4, h: 1 / 3 },
      { x: 0.6, y: 1 / 3, w: 0.4, h: 1 / 3 },
      { x: 0.6, y: 2 / 3, w: 0.4, h: 1 / 3 },
    ],
    title: { x: 0.03, y: 0.76, w: 0.94, h: 0.21, align: 'left' },
  },
  'four-grid': {
    label: 'Four Grid',
    hint: 'A classic 2 x 2 poster grid',
    slots: [
      { x: 0, y: 0, w: 0.5, h: 0.5 },
      { x: 0.5, y: 0, w: 0.5, h: 0.5 },
      { x: 0, y: 0.5, w: 0.5, h: 0.5 },
      { x: 0.5, y: 0.5, w: 0.5, h: 0.5 },
    ],
    title: { x: 0.04, y: 0.74, w: 0.92, h: 0.22, align: 'center' },
  },
  'triple-strip': {
    label: 'Triple Strip',
    hint: 'Three tall panels side by side',
    slots: [
      { x: 0, y: 0, w: 1 / 3, h: 1 },
      { x: 1 / 3, y: 0, w: 1 / 3, h: 1 },
      { x: 2 / 3, y: 0, w: 1 / 3, h: 1 },
    ],
    title: { x: 0.04, y: 0.78, w: 0.92, h: 0.19, align: 'center' },
  },
  'full-bleed': {
    label: 'Full Bleed',
    hint: 'One photo edge to edge, title over it',
    slots: [{ x: 0, y: 0, w: 1, h: 1 }],
    title: { x: 0.05, y: 0.72, w: 0.9, h: 0.24, align: 'left' },
  },
  'tilted-snaps': {
    label: 'Tilted Snaps',
    hint: 'Three snapshots tossed on a sunset backdrop',
    backdrop: true,
    slots: [
      { x: 0.05, y: 0.16, w: 0.42, h: 0.56, rot: -6 },
      { x: 0.3, y: 0.26, w: 0.42, h: 0.56, rot: 4 },
      { x: 0.55, y: 0.12, w: 0.42, h: 0.56, rot: -2 },
    ],
    title: { x: 0.05, y: 0.8, w: 0.9, h: 0.17, align: 'center' },
  },
  'nine-mosaic': {
    label: 'Nine Mosaic',
    hint: 'Eight photos around a title block',
    slots: [
      { x: 0, y: 0, w: 1 / 3, h: 1 / 3 },
      { x: 1 / 3, y: 0, w: 1 / 3, h: 1 / 3 },
      { x: 2 / 3, y: 0, w: 1 / 3, h: 1 / 3 },
      { x: 0, y: 1 / 3, w: 1 / 3, h: 1 / 3 },
      { title: true },
      { x: 2 / 3, y: 1 / 3, w: 1 / 3, h: 1 / 3 },
      { x: 0, y: 2 / 3, w: 1 / 3, h: 1 / 3 },
      { x: 1 / 3, y: 2 / 3, w: 1 / 3, h: 1 / 3 },
      { x: 2 / 3, y: 2 / 3, w: 1 / 3, h: 1 / 3 },
    ],
    title: { x: 1 / 3, y: 1 / 3, w: 1 / 3, h: 1 / 3, align: 'center', block: true },
  },
};

export const GRADES = {
  sunset: {
    label: 'Sunset',
    filter: 'saturate(1.3) contrast(1.06) brightness(1.02)',
    accent: '#ffd166',
    script: '#ffe9a8',
    washes: [
      { blend: 'overlay', stops: [[0, 'rgba(255,120,60,0)'], [1, 'rgba(255,110,60,0.34)']] },
      { blend: 'soft-light', stops: [[0, 'rgba(190,40,120,0)'], [1, 'rgba(190,40,120,0.4)']] },
    ],
  },
  neon: {
    label: 'Neon',
    filter: 'saturate(1.7) contrast(1.12)',
    accent: '#5ff2ff',
    script: '#ff7ad9',
    washes: [
      { blend: 'screen', stops: [[0, 'rgba(255,60,180,0.22)'], [0.55, 'rgba(255,60,180,0)'], [1, 'rgba(40,220,255,0.22)']] },
      { blend: 'overlay', stops: [[0, 'rgba(20,10,60,0.25)'], [1, 'rgba(20,10,60,0)']] },
    ],
  },
  'vice-gold': {
    label: 'Vice Gold',
    filter: 'sepia(0.28) saturate(1.45) contrast(1.05)',
    accent: '#ffcf4d',
    script: '#fff3c4',
    washes: [
      { blend: 'soft-light', stops: [[0, 'rgba(255,190,60,0.1)'], [1, 'rgba(255,160,40,0.42)']] },
    ],
  },
  'teal-night': {
    label: 'Teal Night',
    filter: 'saturate(1.1) contrast(1.08) brightness(0.92)',
    accent: '#7fe7d2',
    script: '#c8fff2',
    washes: [
      { blend: 'overlay', stops: [[0, 'rgba(20,120,140,0.3)'], [1, 'rgba(10,20,70,0.42)']] },
    ],
  },
  'mono-noir': {
    label: 'Mono Noir',
    filter: 'grayscale(1) contrast(1.18) brightness(1.03)',
    accent: '#f2f2f2',
    script: '#ffffff',
    washes: [
      { blend: 'soft-light', stops: [[0, 'rgba(255,255,255,0.08)'], [1, 'rgba(0,0,0,0.3)']] },
    ],
  },
};

export const EXPORT_SIZES = [
  { id: '1080x1080', label: 'Square · 1080 x 1080', w: 1080, h: 1080 },
  { id: '1080x1350', label: 'Portrait · 1080 x 1350', w: 1080, h: 1350 },
  { id: '1920x1080', label: 'Landscape · 1920 x 1080', w: 1920, h: 1080 },
];

/** A fresh default state: hero layout, sunset grade, sample-ready panels. */
export function defaultCoverState() {
  return {
    layout: 'hero-trio',
    grade: 'sunset',
    title: 'NEON SHORE',
    subtitle: 'a vice coast story',
    titleFont: 'anton',
    titlePos: 'bottom',
    titleGradient: true,
    frame: true,
    grain: true,
    vignette: true,
    badge: true,
    stars: 5,
    panels: Array.from({ length: 8 }, (_, i) => ({
      photo: i % 2,
      zoom: 1.12 + (i % 3) * 0.09,
      ox: (i % 2 === 0 ? -0.04 : 0.04),
      oy: 0,
    })),
  };
}

/** The photo slots of a layout, in panel order (title cells skipped). */
export function photoSlots(layoutId) {
  return LAYOUTS[layoutId].slots.filter((s) => !s.title);
}

let grainTile = null;
/** A small tiled noise canvas, built once, for the film-grain finish. */
function grainPattern(ctx) {
  if (grainTile) return grainTile;
  const tile = document.createElement('canvas');
  tile.width = 140;
  tile.height = 140;
  const tctx = tile.getContext('2d');
  const data = tctx.createImageData(140, 140);
  for (let i = 0; i < data.data.length; i += 4) {
    const v = 118 + Math.floor(Math.random() * 20);
    data.data[i] = v;
    data.data[i + 1] = v;
    data.data[i + 2] = v;
    data.data[i + 3] = 255;
  }
  tctx.putImageData(data, 0, 0);
  grainTile = ctx.createPattern(tile, 'repeat');
  return grainTile;
}

/** Draws one photo into a slot rect, cover-fit, with zoom and pan offsets.
 * The visible band is anchored toward the top of the photo (faces sit in the
 * upper third), and the offsets are clamped so the photo always covers the
 * slot — no empty corners, whatever the user drags. */
function drawPhotoInto(ctx, img, rect, panel, filter) {
  const { x, y, w, h } = rect;
  const base = Math.max(w / img.naturalWidth, h / img.naturalHeight) * (panel?.zoom ?? 1);
  const dw = img.naturalWidth * base;
  const dh = img.naturalHeight * base;
  const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
  const dx = clamp(x + (w - dw) * 0.5 + (panel?.ox ?? 0) * w, x + w - dw, x);
  const dy = clamp(y + (h - dh) * 0.18 + (panel?.oy ?? 0) * h, y + h - dh, y);
  ctx.save();
  ctx.beginPath();
  ctx.rect(x, y, w, h);
  ctx.clip();
  if (filter) ctx.filter = filter;
  ctx.drawImage(img, dx, dy, dw, dh);
  ctx.restore();
}

/** The grade's colour washes, laid over the whole cover. */
function applyGradeWashes(ctx, grade, w, h) {
  for (const wash of grade.washes) {
    const g = ctx.createLinearGradient(0, 0, w * 0.35, h);
    for (const [stop, color] of wash.stops) g.addColorStop(stop, color);
    ctx.save();
    ctx.globalCompositeOperation = wash.blend;
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
    ctx.restore();
  }
}

/** Fits a one-line title into its zone and draws it with outline + fill. */
function drawTitleBlock(ctx, state, zone, w, h) {
  const grade = GRADES[state.grade];
  const zx = zone.x * w;
  const zy = zone.y * h;
  const zw = zone.w * w;
  const zh = zone.h * h;
  const title = (state.title || '').trim().toUpperCase();
  const subtitle = (state.subtitle || '').trim();

  if (zone.block) {
    const g = ctx.createLinearGradient(zx, zy, zx + zw, zy + zh);
    g.addColorStop(0, '#ff7a3d');
    g.addColorStop(0.55, '#e83e8c');
    g.addColorStop(1, '#7b2ff7');
    ctx.fillStyle = g;
    ctx.fillRect(zx, zy, zw, zh);
  } else if (state.titlePos === 'bottom' || !zone.block) {
    const scrim = ctx.createLinearGradient(0, zy - zh * 0.35, 0, zy + zh);
    scrim.addColorStop(0, 'rgba(12,6,24,0)');
    scrim.addColorStop(1, 'rgba(12,6,24,0.78)');
    ctx.fillStyle = scrim;
    ctx.fillRect(0, zy - zh * 0.35, w, zy + zh - (zy - zh * 0.35));
  }

  const alignX = zone.align === 'left' ? zx + zw * 0.03 : zone.align === 'right' ? zx + zw * 0.97 : zx + zw / 2;
  ctx.textAlign = zone.align === 'left' ? 'left' : zone.align === 'right' ? 'right' : 'center';
  ctx.textBaseline = 'middle';

  if (title) {
    const family = state.titleFont === 'bebas' ? '"Bebas Neue"' : 'Anton';
    let size = zh * (subtitle ? 0.52 : 0.68);
    ctx.font = `${size}px ${family}`;
    while (ctx.measureText(title).width > zw * 0.96 && size > 10) {
      size -= 2;
      ctx.font = `${size}px ${family}`;
    }
    const ty = zy + zh * (subtitle ? 0.36 : 0.5);
    ctx.lineJoin = 'round';
    ctx.lineWidth = Math.max(2, size * 0.07);
    ctx.strokeStyle = 'rgba(16,6,26,0.9)';
    ctx.strokeText(title, alignX, ty);
    if (state.titleGradient) {
      const tg = ctx.createLinearGradient(alignX - zw / 2, 0, alignX + zw / 2, 0);
      tg.addColorStop(0, '#ffe259');
      tg.addColorStop(0.5, '#ff7e5f');
      tg.addColorStop(1, grade.accent);
      ctx.fillStyle = tg;
    } else {
      ctx.fillStyle = '#ffffff';
    }
    ctx.shadowColor = 'rgba(0,0,0,0.45)';
    ctx.shadowBlur = size * 0.12;
    ctx.shadowOffsetY = size * 0.03;
    ctx.fillText(title, alignX, ty);
    ctx.shadowBlur = 0;
    ctx.shadowOffsetY = 0;
  }

  if (subtitle) {
    // The subtitle shrinks to fit its zone, like the title: a long line in
    // a narrow title block (the mosaic's centre cell) must never spill over
    // the neighbouring photos.
    let size = Math.max(12, zh * 0.22);
    ctx.font = `${size}px Pacifico, cursive`;
    while (ctx.measureText(subtitle).width > zw * 0.96 && size > 10) {
      size -= 2;
      ctx.font = `${size}px Pacifico, cursive`;
    }
    ctx.fillStyle = grade.script;
    ctx.shadowColor = 'rgba(0,0,0,0.5)';
    ctx.shadowBlur = size * 0.25;
    const sy = zy + zh * (title ? 0.74 : 0.5);
    ctx.fillText(subtitle, alignX, sy);
    ctx.shadowBlur = 0;
  }
}

/** A small badge pill and star meter in the cover's top corners. */
function drawBadgeAndStars(ctx, state, w, h) {
  const pad = Math.round(Math.min(w, h) * 0.022);
  const bh = Math.round(Math.min(w, h) * 0.045);
  if (state.badge) {
    ctx.font = `${Math.round(bh * 0.52)}px "Bebas Neue", sans-serif`;
    try { ctx.letterSpacing = '3px'; } catch { /* older canvas: no letter-spacing */ }
    const label = 'VICE COAST';
    const tw = ctx.measureText(label).width;
    ctx.fillStyle = 'rgba(12,6,24,0.72)';
    roundRect(ctx, pad, pad, tw + pad * 1.6, bh, bh / 2);
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText(label, pad * 1.8, pad + bh / 2 + 1);
    try { ctx.letterSpacing = '0px'; } catch { /* reset */ }
  }
  if (state.stars > 0) {
    const size = Math.round(Math.min(w, h) * 0.032);
    ctx.font = `${size}px sans-serif`;
    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#ffd166';
    ctx.shadowColor = 'rgba(0,0,0,0.6)';
    ctx.shadowBlur = size * 0.2;
    ctx.fillText('★'.repeat(state.stars) + '☆'.repeat(Math.max(0, 5 - state.stars)), w - pad, pad + bh / 2);
    ctx.shadowBlur = 0;
  }
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

/**
 * Draws the whole cover for `state` onto `canvas` at the canvas's own size.
 * `photos` is the library of loaded images; a panel's `photo` is its index.
 * Returns the list of photo slot rects (pixels) for hit-testing in the editor.
 */
export function drawCover(canvas, state, photos) {
  const ctx = canvas.getContext('2d');
  const w = canvas.width;
  const h = canvas.height;
  const layout = LAYOUTS[state.layout] ?? LAYOUTS['hero-trio'];
  const grade = GRADES[state.grade] ?? GRADES.sunset;
  const gutter = state.frame ? Math.max(2, Math.round(Math.min(w, h) * 0.008)) : 0;

  ctx.clearRect(0, 0, w, h);
  ctx.fillStyle = state.frame ? '#fdfbf7' : '#14081f';
  ctx.fillRect(0, 0, w, h);

  if (layout.backdrop) {
    const bg = ctx.createLinearGradient(0, 0, w, h);
    bg.addColorStop(0, '#ff9a3d');
    bg.addColorStop(0.5, '#ff4e7a');
    bg.addColorStop(1, '#6a2bff');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, w, h);
    ctx.save();
    ctx.globalCompositeOperation = 'overlay';
    ctx.fillStyle = 'rgba(255,220,120,0.25)';
    ctx.fillRect(0, 0, w, h);
    ctx.restore();
  }

  const slotRects = [];
  let panelIndex = 0;
  for (const slot of layout.slots) {
    if (slot.title) continue;
    const sx = slot.x * w + gutter;
    const sy = slot.y * h + gutter;
    const sw = slot.w * w - gutter * 2;
    const sh = slot.h * h - gutter * 2;
    const panel = state.panels[panelIndex] ?? { photo: 0, zoom: 1, ox: 0, oy: 0 };
    const img = photos[panel.photo] ?? photos[0] ?? null;
    if (slot.rot) {
      ctx.save();
      ctx.translate(sx + sw / 2, sy + sh / 2);
      ctx.rotate((slot.rot * Math.PI) / 180);
      ctx.fillStyle = '#fdfbf7';
      ctx.shadowColor = 'rgba(0,0,0,0.45)';
      ctx.shadowBlur = Math.round(Math.min(w, h) * 0.03);
      ctx.shadowOffsetY = Math.round(Math.min(w, h) * 0.012);
      ctx.fillRect(-sw / 2 - gutter * 2, -sh / 2 - gutter * 2, sw + gutter * 4, sh + gutter * 4);
      ctx.restore();
      ctx.save();
      ctx.translate(sx + sw / 2, sy + sh / 2);
      ctx.rotate((slot.rot * Math.PI) / 180);
      ctx.beginPath();
      ctx.rect(-sw / 2, -sh / 2, sw, sh);
      ctx.clip();
      if (img) drawPhotoInto(ctx, img, { x: -sw / 2, y: -sh / 2, w: sw, h: sh }, panel, grade.filter);
      ctx.restore();
      slotRects.push({ x: sx, y: sy, w: sw, h: sh, rot: slot.rot, panel: panelIndex });
    } else {
      if (img) drawPhotoInto(ctx, img, { x: sx, y: sy, w: sw, h: sh }, panel, grade.filter);
      else {
        ctx.fillStyle = '#241533';
        ctx.fillRect(sx, sy, sw, sh);
      }
      slotRects.push({ x: sx, y: sy, w: sw, h: sh, panel: panelIndex });
    }
    panelIndex += 1;
  }

  if (!layout.backdrop) applyGradeWashes(ctx, grade, w, h);
  else applyGradeWashes(ctx, { ...grade, washes: grade.washes.slice(0, 1) }, w, h);

  const zone = { ...layout.title };
  if (state.titlePos === 'top' && !zone.block) zone.y = 0.03;
  if (state.titlePos === 'center' && !zone.block) zone.y = 0.4;
  drawTitleBlock(ctx, state, zone, w, h);
  drawBadgeAndStars(ctx, state, w, h);

  if (state.vignette) {
    const v = ctx.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.42, w / 2, h / 2, Math.max(w, h) * 0.75);
    v.addColorStop(0, 'rgba(0,0,0,0)');
    v.addColorStop(1, 'rgba(0,0,0,0.38)');
    ctx.fillStyle = v;
    ctx.fillRect(0, 0, w, h);
  }
  if (state.grain) {
    ctx.save();
    ctx.globalAlpha = 0.07;
    ctx.globalCompositeOperation = 'overlay';
    ctx.fillStyle = grainPattern(ctx);
    ctx.fillRect(0, 0, w, h);
    ctx.restore();
  }
  return slotRects;
}

/** Renders `state` at an export size and returns the offscreen canvas. */
export function renderCoverCanvas(state, photos, width, height) {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  drawCover(canvas, state, photos);
  return canvas;
}
