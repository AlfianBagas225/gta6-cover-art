// Palm Sunset Cover Studio — the editor.
//
// Wires the page together: photos in, layout and grade picked, caption
// typed, panels dragged and zoomed on the live preview, PNG out in three
// post sizes. The app opens with the two sample photos already loaded as
// a finished cover, so the first export is one click away; a person's own
// photos replace them from their machine and never leave it. A `?shot=`
// query sets up a fixed scene for a screenshot instead (./shots.js).
//
// Two shortcuts live here as well. Randomize (the 🎲 button, or the R
// key) shuffles the layout, the grade, the title spot, the title font
// and the caption in one click, always landing on a combination unlike
// the one on screen. Shift-clicking a second panel swaps its photo with
// the selected panel's, so two shots can trade places without re-picking
// either from the strip.
import { COVER_LAYOUTS, COLOR_GRADES, EXPORT_PRESETS, freshState, paintCover, renderToCanvas, photoCells } from './cover.js';
import { stageShot } from './shots.js';

const preview = document.getElementById('previewCanvas');
const notice = document.getElementById('notice');
const cover = freshState();
const library = []; // { img, name } — the person's photo library, local only
let activePanel = 0;
let previewSize = EXPORT_PRESETS[0];
let hitBoxes = [];

/** Undo / redo over snapshots of the cover state. A snapshot is the
 * whole state as JSON, so undo restores the layout, grade, caption and
 * every panel at once. */
const history = {
  past: [],
  future: [],
  snapshot() {
    return JSON.stringify(cover);
  },
  commit() {
    this.past.push(this.snapshot());
    if (this.past.length > 60) this.past.shift();
    this.future.length = 0;
  },
  undo() {
    if (!this.past.length) return false;
    this.future.push(this.snapshot());
    this.apply(this.past.pop());
    return true;
  },
  redo() {
    if (!this.future.length) return false;
    this.past.push(this.snapshot());
    this.apply(this.future.pop());
    return true;
  },
  apply(json) {
    Object.assign(cover, JSON.parse(json));
    syncForm();
    repaint();
  },
};

function announce(msg) {
  notice.textContent = msg;
}

/** Loads an image from a URL, resolving once it can be drawn. */
export function loadImage(url) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`could not load ${url}`));
    img.src = url;
  });
}

/** One line under the preview naming the cover on screen — layout,
 * grade, title and export size — and the browser tab follows the
 * title, so a saved tab can be told apart from the next one. */
function renderSummary() {
  const layout = COVER_LAYOUTS[cover.layout]?.name ?? cover.layout;
  const grade = COLOR_GRADES[cover.grade]?.name ?? cover.grade;
  const title = (cover.title || '').trim() || 'Untitled';
  document.getElementById('coverSummary').textContent = `${layout} · ${grade} grade · “${title}” · ${previewSize.name}`;
  document.title = `${title} — Palm Sunset Cover Studio`;
}

function repaint() {
  preview.width = previewSize.w;
  preview.height = previewSize.h;
  hitBoxes = paintCover(preview, cover, library.map((p) => p.img));
  // A cover screenshot shows the exported art alone — no editor chrome on it.
  if (!document.body.classList.contains('shot-mode')) markActivePanel();
  renderStrip();
  renderSummary();
}

/** Outlines the active panel on the preview so it can be found at a glance. */
function markActivePanel() {
  const box = hitBoxes[activePanel];
  if (!box) return;
  const ctx = preview.getContext('2d');
  const s = Math.min(preview.width, preview.height);
  ctx.save();
  ctx.strokeStyle = '#ffd166';
  ctx.lineWidth = Math.max(3, s * 0.006);
  ctx.setLineDash([Math.round(s * 0.02), Math.round(s * 0.012)]);
  ctx.strokeRect(box.left, box.top, box.width, box.height);
  ctx.restore();
}

/** One thumbnail button for the photo strip: the photo itself, a gold
 * ring when it is the one in the selected panel, and a click that puts
 * it there as one undoable step. */
function stripButton(entry, i) {
  const b = document.createElement('button');
  b.type = 'button';
  b.className = 'strip-item' + (cover.panels[activePanel]?.photo === i ? ' selected' : '');
  b.title = `Put ${entry.name} in the selected panel`;
  const thumb = document.createElement('img');
  thumb.src = entry.img.src;
  thumb.alt = entry.name;
  b.append(thumb);
  b.addEventListener('click', () => {
    history.commit();
    cover.panels[activePanel] = { ...cover.panels[activePanel], photo: i };
    repaint();
    announce(`${entry.name} is now in panel ${activePanel + 1}.`);
  });
  return b;
}

