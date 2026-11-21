// Palm Sunset Cover Studio — the cover painter.
//
// This module turns a plain state object into a finished poster on any 2D
// canvas: seven multi-panel compositions, six colour grades, poster
// lettering with a sunset gradient, plus grain and a vignette. The live
// preview and the exported PNG both go through this one painter, so the
// preview is exactly what gets shared.
//
// Everything drawn here is original: the lettering uses Anton, Pacifico and
// Bebas Neue (SIL Open Font License, vendored under app/fonts/), and no
// Rockstar artwork, logo or typeface appears anywhere.
//
// Two of the compositions are worth a note. NEON GRID slots the title
// into the middle row of a photo grid, and the VHS grade is a retro
// treatment — scanlines, a red/cyan channel split and tracking bands —
// layered over the finished cover after the grain.
//
// Lettering legibility: the title opens at 0.60 of its zone height, the
// subtitle carries the same dark outline as the title, and the scrim behind
// the words reaches 0.86 — so a cover still reads when it is shown about
// 300 px wide.

const clampNum = (v, lo, hi) => (v < lo ? lo : v > hi ? hi : v);

/** Seven compositions. A cell is a fraction of the cover — left, top, width,
 * height, an optional tilt in degrees — and `isTitle` marks the title
 * block of a mosaic. `zone` is where the lettering lives, `anchor` how
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
  'neon-grid': {
    name: 'Neon Grid',
    blurb: 'A photo grid with the title slotted into the middle row',
    cells: [
      { left: 0, top: 0, width: 1 / 3, height: 0.34 },
      { left: 1 / 3, top: 0, width: 1 / 3, height: 0.34 },
      { left: 2 / 3, top: 0, width: 1 / 3, height: 0.34 },
      { isTitle: true },
      { left: 2 / 3, top: 0.34, width: 1 / 3, height: 0.32 },
      { left: 0, top: 0.66, width: 1 / 3, height: 0.34 },
      { left: 1 / 3, top: 0.66, width: 1 / 3, height: 0.34 },
      { left: 2 / 3, top: 0.66, width: 1 / 3, height: 0.34 },
    ],
    // The title block takes the left two-thirds of the middle row, so the
    // words sit inside the grid instead of floating over the photos.
    zone: { left: 0, top: 0.34, width: 2 / 3, height: 0.32, anchor: 'left', isBlock: true },
  },
};

/** Six colour grades. `cssFilter` runs on each photo as it is drawn;
 * `washes` are translucent gradients laid over the whole cover after the
 * panels, and `accent` / `scriptInk` colour the title and subtitle.
 * A grade with `fx: 'vhs'` gets the retro treatment on top — scanlines,
 * a channel split and tracking bands, applied in paintCover after the
 * grain, so the effect covers the lettering as well as the photos. */
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
  vhs: {
    name: 'VHS',
    cssFilter: 'saturate(1.25) contrast(1.08) brightness(1.06) sepia(0.14)',
    accent: '#ff5d8f',
    scriptInk: '#dff3ff',
    fx: 'vhs',
    washes: [
      { mode: 'soft-light', stops: [[0, 'rgba(90,140,255,0.12)'], [1, 'rgba(255,45,85,0.16)']] },
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
    titleStyle: 'gradient',
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

/** Draws one line with a dark outline and an optional fill. `fill` may be
 * a colour, a gradient, or null for outline-only lettering — the stroke
 * is drawn thicker when there is no fill, so bare outlines still read. */
function drawOutlinedText(ctx, text, x, y, px, fill) {
  ctx.lineWidth = Math.max(2, px * (fill ? 0.07 : 0.12));
  ctx.strokeStyle = 'rgba(16,6,26,0.9)';
  ctx.strokeText(text, x, y);
  if (!fill) return;
  ctx.fillStyle = fill;
  ctx.shadowColor = 'rgba(0,0,0,0.45)';
  ctx.shadowBlur = px * 0.12;
  ctx.shadowOffsetY = px * 0.03;
  ctx.fillText(text, x, y);
  ctx.shadowBlur = 0;
  ctx.shadowOffsetY = 0;
}

/** Fits the title and subtitle into their zone and draws them with an
 * outline and a fill. The title opens at 0.60 of the zone height and the
 * scrim behind the words reaches 0.86, so the lettering still reads when
 * the cover is shown small. The title fill follows `titleStyle`:
 * a sunset gradient, solid white, or bare outline. */
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
    // The fill is picked per style: a sunset gradient by default, solid
    // white when the gradient is off, and nothing at all for outline
    // lettering — the thicker stroke carries those words on its own.
    let fill = null;
    if (state.titleStyle === 'outline') {
      fill = null;
    } else if (state.titleStyle === 'solid' || !state.titleSunset) {
      fill = '#ffffff';
    } else {
      const glow = ctx.createLinearGradient(anchorX - zw / 2, 0, anchorX + zw / 2, 0);
      glow.addColorStop(0, '#ffe259');
      glow.addColorStop(0.5, '#ff7e5f');
      glow.addColorStop(1, grade.accent);
      fill = glow;
    }
    drawOutlinedText(ctx, title, anchorX, ty, px, fill);
  }

  if (subtitle) {
    // The script line shrinks to fit, like the title, so a long subtitle
    // in the mosaic's centre cell never spills onto the neighbouring
    // photos — and it carries the same dark outline as the title, so it
    // stays readable over bright sand and sky.
    const px = fitLine(ctx, subtitle, 'Pacifico, cursive', Math.max(14, zh * 0.22), zw * 0.96);
    const sy = zy + zh * (title ? 0.74 : 0.5);
    drawOutlinedText(ctx, subtitle, anchorX, sy, px, grade.scriptInk);
  }
}

