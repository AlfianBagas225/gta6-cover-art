// Palm Sunset Cover Studio — the cover painter.
//
// This module turns a plain state object into a finished poster on any 2D
// canvas: six multi-panel compositions, five colour grades, poster
// lettering with a sunset gradient, plus grain and a vignette. The live
// preview and the exported PNG both go through this one painter, so the
// preview is exactly what gets shared.
//
// Everything drawn here is original: the lettering uses Anton, Pacifico and
// Bebas Neue (SIL Open Font License, vendored under app/fonts/), and no
// Rockstar artwork, logo or typeface appears anywhere.
//
// Lettering legibility: the title opens at 0.60 of its zone height, the
// subtitle carries the same dark outline as the title, and the scrim behind
// the words reaches 0.86 — so a cover still reads when it is shown about
// 300 px wide.

const clampNum = (v, lo, hi) => (v < lo ? lo : v > hi ? hi : v);

/** Six compositions. A cell is a fraction of the cover — left, top, width,
 * height, an optional tilt in degrees — and `isTitle` marks the title
 * block of the mosaic. `zone` is where the lettering lives, `anchor` how
 * it lines up, and `backdrop` means the cover gets a sunset sky behind
 * the panels instead of a plain background. */
export const COVER_LAYOUTS = {
  'hero-trio': {
    name: 'Hero + Trio',
    blurb: 'One big hero panel with three stacked beside it',
    cells: [
      { left: 0, top: 0, width: 0.6, height: 1 },
      { left: 0.6, top: 0, width: 0.4, height: 1 / 3 },
      { left: 0.6, top: 1 / 3, width: 0.4, height: 1 / 3 },
      { left: 0.6, top: 2 / 3, width: 0.4, height: 1 / 3 },
    ],
    zone: { left: 0.03, top: 0.76, width: 0.94, height: 0.21, anchor: 'left' },
  },
  'four-grid': {
    name: 'Four Grid',
    blurb: 'A classic 2 x 2 poster grid',
    cells: [
      { left: 0, top: 0, width: 0.5, height: 0.5 },
      { left: 0.5, top: 0, width: 0.5, height: 0.5 },
      { left: 0, top: 0.5, width: 0.5, height: 0.5 },
      { left: 0.5, top: 0.5, width: 0.5, height: 0.5 },
    ],
    zone: { left: 0.04, top: 0.74, width: 0.92, height: 0.22, anchor: 'center' },
  },
  'triple-strip': {
    name: 'Triple Strip',
    blurb: 'Three tall panels side by side',
    cells: [
      { left: 0, top: 0, width: 1 / 3, height: 1 },
      { left: 1 / 3, top: 0, width: 1 / 3, height: 1 },
      { left: 2 / 3, top: 0, width: 1 / 3, height: 1 },
    ],
    zone: { left: 0.04, top: 0.78, width: 0.92, height: 0.19, anchor: 'center' },
  },
  'full-bleed': {
    name: 'Full Bleed',
    blurb: 'One photo edge to edge, title over it',
    cells: [{ left: 0, top: 0, width: 1, height: 1 }],
    zone: { left: 0.05, top: 0.72, width: 0.9, height: 0.24, anchor: 'left' },
  },
  'tilted-snaps': {
    name: 'Tilted Snaps',
    blurb: 'Three snapshots tossed on a sunset backdrop',
    backdrop: true,
    cells: [
      { left: 0.05, top: 0.16, width: 0.42, height: 0.56, tilt: -6 },
      { left: 0.3, top: 0.26, width: 0.42, height: 0.56, tilt: 4 },
      { left: 0.55, top: 0.12, width: 0.42, height: 0.56, tilt: -2 },
    ],
    zone: { left: 0.05, top: 0.8, width: 0.9, height: 0.17, anchor: 'center' },
  },
  'nine-mosaic': {
    name: 'Nine Mosaic',
    blurb: 'Eight photos around a title block',
    cells: [
      { left: 0, top: 0, width: 1 / 3, height: 1 / 3 },
      { left: 1 / 3, top: 0, width: 1 / 3, height: 1 / 3 },
      { left: 2 / 3, top: 0, width: 1 / 3, height: 1 / 3 },
      { left: 0, top: 1 / 3, width: 1 / 3, height: 1 / 3 },
      { isTitle: true },
      { left: 2 / 3, top: 1 / 3, width: 1 / 3, height: 1 / 3 },
      { left: 0, top: 2 / 3, width: 1 / 3, height: 1 / 3 },
      { left: 1 / 3, top: 2 / 3, width: 1 / 3, height: 1 / 3 },
      { left: 2 / 3, top: 2 / 3, width: 1 / 3, height: 1 / 3 },
    ],
    zone: { left: 1 / 3, top: 1 / 3, width: 1 / 3, height: 1 / 3, anchor: 'center', isBlock: true },
  },
};

