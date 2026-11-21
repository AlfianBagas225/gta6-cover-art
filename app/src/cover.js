/**
 * cover.js — the cover rendering engine of Palm Sunset Cover Studio.
 *
 * Everything the app draws lives here: the seven panel layouts, the six
 * colour grades, the title block, and the PNG export. The engine is pure
 * canvas 2D and has no dependency on the DOM beyond the canvas it is handed,
 * so the same code draws the live preview, the exported PNG, and every
 * screenshot scene.
 *
 * A cover is drawn in three passes:
 *   1. panels — each photo clipped to its panel polygon, with its own crop
 *      (pan and zoom from the editor's drag and wheel);
 *   2. title — a scrim, the big Anton caption and the Pacifico subtitle;
 *   3. grade — a filter plus overlay passes (gradients, grain, vignette,
 *      and the VHS scanlines, channel split, tracking bands and OSD).
 *
 * Coordinates inside a layout are normalised (0..1 of the cover), so one
 * layout definition serves every export size.
 */

/** Title size factor: the caption's base size is 0.60 of the cover width. */
export const TITLE_FACTOR = 0.6;

/** Title scrim: the darkest stop of the title gradient, alpha 0.86. */
export const SCRIM_ALPHA = 0.86;

/** A subtitle never renders smaller than 14 px, even on tiny covers. */
export const SUBTITLE_MIN_PX = 14;

/** Export sizes, in pixels: square, portrait and landscape posts. */
export const EXPORT_SIZES = {
  square: { width: 1080, height: 1080, label: "Square 1080 × 1080" },
  portrait: { width: 1080, height: 1350, label: "Portrait 1080 × 1350" },
  landscape: { width: 1920, height: 1080, label: "Landscape 1920 × 1080" },
};

/**
 * A panel is a polygon in normalised cover coordinates plus the photo slot
 * it shows. Rectangular panels list four corners; the diagonal layout uses
 * triangles, which the clip path handles the same way.
 */
export const LAYOUTS = [
  {
    id: "classic",
    name: "Classic",
    blurb: "One hero photo, full bleed, title over a dusk scrim.",
    panels: [{ points: [[0, 0], [1, 0], [1, 1], [0, 1]] }],
    title: { x: 0.05, y: 0.68, width: 0.9, align: "left" },
  },
  {
    id: "duo",
    name: "Duo",
    blurb: "A wide hero over a second moment, split by a clean gap.",
    panels: [
      { points: [[0, 0], [1, 0], [1, 0.58], [0, 0.58]] },
      { points: [[0, 0.62], [1, 0.62], [1, 1], [0, 1]] },
    ],
    title: { x: 0.05, y: 0.66, width: 0.9, align: "left" },
  },
  {
    id: "trio",
    name: "Trio",
    blurb: "A tall hero on the left, two stacked frames on the right.",
    panels: [
      { points: [[0, 0], [0.62, 0], [0.62, 1], [0, 1]] },
      { points: [[0.66, 0], [1, 0], [1, 0.48], [0.66, 0.48]] },
      { points: [[0.66, 0.52], [1, 0.52], [1, 1], [0.66, 1]] },
    ],
    title: { x: 0.05, y: 0.7, width: 0.56, align: "left" },
  },
  {
    id: "grid",
    name: "Grid",
    blurb: "Four equal frames, the poster cut into quarters.",
    panels: [
      { points: [[0, 0], [0.48, 0], [0.48, 0.48], [0, 0.48]] },
      { points: [[0.52, 0], [1, 0], [1, 0.48], [0.52, 0.48]] },
      { points: [[0, 0.52], [0.48, 0.52], [0.48, 1], [0, 1]] },
      { points: [[0.52, 0.52], [1, 0.52], [1, 1], [0.52, 1]] },
    ],
    title: { x: 0.05, y: 0.68, width: 0.9, align: "left" },
  },
  {
    id: "split",
    name: "Split",
    blurb: "Two tall halves facing each other across a seam.",
    panels: [
      { points: [[0, 0], [0.48, 0], [0.48, 1], [0, 1]] },
      { points: [[0.52, 0], [1, 0], [1, 1], [0.52, 1]] },
    ],
    title: { x: 0.05, y: 0.7, width: 0.9, align: "left" },
  },
  {
    id: "diagonal",
    name: "Diagonal",
    blurb: "Two frames cut on a diagonal, like a torn poster.",
    panels: [
      { points: [[0, 0], [1, 0], [0, 1]] },
      { points: [[1, 0], [1, 1], [0, 1]] },
    ],
    title: { x: 0.05, y: 0.68, width: 0.9, align: "left" },
  },
  {
    id: "neon-grid",
    name: "Neon Grid",
    blurb: "Nine frames on a neon grid, every moment lit at once.",
    panels: [
      { points: [[0, 0], [0.32, 0], [0.32, 0.32], [0, 0.32]] },
      { points: [[0.34, 0], [0.66, 0], [0.66, 0.32], [0.34, 0.32]] },
      { points: [[0.68, 0], [1, 0], [1, 0.32], [0.68, 0.32]] },
      { points: [[0, 0.34], [0.32, 0.34], [0.32, 0.66], [0, 0.66]] },
      { points: [[0.34, 0.34], [0.66, 0.34], [0.66, 0.66], [0.34, 0.66]] },
      { points: [[0.68, 0.34], [1, 0.34], [1, 0.66], [0.68, 0.66]] },
      { points: [[0, 0.68], [0.32, 0.68], [0.32, 1], [0, 1]] },
      { points: [[0.34, 0.68], [0.66, 0.68], [0.66, 1], [0.34, 1]] },
      { points: [[0.68, 0.68], [1, 0.68], [1, 1], [0.68, 1]] },
    ],
    title: { x: 0.04, y: 0.72, width: 0.92, align: "left", neon: true },
  },
];