/** The star meter as text: filled stars for the rating, hollow ones up
 * to five, so a 3-star cover reads ★★★☆☆. */
function starMeter(stars) {
  const filled = Math.max(0, Math.min(5, stars));
  return '★'.repeat(filled) + '☆'.repeat(5 - filled);
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
    ctx.fillText(starMeter(state.stars), w - pad, pad + bh / 2);
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
 * Paints every layer of the cover — background, photo cells, washes,
 * lettering, corners, vignette, grain — onto `ctx` at `w` by `h`.
 * `images` is the library of loaded photos; a panel's `photo` is its
 * index. Returns the list of photo cell rects (pixels) for hit-testing
 * in the editor. This is the shared pipeline: paintCover calls it
 * directly for ordinary grades, and onto an offscreen canvas first when
 * a grade needs a whole-cover effect on top.
 */
function paintLayers(ctx, state, images, w, h) {
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
    // The VHS grade gets heavier grain: tape noise is part of the look.
    ctx.globalAlpha = grade.fx === 'vhs' ? 0.12 : 0.07;
    ctx.globalCompositeOperation = 'overlay';
    ctx.fillStyle = noisePattern(ctx);
    ctx.fillRect(0, 0, w, h);
    ctx.restore();
  }
  return hitBoxes;
}

/** A copy of `source` tinted to one colour channel: drawing it with
 * 'multiply' keeps that channel and dims the other two, so the copy
 * reads as a red or cyan ghost of the original. */
function tintCopy(source, color) {
  const copy = document.createElement('canvas');
  copy.width = source.width;
  copy.height = source.height;
  const t = copy.getContext('2d');
  t.drawImage(source, 0, 0);
  t.globalCompositeOperation = 'multiply';
  t.fillStyle = color;
  t.fillRect(0, 0, copy.width, copy.height);
  return copy;
}

/** The VHS channel split: the finished cover drawn twice more, a couple
 * of pixels apart, once red and once cyan, screened over the base image.
 * The offset grows with the cover so the fringe stays visible at export
 * sizes, and the ghosts are dimmed so the title stays readable. */