/** Five colour grades. `cssFilter` runs on each photo as it is drawn;
 * `washes` are translucent gradients laid over the whole cover after the
 * panels, and `accent` / `scriptInk` colour the title and subtitle. */
export const COLOR_GRADES = {
  sunset: {
    name: 'Sunset',
    cssFilter: 'saturate(1.3) contrast(1.06) brightness(1.02)',
    accent: '#ffd166',
    scriptInk: '#ffe9a8',
    washes: [
      { mode: 'overlay', stops: [[0, 'rgba(255,120,60,0)'], [1, 'rgba(255,110,60,0.34)']] },
      { mode: 'soft-light', stops: [[0, 'rgba(190,40,120,0)'], [1, 'rgba(190,40,120,0.4)']] },
    ],
  },
  neon: {
    name: 'Neon',
    cssFilter: 'saturate(1.7) contrast(1.12)',
    accent: '#5ff2ff',
    scriptInk: '#ff7ad9',
    washes: [
      { mode: 'screen', stops: [[0, 'rgba(255,60,180,0.22)'], [0.55, 'rgba(255,60,180,0)'], [1, 'rgba(40,220,255,0.22)']] },
      { mode: 'overlay', stops: [[0, 'rgba(20,10,60,0.25)'], [1, 'rgba(20,10,60,0)']] },
    ],
  },
  'vice-gold': {
    name: 'Vice Gold',
    cssFilter: 'sepia(0.28) saturate(1.45) contrast(1.05)',
    accent: '#ffcf4d',
    scriptInk: '#fff3c4',
    washes: [
      { mode: 'soft-light', stops: [[0, 'rgba(255,190,60,0.1)'], [1, 'rgba(255,160,40,0.42)']] },
    ],
  },
  'teal-night': {
    name: 'Teal Night',
    cssFilter: 'saturate(1.1) contrast(1.08) brightness(0.92)',
    accent: '#7fe7d2',
    scriptInk: '#c8fff2',
    washes: [
      { mode: 'overlay', stops: [[0, 'rgba(20,120,140,0.3)'], [1, 'rgba(10,20,70,0.42)']] },
    ],
  },
  'mono-noir': {
    name: 'Mono Noir',
    cssFilter: 'grayscale(1) contrast(1.18) brightness(1.03)',
    accent: '#f2f2f2',
    scriptInk: '#ffffff',
    washes: [
      { mode: 'soft-light', stops: [[0, 'rgba(255,255,255,0.08)'], [1, 'rgba(0,0,0,0.3)']] },
    ],
  },
};

/** The three export sizes the editor offers. */
export const EXPORT_PRESETS = [
  { key: '1080x1080', name: 'Square · 1080 x 1080', w: 1080, h: 1080 },
  { key: '1080x1350', name: 'Portrait · 1080 x 1350', w: 1080, h: 1350 },
  { key: '1920x1080', name: 'Landscape · 1920 x 1080', w: 1920, h: 1080 },
];

/** A fresh cover: hero layout, sunset grade, sample-ready panels. */
export function freshState() {
  const panels = [];
  for (let i = 0; i < 8; i++) {
    panels.push({
      photo: i % 2,
      zoom: 1.12 + (i % 3) * 0.09,
      panX: i % 2 === 0 ? -0.04 : 0.04,
      panY: 0,
    });
  }
  return {
    layout: 'hero-trio',
    grade: 'sunset',
    title: 'NEON SHORE',
    subtitle: 'a vice coast story',
    titleFace: 'anton',
    titleSpot: 'bottom',
    titleSunset: true,
    showFrames: true,
    showGrain: true,
    showVignette: true,
    showBadge: true,
    stars: 5,
    panels,
  };
}