/** Look a layout up by id, falling back to Classic when unknown. */
export function layoutById(id) {
  return LAYOUTS.find((l) => l.id === id) ?? LAYOUTS[0];
}

/**
 * The six grades. `filter` is the canvas filter applied when the finished
 * art is copied to the screen; `overlays` names the extra passes the grade
 * draws on top (gradients, grain, scanlines and the rest).
 */
export const GRADES = [
  {
    id: "sunset",
    name: "Sunset",
    blurb: "Warm golden hour: amber highlights, rose shadows.",
    filter: "saturate(1.28) contrast(1.08) sepia(0.16)",
    overlays: ["warmGradient", "grain", "vignette"],
  },
  {
    id: "vice",
    name: "Vice",
    blurb: "Pink and teal neon: the Vice City night grade.",
    filter: "saturate(1.34) contrast(1.1)",
    overlays: ["viceGradient", "grain", "vignette"],
  },
  {
    id: "noir",
    name: "Noir",
    blurb: "Black and white, hard contrast, deep shadows.",
    filter: "grayscale(1) contrast(1.28) brightness(0.94)",
    overlays: ["grain", "strongVignette"],
  },
  {
    id: "pastel",
    name: "Pastel",
    blurb: "Soft and washed: pale pink mornings, low contrast.",
    filter: "saturate(0.68) brightness(1.09) contrast(0.92)",
    overlays: ["pastelWash", "vignette"],
  },
  {
    id: "mono",
    name: "Mono",
    blurb: "High-contrast monochrome, poster-ink blacks.",
    filter: "grayscale(1) contrast(1.45) brightness(1.02)",
    overlays: ["grain", "vignette"],
  },
  {
    id: "vhs",
    name: "VHS",
    blurb: "A taped-over rental: scanlines, split channels, PLAY on screen.",
    filter: "saturate(1.42) contrast(1.14)",
    overlays: ["channelSplit", "scanlines", "trackingBands", "vhsOsd", "grain", "vignette"],
  },
];

/** Look a grade up by id, falling back to Sunset when unknown. */
export function gradeById(id) {
  return GRADES.find((g) => g.id === id) ?? GRADES[0];
}

/** The three title fill styles the editor offers. */
export const TITLE_FILLS = [
  { id: "solid", name: "Solid" },
  { id: "gradient", name: "Sunset gradient" },
  { id: "outline", name: "Outline" },
];