function renderStrip() {
  const strip = document.getElementById('photoStrip');
  strip.replaceChildren();
  library.forEach((entry, i) => strip.append(stripButton(entry, i)));
  document.getElementById('panelInfo').textContent = `Panel ${activePanel + 1} of ${photoCells(cover.layout).length}`;
  const panel = cover.panels[activePanel];
  if (panel) {
    document.getElementById('zoomSlider').value = panel.zoom;
    document.getElementById('panXSlider').value = panel.panX;
    document.getElementById('panYSlider').value = panel.panY;
  }
}

function syncForm() {
  const set = (id, value) => { document.getElementById(id).value = value; };
  const check = (id, value) => { document.getElementById(id).checked = value; };
  set('titleInput', cover.title);
  set('subtitleInput', cover.subtitle);
  set('titleFace', cover.titleFace);
  set('titleStyle', cover.titleStyle);
  set('titleSpot', cover.titleSpot);
  check('titleSunset', cover.titleSunset);
  check('showFrames', cover.showFrames);
  check('showGrain', cover.showGrain);
  check('showVignette', cover.showVignette);
  check('showBadge', cover.showBadge);
  set('starCount', String(cover.stars));
  document.querySelectorAll('#layoutPicker button').forEach((b) => b.classList.toggle('selected', b.dataset.layout === cover.layout));
  document.querySelectorAll('#gradePicker button').forEach((b) => b.classList.toggle('selected', b.dataset.grade === cover.grade));
  document.querySelectorAll('input[name=size]').forEach((r) => { r.checked = r.value === previewSize.key; });
}

/** One picker button: a button with a title tooltip and a name label,
 * wired so picking runs `onPick` and, when it reports a change, syncs
 * the form and repaints. The layout and grade pickers share it; each
 * adds its own visual (a mini-map or a swatch) after the button is
 * built. `onPick` returns true when it changed the cover, so picking
 * the value already on screen is a no-op instead of an undo step. */
function pickerButton(wrap, name, title, onPick) {
  const b = document.createElement('button');
  b.type = 'button';
  b.title = title;
  const label = document.createElement('span');
  label.textContent = name;
  b.append(label);
  b.addEventListener('click', () => {
    if (onPick()) {
      syncForm();
      repaint();
    }
  });
  wrap.append(b);
  return b;
}

/** Builds the layout picker: one button per layout, with a mini diagram.
 * A title cell in the diagram uses the layout's lettering zone for its
 * geometry, so the mosaic's centre block shows up purple. */
function buildLayoutGrid() {
  const wrap = document.getElementById('layoutPicker');
  for (const [key, layout] of Object.entries(COVER_LAYOUTS)) {
    const b = pickerButton(wrap, layout.name, layout.blurb, () => {
      if (cover.layout === key) return false;
      history.commit();
      cover.layout = key;
      activePanel = 0;
      announce(`${layout.name} — ${photoCells(key).length} photo panels. Click a panel to fill it.`);
      return true;
    });
    b.dataset.layout = key;
    const map = document.createElement('span');
    map.className = 'mini-map';
    for (const cell of layout.cells) {
      const tile = document.createElement('i');
      const geo = cell.isTitle ? layout.zone : cell;
      tile.style.left = `${geo.left * 100}%`;
      tile.style.top = `${geo.top * 100}%`;
      tile.style.width = `${geo.width * 100}%`;
      tile.style.height = `${geo.height * 100}%`;
      if (cell.isTitle) tile.classList.add('title-tile');
      map.append(tile);
    }
    b.prepend(map);
  }
}

/** Builds the grade picker: one swatch button per colour grade. */
const GRADE_SWATCHES = {
  sunset: 'linear-gradient(135deg,#ffd166,#ff5e7a,#c026d3)',
  neon: 'linear-gradient(135deg,#ff3db8,#5ff2ff)',
  'vice-gold': 'linear-gradient(135deg,#ffe259,#ffa751)',
  'teal-night': 'linear-gradient(135deg,#0f766e,#1e3a8a)',
  'mono-noir': 'linear-gradient(135deg,#f2f2f2,#111111)',
  vhs: 'linear-gradient(135deg,#111111 0%,#111111 30%,#ff2d55 50%,#00e5ff 70%,#111111 100%)',
};