/** The photo cells of a layout, in panel order (title blocks skipped). */
export function photoCells(layoutKey) {
  const layout = COVER_LAYOUTS[layoutKey] ?? COVER_LAYOUTS['hero-trio'];
  return layout.cells.filter((c) => !c.isTitle);
}

let noiseTile = null;
/** A small tiled noise canvas, built once, for the film-grain finish. */
function noisePattern(ctx) {
  if (noiseTile) return noiseTile;
  const tile = document.createElement('canvas');
  tile.width = 128;
  tile.height = 128;
  const t = tile.getContext('2d');
  const img = t.createImageData(128, 128);
  for (let i = 0; i < img.data.length; i += 4) {
    const v = 100 + Math.floor(Math.random() * 56);
    img.data[i] = v;
    img.data[i + 1] = v;
    img.data[i + 2] = v;
    img.data[i + 3] = 255;
  }
  t.putImageData(img, 0, 0);
  noiseTile = ctx.createPattern(tile, 'repeat');
  return noiseTile;
}

/** Draws one photo into a box, cover-fit, with the panel's zoom and pan.
 * The visible band is anchored toward the top of the photo (faces sit in
 * the upper third), and the offsets are clamped so the photo always covers
 * the box — no empty corners, whatever the user drags. */
function placePhoto(ctx, img, box, panel, cssFilter) {
  const zoom = panel?.zoom ?? 1;
  const scale = Math.max(box.width / img.naturalWidth, box.height / img.naturalHeight) * zoom;
  const dw = img.naturalWidth * scale;
  const dh = img.naturalHeight * scale;
  const dx = clampNum(box.left + (box.width - dw) / 2 + (panel?.panX ?? 0) * box.width, box.left + box.width - dw, box.left);
  const dy = clampNum(box.top + (box.height - dh) * 0.18 + (panel?.panY ?? 0) * box.height, box.top + box.height - dh, box.top);
  ctx.save();
  ctx.beginPath();
  ctx.rect(box.left, box.top, box.width, box.height);
  ctx.clip();
  if (cssFilter) ctx.filter = cssFilter;
  ctx.drawImage(img, dx, dy, dw, dh);
  ctx.restore();
}

/** The grade's colour washes, laid over the whole cover. */
function washCover(ctx, grade, w, h) {
  for (const wash of grade.washes) {
    const grad = ctx.createLinearGradient(0, 0, w * 0.35, h);
    for (const [at, color] of wash.stops) grad.addColorStop(at, color);
    ctx.save();
    ctx.globalCompositeOperation = wash.mode;
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);
    ctx.restore();
  }
}

/** Shrinks a single line until it fits maxWidth, starting from startPx. */
function fitLine(ctx, text, family, startPx, maxPx) {
  let px = startPx;
  ctx.font = `${px}px ${family}`;
  while (px > 10 && ctx.measureText(text).width > maxPx) {
    px -= 2;
    ctx.font = `${px}px ${family}`;
  }
  return px;
}

/** Fits the title and subtitle into their zone and draws them with an
 * outline and a fill. The title opens at 0.60 of the zone height and the
 * scrim behind the words reaches 0.86, so the lettering still reads when
 * the cover is shown small. */