/** Deterministic pseudo-random numbers, so a seed always draws the same grain. */
export function mulberrySeed(seed) {
  let a = seed >>> 0;
  return function nextRandom() {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** The bounding box of a panel's normalised polygon, in pixels. */
function panelPixelRect(panel, width, height) {
  const xs = panel.points.map((p) => p[0] * width);
  const ys = panel.points.map((p) => p[1] * height);
  const x = Math.min(...xs);
  const y = Math.min(...ys);
  return { x, y, width: Math.max(...xs) - x, height: Math.max(...ys) - y };
}

/** Trace a panel's polygon on a context, in pixels. */
function tracePanelPath(ctx, panel, width, height) {
  ctx.beginPath();
  panel.points.forEach(([nx, ny], i) => {
    const px = nx * width;
    const py = ny * height;
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  });
  ctx.closePath();
}

/** Ray-casting point-in-polygon test, in normalised cover coordinates. */
export function pointInPanel(nx, ny, panel) {
  const pts = panel.points;
  let inside = false;
  for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
    const [xi, yi] = pts[i];
    const [xj, yj] = pts[j];
    const crosses = yi > ny !== yj > ny && nx < ((xj - xi) * (ny - yi)) / (yj - yi) + xi;
    if (crosses) inside = !inside;
  }
  return inside;
}

/** Which panel (if any) holds a point given in cover pixels. */
export function panelAtPoint(px, py, layout, width, height) {
  for (let i = layout.panels.length - 1; i >= 0; i--) {
    if (pointInPanel(px / width, py / height, layout.panels[i])) return i;
  }
  return -1;
}

/**
 * Draw one photo into one panel: cover-fit the image into the panel's box,
 * then pan and zoom it by the panel's crop state. A missing image leaves a
 * deep-navy placeholder with a diagonal sheen instead of a hole.
 */
function drawPhotoIntoPanel(ctx, image, panel, crop, width, height) {
  const rect = panelPixelRect(panel, width, height);
  ctx.save();
  tracePanelPath(ctx, panel, width, height);
  ctx.clip();
  if (image && image.naturalWidth > 0) {
    const fit = Math.max(rect.width / image.naturalWidth, rect.height / image.naturalHeight);
    const scale = fit * (crop?.scale ?? 1);
    const dw = image.naturalWidth * scale;
    const dh = image.naturalHeight * scale;
    const dx = rect.x + (rect.width - dw) / 2 + (crop?.ox ?? 0);
    const dy = rect.y + (rect.height - dh) / 2 + (crop?.oy ?? 0);
    ctx.drawImage(image, dx, dy, dw, dh);
  } else {
    const sheen = ctx.createLinearGradient(rect.x, rect.y, rect.x + rect.width, rect.y + rect.height);
    sheen.addColorStop(0, "#1b2340");
    sheen.addColorStop(0.55, "#0d1024");
    sheen.addColorStop(1, "#241430");
    ctx.fillStyle = sheen;
    ctx.fillRect(rect.x, rect.y, rect.width, rect.height);
  }
  ctx.restore();
}

/** A thin bright frame around a panel, with a neon glow on the Neon Grid. */
function strokePanelFrame(ctx, panel, width, height, neon) {
  ctx.save();
  tracePanelPath(ctx, panel, width, height);
  if (neon) {
    ctx.shadowColor = "#22e6ff";
    ctx.shadowBlur = Math.max(6, width * 0.008);
    ctx.strokeStyle = "#8ff4ff";
    ctx.lineWidth = Math.max(2, width * 0.003);
  } else {
    ctx.shadowBlur = 0;
    ctx.strokeStyle = "rgba(255,255,255,0.92)";
    ctx.lineWidth = Math.max(2, width * 0.0025);
  }
  ctx.stroke();
  ctx.restore();
}

/** Shrink a font size until the text fits a maximum width. */
function fitFontSize(ctx, text, maxWidth, startSize, family, weight) {
  let size = startSize;
  ctx.font = `${weight} ${size}px ${family}`;
  while (size > 12 && ctx.measureText(text).width > maxWidth) {
    size -= 2;
    ctx.font = `${weight} ${size}px ${family}`;
  }
  return size;
}

/**
 * The title block: a dusk scrim rising from the bottom, the script subtitle
 * with its dark outline, and the big Anton caption in the chosen fill style.
 */
function drawTitleBlock(ctx, state, layout, width, height) {
  const zone = layout.title;
  const zoneX = zone.x * width;
  const zoneY = zone.y * height;
  const zoneW = zone.width * width;
  const zoneH = height - zoneY;

  const scrim = ctx.createLinearGradient(0, zoneY - zoneH * 0.45, 0, height);
  scrim.addColorStop(0, "rgba(5,4,12,0)");
  scrim.addColorStop(0.55, `rgba(5,4,12,${(SCRIM_ALPHA * 0.55).toFixed(2)})`);
  scrim.addColorStop(1, `rgba(5,4,12,${SCRIM_ALPHA.toFixed(2)})`);
  ctx.fillStyle = scrim;
  ctx.fillRect(0, zoneY - zoneH * 0.45, width, height - (zoneY - zoneH * 0.45));

  if (zone.neon) {
    ctx.save();
    ctx.shadowColor = "#ff2ea6";
    ctx.shadowBlur = Math.max(8, width * 0.01);
    ctx.strokeStyle = "rgba(255,46,166,0.85)";
    ctx.lineWidth = Math.max(2, width * 0.002);
    ctx.beginPath();
    ctx.moveTo(zoneX, zoneY + 2);
    ctx.lineTo(zoneX + zoneW, zoneY + 2);
    ctx.stroke();
    ctx.restore();
  }

  const title = (state.title || "PALM SUNSET").toUpperCase();
  const subtitle = state.subtitle || "";
  const pad = Math.max(10, width * 0.012);
  let cursorY = zoneY + zoneH * 0.34;

  if (subtitle) {
    const subSize = Math.max(
      SUBTITLE_MIN_PX,
      fitFontSize(ctx, subtitle, zoneW, Math.max(20, width * 0.045), "Pacifico, cursive", "400"),
    );
    ctx.font = `${subSize}px Pacifico, cursive`;
    ctx.textAlign = zone.align === "center" ? "center" : "left";
    ctx.textBaseline = "alphabetic";
    const subX = zone.align === "center" ? zoneX + zoneW / 2 : zoneX + pad;
    ctx.lineWidth = Math.max(3, subSize * 0.16);
    ctx.strokeStyle = "rgba(8,6,16,0.85)";
    ctx.strokeText(subtitle, subX, cursorY);
    ctx.fillStyle = "#ffe9f6";
    ctx.fillText(subtitle, subX, cursorY);
    cursorY += subSize * 1.15;
  }

  const titleStart = (width * TITLE_FACTOR) / Math.max(3, title.length * 0.55);
  const titleSize = fitFontSize(ctx, title, zoneW - pad, titleStart, "Anton, 'Arial Black', sans-serif", "900");
  ctx.font = `900 ${titleSize}px Anton, 'Arial Black', sans-serif`;
  try {
    ctx.letterSpacing = `${Math.max(1, titleSize * 0.02).toFixed(0)}px`;
  } catch {
    /* letterSpacing is a progressive enhancement; ignore when absent. */
  }
  ctx.textAlign = zone.align === "center" ? "center" : "left";
  ctx.textBaseline = "alphabetic";
  const titleX = zone.align === "center" ? zoneX + zoneW / 2 : zoneX + pad;
  const titleY = Math.min(cursorY + titleSize * 0.9, height - pad * 0.5);

  if (state.titleFill === "gradient") {
    const fill = ctx.createLinearGradient(titleX, titleY - titleSize, titleX, titleY);
    fill.addColorStop(0, "#fff7d6");
    fill.addColorStop(0.45, "#ffb347");
    fill.addColorStop(0.75, "#ff5e8a");
    fill.addColorStop(1, "#b967ff");
    ctx.lineWidth = Math.max(3, titleSize * 0.07);
    ctx.strokeStyle = "rgba(10,6,18,0.9)";
    ctx.strokeText(title, titleX, titleY);
    ctx.fillStyle = fill;
    ctx.fillText(title, titleX, titleY);
  } else if (state.titleFill === "outline") {
    ctx.lineWidth = Math.max(2, titleSize * 0.045);
    ctx.strokeStyle = "#ffffff";
    ctx.strokeText(title, titleX, titleY);
    ctx.lineWidth = Math.max(5, titleSize * 0.09);
    ctx.strokeStyle = "rgba(10,6,18,0.55)";
    ctx.strokeText(title, titleX, titleY);
    ctx.lineWidth = Math.max(2, titleSize * 0.045);
    ctx.strokeStyle = "#ffffff";
    ctx.strokeText(title, titleX, titleY);
  } else {
    ctx.shadowColor = "rgba(0,0,0,0.55)";
    ctx.shadowBlur = Math.max(6, titleSize * 0.12);
    ctx.shadowOffsetY = Math.max(2, titleSize * 0.04);
    ctx.fillStyle = "#ffffff";
    ctx.fillText(title, titleX, titleY);
    ctx.shadowBlur = 0;
    ctx.shadowOffsetY = 0;
  }
  try {
    ctx.letterSpacing = "0px";
  } catch {
    /* reset the tracking for anything drawn after the title. */
  }
}

/** A reusable grain tile, seeded so every render of a seed looks the same. */
let grainTileCache = null;
function grainTile(seed) {
  if (grainTileCache && grainTileCache.seed === seed) return grainTileCache.tile;
  const tile = document.createElement("canvas");
  tile.width = 140;
  tile.height = 140;
  const tctx = tile.getContext("2d");
  const image = tctx.createImageData(140, 140);
  const rand = mulberrySeed(seed);
  for (let i = 0; i < image.data.length; i += 4) {
    const v = Math.floor(rand() * 255);
    image.data[i] = v;
    image.data[i + 1] = v;
    image.data[i + 2] = v;
    image.data[i + 3] = 255;
  }
  tctx.putImageData(image, 0, 0);
  grainTileCache = { seed, tile };
  return tile;
}

/** Soft dark corners, the oldest poster trick there is. */
function drawVignette(ctx, width, height, strength) {
  const radius = Math.hypot(width, height) / 2;
  const glow = ctx.createRadialGradient(
    width / 2, height / 2, radius * 0.45,
    width / 2, height / 2, radius,
  );
  glow.addColorStop(0, "rgba(0,0,0,0)");
  glow.addColorStop(1, `rgba(0,0,0,${strength})`);
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, width, height);
}