function buildGradeGrid() {
  const wrap = document.getElementById('gradePicker');
  for (const [key, grade] of Object.entries(COLOR_GRADES)) {
    const b = pickerButton(wrap, grade.name, `${grade.name} grade`, () => {
      if (cover.grade === key) return false;
      history.commit();
      cover.grade = key;
      announce(`${grade.name} grade applied.`);
      return true;
    });
    b.dataset.grade = key;
    b.style.background = GRADE_SWATCHES[key];
  }
}

/** Builds the export-size radios. */
function buildSizeList() {
  const wrap = document.getElementById('sizePicker');
  for (const preset of EXPORT_PRESETS) {
    const label = document.createElement('label');
    label.className = 'size-option';
    const radio = document.createElement('input');
    radio.type = 'radio';
    radio.name = 'size';
    radio.value = preset.key;
    radio.checked = preset.key === previewSize.key;
    radio.addEventListener('change', () => {
      previewSize = preset;
      repaint();
      announce(`Previewing ${preset.name}.`);
    });
    label.append(radio, document.createTextNode(preset.name));
    wrap.append(label);
  }
}

function downloadPNG(preset) {
  const out = renderToCanvas(cover, library.map((p) => p.img), preset.w, preset.h);
  out.toBlob((blob) => {
    if (!blob) return;
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    // The file name carries the layout and grade, so a downloaded cover
    // can be told apart from the next export without opening it.
    a.download = `palm-sunset-cover-${cover.layout}-${cover.grade}-${preset.key}.png`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 5000);
    announce(`Saved palm-sunset-cover-${cover.layout}-${cover.grade}-${preset.key}.png — share it anywhere.`);
  }, 'image/png');
}

async function addFiles(files) {
  let added = 0;
  for (const file of files) {
    if (!file.type.startsWith('image/')) continue;
    const img = await loadImage(URL.createObjectURL(file));
    library.push({ img, name: file.name });
    added += 1;
  }
  if (added) {
    activePanel = 0;
    repaint();
    announce(`${added} photo${added > 1 ? 's' : ''} loaded — click a thumbnail to place one.`);
  }
}

/** Loads the two bundled sample photos so the app opens as a finished cover.
 * Returns how many loaded, so the button can say so instead of guessing. */
async function loadSamples() {
  let loaded = 0;
  for (const name of ['boulevard.jpg', 'pier.jpg']) {
    try {
      const img = await loadImage(`samples/${name}`);
      library.push({ img, name });
      loaded += 1;
    } catch { /* a missing sample just leaves the library smaller */ }
  }
  return loaded;
}

/** Picks a fresh combination for the cover in one click: a new layout, a
 * new grade, a new title spot and title font, and a new caption pair.
 * Every roll avoids the value on screen, so the result always looks
 * different — a layout or grade that matches the current one is rolled
 * again instead of landing as a no-op shuffle. */
function randomizeCover() {
  const captions = [
    ['NEON SHORE', 'a vice coast story'],
    ['PIER PRESSURE', 'golden hour, no mercy'],
    ['BOULEVARD QUEEN', 'crown optional'],
    ['NIGHT SHIFT', 'the city never sleeps'],
    ['SUNSET HEIST', 'one last job'],
    ['PALM & CHROME', 'summer in the city'],
  ];
  // A fresh pick from `choices` that is not `current`; with only one
  // choice there is nothing to avoid, so it comes back as-is.
  const freshPick = (choices, current) => {
    if (choices.length < 2) return choices[0];
    let pick = choices[Math.floor(Math.random() * choices.length)];
    while (pick === current) pick = choices[Math.floor(Math.random() * choices.length)];
    return pick;
  };
  history.commit();
  cover.layout = freshPick(Object.keys(COVER_LAYOUTS), cover.layout);
  cover.grade = freshPick(Object.keys(COLOR_GRADES), cover.grade);
  cover.titleSpot = freshPick(['bottom', 'top', 'center'], cover.titleSpot);
  cover.titleFace = freshPick(['anton', 'bebas'], cover.titleFace);
  cover.titleStyle = freshPick(['gradient', 'solid', 'outline'], cover.titleStyle);
  const [title, subtitle] = captions[Math.floor(Math.random() * captions.length)];
  cover.title = title;
  cover.subtitle = subtitle;
  activePanel = 0;
  syncForm();
  repaint();
  announce(`Randomized: ${COVER_LAYOUTS[cover.layout].name} layout, ${COLOR_GRADES[cover.grade].name} grade, title ${cover.titleSpot}, ${cover.titleStyle} fill.`);
}