function paintLettering(ctx, state, zone, w, h) {
  const grade = COLOR_GRADES[state.grade] ?? COLOR_GRADES.sunset;
  const zx = zone.left * w;
  const zy = zone.top * h;
  const zw = zone.width * w;
  const zh = zone.height * h;
  const title = (state.title || '').trim().toUpperCase();
  const subtitle = (state.subtitle || '').trim();
  const anchorX = zone.anchor === 'left' ? zx + zw * 0.03 : zone.anchor === 'right' ? zx + zw * 0.97 : zx + zw / 2;

  if (zone.isBlock) {
    const block = ctx.createLinearGradient(zx, zy, zx + zw, zy + zh);
    block.addColorStop(0, '#ff7a3d');
    block.addColorStop(0.55, '#e83e8c');
    block.addColorStop(1, '#7b2ff7');
    ctx.fillStyle = block;
    ctx.fillRect(zx, zy, zw, zh);
  } else {
    const scrim = ctx.createLinearGradient(0, zy - zh * 0.35, 0, zy + zh);
    scrim.addColorStop(0, 'rgba(12,6,24,0)');
    scrim.addColorStop(1, 'rgba(12,6,24,0.86)');
    ctx.fillStyle = scrim;
    ctx.fillRect(0, zy - zh * 0.35, w, zh * 1.35);
  }

  ctx.textAlign = zone.anchor === 'left' ? 'left' : zone.anchor === 'right' ? 'right' : 'center';
  ctx.textBaseline = 'middle';
  ctx.lineJoin = 'round';

  if (title) {
    const face = state.titleFace === 'bebas' ? '"Bebas Neue"' : 'Anton';
    const px = fitLine(ctx, title, face, zh * (subtitle ? 0.6 : 0.72), zw * 0.96);
    const ty = zy + zh * (subtitle ? 0.36 : 0.5);
    ctx.lineWidth = Math.max(2, px * 0.07);
    ctx.strokeStyle = 'rgba(16,6,26,0.9)';
    ctx.strokeText(title, anchorX, ty);
    if (state.titleSunset) {
      const glow = ctx.createLinearGradient(anchorX - zw / 2, 0, anchorX + zw / 2, 0);
      glow.addColorStop(0, '#ffe259');
      glow.addColorStop(0.5, '#ff7e5f');
      glow.addColorStop(1, grade.accent);
      ctx.fillStyle = glow;
    } else {
      ctx.fillStyle = '#ffffff';
    }
    ctx.shadowColor = 'rgba(0,0,0,0.45)';
    ctx.shadowBlur = px * 0.12;
    ctx.shadowOffsetY = px * 0.03;
    ctx.fillText(title, anchorX, ty);
    ctx.shadowBlur = 0;
    ctx.shadowOffsetY = 0;
  }

  if (subtitle) {
    // The script line shrinks to fit, like the title, so a long subtitle
    // in the mosaic's centre cell never spills onto the neighbouring
    // photos — and it carries the same dark outline as the title, so it
    // stays readable over bright sand and sky.
    const px = fitLine(ctx, subtitle, 'Pacifico, cursive', Math.max(14, zh * 0.22), zw * 0.96);
    const sy = zy + zh * (title ? 0.74 : 0.5);
    ctx.lineWidth = Math.max(2, px * 0.08);
    ctx.strokeStyle = 'rgba(16,6,26,0.85)';
    ctx.strokeText(subtitle, anchorX, sy);
    ctx.fillStyle = grade.scriptInk;
    ctx.shadowColor = 'rgba(0,0,0,0.5)';
    ctx.shadowBlur = px * 0.25;
    ctx.fillText(subtitle, anchorX, sy);
    ctx.shadowBlur = 0;
  }
}

/** A small badge pill and a star meter in the cover's top corners. */
function paintCorners(ctx, state, w, h) {
  const pad = Math.round(Math.min(w, h) * 0.022);
  const bh = Math.round(Math.min(w, h) * 0.045);
  if (state.showBadge) {
    ctx.font = `${Math.round(bh * 0.52)}px "Bebas Neue", sans-serif`;
    try { ctx.letterSpacing = '3px'; } catch { /* older canvas: no letter-spacing */ }
    const label = 'VICE COAST';
    const tw = ctx.measureText(label).width;
    ctx.fillStyle = 'rgba(12,6,24,0.72)';
    traceRoundRect(ctx, pad, pad, tw + pad * 1.6, bh, bh / 2);
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText(label, pad * 1.8, pad + bh / 2 + 1);
    try { ctx.letterSpacing = '0px'; } catch { /* reset */ }
  }
  if (state.stars > 0) {
    const px = Math.round(Math.min(w, h) * 0.032);
    ctx.font = `${px}px sans-serif`;
    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#ffd166';
    ctx.shadowColor = 'rgba(0,0,0,0.6)';
    ctx.shadowBlur = px * 0.2;
    ctx.fillText('★'.repeat(state.stars) + '☆'.repeat(Math.max(0, 5 - state.stars)), w - pad, pad + bh / 2);
    ctx.shadowBlur = 0;
  }
}

function traceRoundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

/**
 * Paints the whole cover for `state` onto `canvas` at the canvas's own
 * size. `images` is the library of loaded photos; a panel's `photo` is
 * its index. Returns the list of photo cell rects (pixels) for
 * hit-testing in the editor.
 */