/** The overlay passes, one function per grade effect. */
const OVERLAY_PASSES = {
  warmGradient(ctx, width, height) {
    const warm = ctx.createLinearGradient(0, 0, width, height);
    warm.addColorStop(0, "rgba(255,150,50,0.16)");
    warm.addColorStop(0.55, "rgba(255,90,90,0.10)");
    warm.addColorStop(1, "rgba(180,40,140,0.22)");
    ctx.globalCompositeOperation = "soft-light";
    ctx.fillStyle = warm;
    ctx.fillRect(0, 0, width, height);
    ctx.globalCompositeOperation = "source-over";
  },
  viceGradient(ctx, width, height) {
    const pink = ctx.createLinearGradient(0, 0, width, height);
    pink.addColorStop(0, "rgba(255,46,166,0.30)");
    pink.addColorStop(1, "rgba(255,46,166,0)");
    ctx.globalCompositeOperation = "overlay";
    ctx.fillStyle = pink;
    ctx.fillRect(0, 0, width, height);
    const teal = ctx.createLinearGradient(width, height, 0, 0);
    teal.addColorStop(0, "rgba(34,230,255,0.26)");
    teal.addColorStop(1, "rgba(34,230,255,0)");
    ctx.globalCompositeOperation = "soft-light";
    ctx.fillStyle = teal;
    ctx.fillRect(0, 0, width, height);
    ctx.globalCompositeOperation = "source-over";
  },
  pastelWash(ctx, width, height) {
    const wash = ctx.createLinearGradient(0, 0, 0, height);
    wash.addColorStop(0, "rgba(255,214,232,0.20)");
    wash.addColorStop(1, "rgba(203,213,255,0.18)");
    ctx.globalCompositeOperation = "soft-light";
    ctx.fillStyle = wash;
    ctx.fillRect(0, 0, width, height);
    ctx.globalCompositeOperation = "source-over";
  },
  grain(ctx, width, height, seed) {
    const tile = grainTile(seed);
    const pattern = ctx.createPattern(tile, "repeat");
    ctx.save();
    ctx.globalAlpha = 0.07;
    ctx.globalCompositeOperation = "overlay";
    ctx.fillStyle = pattern;
    ctx.fillRect(0, 0, width, height);
    ctx.restore();
  },
  vignette(ctx, width, height) {
    drawVignette(ctx, width, height, 0.34);
  },
  strongVignette(ctx, width, height) {
    drawVignette(ctx, width, height, 0.52);
  },
  channelSplit(ctx, width, height, seed, art) {
    ctx.save();
    ctx.globalCompositeOperation = "screen";
    ctx.globalAlpha = 0.5;
    ctx.drawImage(art, -3, 0);
    ctx.globalAlpha = 0.5;
    ctx.drawImage(art, 3, 0);
    ctx.restore();
    ctx.save();
    ctx.globalCompositeOperation = "source-over";
    ctx.fillStyle = "rgba(255,0,80,0.05)";
    ctx.fillRect(0, 0, width, height);
    ctx.fillStyle = "rgba(0,220,255,0.05)";
    ctx.fillRect(0, 0, width, height);
    ctx.restore();
  },
  scanlines(ctx, width, height) {
    ctx.save();
    ctx.fillStyle = "rgba(0,0,0,0.16)";
    for (let y = 0; y < height; y += 3) ctx.fillRect(0, y, width, 1);
    ctx.restore();
  },
  trackingBands(ctx, width, height, seed) {
    const rand = mulberrySeed(seed + 11);
    ctx.save();
    for (let i = 0; i < 3; i++) {
      const bandY = rand() * height;
      const bandH = 6 + rand() * 26;
      ctx.fillStyle = rand() > 0.5 ? "rgba(255,255,255,0.10)" : "rgba(0,0,0,0.16)";
      ctx.fillRect(0, bandY, width, bandH);
    }
    ctx.restore();
  },
  vhsOsd(ctx, width, height) {
    const size = Math.max(16, Math.round(width * 0.028));
    ctx.save();
    ctx.font = `700 ${size}px 'Courier New', monospace`;
    ctx.textAlign = "left";
    ctx.textBaseline = "top";
    ctx.shadowColor = "rgba(0,0,0,0.9)";
    ctx.shadowBlur = 4;
    ctx.fillStyle = "rgba(255,255,255,0.92)";
    ctx.fillText("PLAY ▶", width * 0.03, height * 0.03);
    ctx.textAlign = "right";
    ctx.fillText("SP 0:00:00", width * 0.97, height * 0.03);
    ctx.restore();
  },
};