function splitChannels(ctx, source, w, h) {
  const shift = Math.max(2, Math.round(w * 0.002));
  const red = tintCopy(source, '#ff2d55');
  const cyan = tintCopy(source, '#00e5ff');
  ctx.save();
  ctx.globalCompositeOperation = 'screen';
  ctx.globalAlpha = 0.5;
  ctx.drawImage(red, -shift, 0);
  ctx.drawImage(cyan, shift, 0);
  ctx.restore();
}

/** The VHS scanlines: a dark hairline every third row, over the whole
 * cover. Thin enough to read as tape, not as a grid over the photos. */
function paintScanlines(ctx, w, h) {
  ctx.save();
  ctx.fillStyle = 'rgba(0,0,0,0.16)';
  for (let y = 0; y < h; y += 3) ctx.fillRect(0, y, w, 1);
  ctx.restore();
}

/** The VHS tracking wobble: a pale band, a dark band and a faint second
 * pale band, placed at random heights each paint. On the live preview
 * they drift from frame to frame like a tape losing sync; on an export
 * they freeze wherever they landed for that one render. */
function paintTrackingBands(ctx, w, h) {
  // With reduced motion requested, the band sits still instead of
  // jumping to a new height on every paint.
  const still = typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
  const bandY = still ? Math.floor(h * 0.3) : Math.floor(Math.random() * h);
  const thin = Math.max(1, Math.round(h * 0.002));
  const thick = Math.max(2, Math.round(h * 0.004));
  ctx.save();
  ctx.globalAlpha = 0.1;
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, bandY, w, thick);
  ctx.globalAlpha = 0.08;
  ctx.fillRect(0, (bandY + Math.round(h * 0.35)) % h, w, thin);
  ctx.globalAlpha = 0.14;
  ctx.fillStyle = '#000000';
  ctx.fillRect(0, (bandY + Math.round(h * 0.62)) % h, w, thin + 1);
  ctx.restore();
}

/** The camcorder readout VHS tapes used to burn into the frame: a fixed
 * PLAY marker and timecode in a monospace face, dimmed so it reads as
 * part of the tape rather than as a caption. The text is fixed, so an
 * export is deterministic — the same cover always carries the same
 * readout — and it sits top centre, clear of the badge and the stars. */
function paintVhsOsd(ctx, w, h) {
  const px = Math.max(12, Math.round(Math.min(w, h) * 0.018));
  ctx.save();
  ctx.font = `${px}px "Courier New", monospace`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  ctx.fillStyle = 'rgba(255,255,255,0.85)';
  ctx.shadowColor = 'rgba(0,0,0,0.6)';
  ctx.shadowBlur = px * 0.2;
  ctx.fillText('▶ PLAY  SP 0:00:00', w / 2, Math.round(h * 0.02));
  ctx.restore();
}

/**
 * Paints the whole cover for `state` onto `canvas` at the canvas's own
 * size. For an ordinary grade the layers go straight onto the canvas;
 * for a grade with a whole-cover effect (VHS) they are painted onto an
 * offscreen canvas first, then the effect is composited on top, so the
 * scanlines and channel split cover the lettering as well as the photos.
 * Returns the list of photo cell rects (pixels) for hit-testing in the
 * editor.
 */
export function paintCover(canvas, state, images) {
  const w = canvas.width;
  const h = canvas.height;
  const grade = COLOR_GRADES[state.grade] ?? COLOR_GRADES.sunset;
  if (grade.fx !== 'vhs') {
    return paintLayers(canvas.getContext('2d'), state, images, w, h);
  }
  const off = document.createElement('canvas');
  off.width = w;
  off.height = h;
  const hitBoxes = paintLayers(off.getContext('2d'), state, images, w, h);
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, w, h);
  ctx.drawImage(off, 0, 0);
  splitChannels(ctx, off, w, h);
  paintScanlines(ctx, w, h);
  paintTrackingBands(ctx, w, h);
  paintVhsOsd(ctx, w, h);
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