/** Steps to the next grade in the picker order, wrapping round, as one
 * undoable step. G is the keyboard way to browse the looks without
 * reaching for the mouse. */
function cycleGrade() {
  const keys = Object.keys(COLOR_GRADES);
  history.commit();
  cover.grade = keys[(keys.indexOf(cover.grade) + 1) % keys.length];
  syncForm();
  repaint();
  announce(`${COLOR_GRADES[cover.grade].name} grade applied.`);
}

/** Steps to the next layout in the picker order, wrapping round, as one
 * undoable step. L is the keyboard way to browse the compositions. */
function cycleLayout() {
  const keys = Object.keys(COVER_LAYOUTS);
  history.commit();
  cover.layout = keys[(keys.indexOf(cover.layout) + 1) % keys.length];
  activePanel = 0;
  syncForm();
  repaint();
  announce(`${COVER_LAYOUTS[cover.layout].name} — ${photoCells(cover.layout).length} photo panels.`);
}
function resetCover() {
  history.commit();
  Object.assign(cover, freshState());
  activePanel = 0;
  syncForm();
  repaint();
  announce('Back to the opening cover.');
}

function wireControls() {
  document.getElementById('photoInput').addEventListener('change', (e) => addFiles(e.target.files));
  document.getElementById('loadSamplesBtn').addEventListener('click', async () => {
    if (library.length >= 2) { announce('The sample photos are already loaded.'); return; }
    const loaded = await loadSamples();
    repaint();
    announce(loaded ? `${loaded} sample photo${loaded > 1 ? 's' : ''} loaded.` : 'The sample photos could not be loaded.');
  });
  document.getElementById('fillAllBtn').addEventListener('click', () => {
    if (!library.length) return;
    history.commit();
    const pick = cover.panels[activePanel]?.photo ?? 0;
    cover.panels = cover.panels.map((p) => ({ ...p, photo: pick }));
    repaint();
    announce('Every panel now uses the selected photo.');
  });
  document.getElementById('titleInput').addEventListener('input', (e) => { cover.title = e.target.value; repaint(); });
  document.getElementById('subtitleInput').addEventListener('input', (e) => { cover.subtitle = e.target.value; repaint(); });
  document.getElementById('titleFace').addEventListener('change', (e) => { history.commit(); cover.titleFace = e.target.value; repaint(); });
  document.getElementById('titleStyle').addEventListener('change', (e) => { history.commit(); cover.titleStyle = e.target.value; repaint(); });
  document.getElementById('titleSpot').addEventListener('change', (e) => { history.commit(); cover.titleSpot = e.target.value; repaint(); });
  document.getElementById('titleSunset').addEventListener('change', (e) => { history.commit(); cover.titleSunset = e.target.checked; repaint(); });
  for (const id of ['showFrames', 'showGrain', 'showVignette', 'showBadge']) {
    document.getElementById(id).addEventListener('change', (e) => {
      history.commit();
      cover[id] = e.target.checked;
      repaint();
    });
  }
  document.getElementById('starCount').addEventListener('change', (e) => { history.commit(); cover.stars = Number(e.target.value); repaint(); });
  // One binding for the three framing sliders: each one writes its value
  // onto the selected panel and repaints live, and the zoom slider
  // commits to history when the drag ends.
  const bindSlider = (id, apply) => {
    document.getElementById(id).addEventListener('input', (e) => {
      const panel = cover.panels[activePanel];
      if (panel) {
        apply(panel, Number(e.target.value));
        repaint();
      }
    });
  };
  bindSlider('zoomSlider', (panel, value) => { panel.zoom = value; });
  bindSlider('panXSlider', (panel, value) => { panel.panX = value; });
  bindSlider('panYSlider', (panel, value) => { panel.panY = value; });
  document.getElementById('zoomSlider').addEventListener('change', () => history.commit());
  document.getElementById('exportBtn').addEventListener('click', () => downloadPNG(previewSize));
  document.getElementById('exportAllBtn').addEventListener('click', () => {
    EXPORT_PRESETS.forEach((preset, i) => setTimeout(() => downloadPNG(preset), i * 350));
  });
  document.getElementById('cyclePhotoBtn').addEventListener('click', () => {
    if (!library.length) return;
    history.commit();
    const panel = cover.panels[activePanel];
    panel.photo = ((panel.photo ?? 0) + 1) % library.length;
    repaint();
    announce(`Panel ${activePanel + 1} now shows ${library[panel.photo].name}.`);
  });
  document.getElementById('resetBtn').addEventListener('click', resetCover);
  document.getElementById('randomizeBtn').addEventListener('click', randomizeCover);
  document.addEventListener('keydown', (e) => {
    // Single-letter shortcuts — except while typing in a field, where
    // the letters belong to the text. R randomizes, G steps the grade,
    // L steps the layout.
    const typing = /^(INPUT|SELECT|TEXTAREA)$/.test(document.activeElement?.tagName ?? '');
    if (typing || e.ctrlKey || e.metaKey) return;
    if (e.key === 'r' || e.key === 'R') randomizeCover();
    if (e.key === 'g' || e.key === 'G') cycleGrade();
    if (e.key === 'l' || e.key === 'L') cycleLayout();
  });
  document.getElementById('undoBtn').addEventListener('click', () => {
    if (history.undo()) announce('Undid the last change.');
  });
  document.getElementById('redoBtn').addEventListener('click', () => {
    if (history.redo()) announce('Redid the change.');
  });
  document.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z' && !e.shiftKey) { e.preventDefault(); if (history.undo()) announce('Undid the last change.'); }
    if ((e.ctrlKey || e.metaKey) && (e.key.toLowerCase() === 'y' || (e.key.toLowerCase() === 'z' && e.shiftKey))) { e.preventDefault(); if (history.redo()) announce('Redid the change.'); }
  });
}