/**
 * Draw one cover into a canvas of the given size. `state` carries the
 * layout, grade, title, subtitle, title fill, panel crops and seed; `images`
 * is the array of loaded photos the panels draw from.
 */
export function drawCoverArt(canvas, state, images) {
  const size = EXPORT_SIZES[state.size] ?? EXPORT_SIZES.portrait;
  const width = size.width;
  const height = size.height;
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  const layout = layoutById(state.layout);
  const grade = gradeById(state.grade);
  const seed = state.seed ?? 7;

  const art = document.createElement("canvas");
  art.width = width;
  art.height = height;
  const actx = art.getContext("2d");
  actx.fillStyle = "#0b0b12";
  actx.fillRect(0, 0, width, height);

  const crops = state.panels ?? [];
  layout.panels.forEach((panel, i) => {
    const crop = crops[i] ?? { photo: i % Math.max(1, images.length), scale: 1, ox: 0, oy: 0 };
    const image = images[crop.photo] ?? images[i % Math.max(1, images.length)] ?? null;
    drawPhotoIntoPanel(actx, image, panel, crop, width, height);
    strokePanelFrame(actx, panel, width, height, layout.id === "neon-grid");
  });
  drawTitleBlock(actx, state, layout, width, height);

  ctx.save();
  ctx.filter = grade.filter;
  ctx.drawImage(art, 0, 0);
  ctx.restore();
  for (const pass of grade.overlays) {
    const fn = OVERLAY_PASSES[pass];
    if (fn) fn(ctx, width, height, seed, art);
  }
  return { width, height, layout: layout.id, grade: grade.id };
}