export function paintCover(canvas, state, images) {
  const ctx = canvas.getContext('2d');
  const w = canvas.width;
  const h = canvas.height;
  const layout = COVER_LAYOUTS[state.layout] ?? COVER_LAYOUTS['hero-trio'];
  const grade = COLOR_GRADES[state.grade] ?? COLOR_GRADES.sunset;
  const gap = state.showFrames ? Math.max(2, Math.round(Math.min(w, h) * 0.008)) : 0;

  ctx.clearRect(0, 0, w, h);
  ctx.fillStyle = state.showFrames ? '#fdfbf7' : '#14081f';
  ctx.fillRect(0, 0, w, h);

  if (layout.backdrop) {
    const sky = ctx.createLinearGradient(0, 0, w, h);
    sky.addColorStop(0, '#ff9a3d');
    sky.addColorStop(0.5, '#ff4e7a');
    sky.addColorStop(1, '#6a2bff');
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, w, h);
    ctx.save();
    ctx.globalCompositeOperation = 'overlay';
    ctx.fillStyle = 'rgba(255,220,120,0.25)';
    ctx.fillRect(0, 0, w, h);
    ctx.restore();
  }

  const hitBoxes = [];
  let cellNo = 0;
  for (const cell of layout.cells) {
    if (cell.isTitle) continue;
    const box = {
      left: cell.left * w + gap,
      top: cell.top * h + gap,
      width: cell.width * w - gap * 2,
      height: cell.height * h - gap * 2,
    };
    const panel = state.panels[cellNo] ?? { photo: 0, zoom: 1, panX: 0, panY: 0 };
    const img = images[panel.photo] ?? images[0] ?? null;
    if (cell.tilt) {
      // A tossed snapshot: white paper backing with a soft shadow first,
      // then the photo rotated along with it.
      const cx = box.left + box.width / 2;
      const cy = box.top + box.height / 2;
      const rad = (cell.tilt * Math.PI) / 180;
      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(rad);
      ctx.fillStyle = '#fdfbf7';
      ctx.shadowColor = 'rgba(0,0,0,0.45)';
      ctx.shadowBlur = Math.round(Math.min(w, h) * 0.03);
      ctx.shadowOffsetY = Math.round(Math.min(w, h) * 0.012);
      ctx.fillRect(-box.width / 2 - gap * 2, -box.height / 2 - gap * 2, box.width + gap * 4, box.height + gap * 4);
      ctx.restore();
      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(rad);
      ctx.beginPath();
      ctx.rect(-box.width / 2, -box.height / 2, box.width, box.height);
      ctx.clip();
      if (img) {
        placePhoto(ctx, img, { left: -box.width / 2, top: -box.height / 2, width: box.width, height: box.height }, panel, grade.cssFilter);
      }
      ctx.restore();
      hitBoxes.push({ ...box, tilt: cell.tilt, panel: cellNo });
    } else if (img) {
      placePhoto(ctx, img, box, panel, grade.cssFilter);
      hitBoxes.push({ ...box, panel: cellNo });
    } else {
      ctx.fillStyle = '#241533';
      ctx.fillRect(box.left, box.top, box.width, box.height);
      hitBoxes.push({ ...box, panel: cellNo });
    }
    cellNo += 1;
  }

  if (layout.backdrop) washCover(ctx, { ...grade, washes: grade.washes.slice(0, 1) }, w, h);
  else washCover(ctx, grade, w, h);

  const zone = { ...layout.zone };
  if (!zone.isBlock) {
    if (state.titleSpot === 'top') zone.top = 0.03;
    if (state.titleSpot === 'center') zone.top = 0.4;
  }
  paintLettering(ctx, state, zone, w, h);
  paintCorners(ctx, state, w, h);

  if (state.showVignette) {
    const shade = ctx.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.42, w / 2, h / 2, Math.max(w, h) * 0.75);
    shade.addColorStop(0, 'rgba(0,0,0,0)');
    shade.addColorStop(1, 'rgba(0,0,0,0.38)');
    ctx.fillStyle = shade;
    ctx.fillRect(0, 0, w, h);
  }
  if (state.showGrain) {
    ctx.save();
    ctx.globalAlpha = 0.07;
    ctx.globalCompositeOperation = 'overlay';
    ctx.fillStyle = noisePattern(ctx);
    ctx.fillRect(0, 0, w, h);
    ctx.restore();
  }
  return hitBoxes;
}

/** Renders `state` at an export size and returns the offscreen canvas. */
export function renderToCanvas(state, images, width, height) {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  paintCover(canvas, state, images);
  return canvas;
}