/** Pointer position on the canvas, in canvas pixels. */
function pointerToCanvas(e) {
  const rect = preview.getBoundingClientRect();
  return {
    x: ((e.clientX - rect.left) / rect.width) * preview.width,
    y: ((e.clientY - rect.top) / rect.height) * preview.height,
  };
}

/** The index of the photo cell under point `p`, or -1 when the point
 * falls on a gap, a frame or the title block instead of a photo. */
function hitTest(p) {
  return hitBoxes.findIndex((r) => p.x >= r.left && p.x <= r.left + r.width && p.y >= r.top && p.y <= r.top + r.height);
}

function wireCanvas() {
  let dragging = false;
  let last = null;
  preview.addEventListener('pointerdown', (e) => {
    const p = pointerToCanvas(e);
    const hit = hitTest(p);
    if (hit === -1) return;
    if (e.shiftKey && hit !== activePanel) {
      // Shift-click a second panel: trade its photo with the selected
      // panel's, so two shots can swap places without re-picking either.
      const first = cover.panels[activePanel];
      const second = cover.panels[hit];
      if (!first || !second) return;
      history.commit();
      const held = first.photo;
      first.photo = second.photo;
      second.photo = held;
      const from = activePanel;
      activePanel = hit;
      repaint();
      announce(`Swapped the photos in panels ${from + 1} and ${hit + 1}.`);
      return;
    }
    activePanel = hit;
    dragging = true;
    last = p;
    preview.setPointerCapture(e.pointerId);
    renderStrip();
  });
  preview.addEventListener('pointermove', (e) => {
    if (!dragging || !last) return;
    const p = pointerToCanvas(e);
    const panel = cover.panels[activePanel];
    const box = hitBoxes[activePanel];
    if (!panel || !box) return;
    panel.panX = Math.max(-0.5, Math.min(0.5, panel.panX + (p.x - last.x) / box.width));
    panel.panY = Math.max(-0.5, Math.min(0.5, panel.panY + (p.y - last.y) / box.height));
    last = p;
    repaint();
  });
  preview.addEventListener('pointerup', () => {
    if (dragging) history.commit();
    dragging = false;
    last = null;
  });
  preview.addEventListener('wheel', (e) => {
    e.preventDefault();
    const panel = cover.panels[activePanel];
    if (!panel) return;
    panel.zoom = Math.max(1, Math.min(4, panel.zoom * Math.exp(-e.deltaY * 0.0012)));
    repaint();
  }, { passive: false });
}

buildLayoutGrid();
buildGradeGrid();
buildSizeList();
wireControls();
wireCanvas();
syncForm();

const shotName = new URLSearchParams(location.search).get('shot');
if (shotName) {
  // A screenshot scene: the shot module sets the state up, loads the sample
  // photos and paints, then raises window.__shotReady for the capture.
  stageShot(shotName, new URLSearchParams(location.search), {
    state: cover,
    library,
    loadImage,
    loadSamples,
    setPreviewSize(size) { previewSize = size; },
    repaint,
    announce,
  });
} else {
  await loadSamples();
  repaint();
  announce('Sample cover loaded — add your own photos, or export this one now.');
}