/** Default per-panel crops for a layout: photos cycle, slight zoom variety. */
export function defaultPanelCrops(layoutId, photoCount) {
  const layout = layoutById(layoutId);
  const count = Math.max(1, photoCount);
  return layout.panels.map((_, i) => ({
    photo: i % count,
    scale: 1 + ((i * 37) % 3) * 0.06,
    ox: ((i * 53) % 5 - 2) * 8,
    oy: ((i * 29) % 5 - 2) * 8,
  }));
}

/** A fresh state object: the studio as it opens, before any edit. */
export function defaultCoverState() {
  return {
    layout: "classic",
    grade: "sunset",
    size: "portrait",
    title: "PALM SUNSET",
    subtitle: "Neon Shore",
    titleFill: "gradient",
    panels: defaultPanelCrops("classic", 2),
    selected: 0,
    seed: 7,
  };
}

/** The export file name carries the layout, grade and size. */
export function coverFileName(state) {
  const size = state.size ?? "portrait";
  const safeTitle = (state.title || "cover").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") || "cover";
  return `palm-sunset-cover_${safeTitle}_${state.layout}_${state.grade}_${size}.png`;
}

/**
 * Render a cover off-screen at an export size and hand back a PNG blob.
 * The live preview keeps drawing on its own canvas; export never disturbs it.
 */
export function exportCoverPng(state, images) {
  const size = EXPORT_SIZES[state.size] ?? EXPORT_SIZES.portrait;
  const canvas = document.createElement("canvas");
  drawCoverArt(canvas, state, images);
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve({ blob, width: size.width, height: size.height });
      else reject(new Error("the cover did not render to a PNG blob"));
    }, "image/png");
  });
}
