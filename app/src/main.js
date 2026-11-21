// Palm Sunset Cover Studio — the editor (round 2).
//
// Wires the page: photos in, layout and grade picked, caption typed, panels
// dragged and zoomed on the live preview, PNG out in three post sizes. The
// app opens with the two sample photos already loaded as a finished cover,
// so the first export is one click away; a person's own photos replace them
// from their machine and never leave it. A `?shot=` query sets up a fixed
// scene for a screenshot instead (./shots.js).
import { LAYOUTS, GRADES, EXPORT_SIZES, defaultCoverState, drawCover, renderCoverCanvas, photoSlots } from './cover.js';
import { runShot } from './shots.js';

const canvas = document.getElementById('cover');
const statusEl = document.getElementById('status');
const state = defaultCoverState();
const photos = []; // { img, name } — the person's photo library, local only
let selectedPanel = 0;
let exportSize = EXPORT_SIZES[0];
let slotRects = [];
const undoStack = [];
const redoStack = [];

function say(msg) {
  statusEl.textContent = msg;
}

/** Loads an image from a URL, resolving once it can be drawn. */
export function loadImage(url) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = url;
  });
}

function snapshot() {
  return JSON.stringify({ ...state, panels: state.panels });
}
function pushHistory() {
  undoStack.push(snapshot());
  if (undoStack.length > 60) undoStack.shift();
  redoStack.length = 0;
}
function restore(json) {
  const saved = JSON.parse(json);
  Object.assign(state, saved);
  syncControls();
  redraw();
}
function undo() {
  if (!undoStack.length) return;
  redoStack.push(snapshot());
  restore(undoStack.pop());
  say('Undid the last change.');
}
function redo() {
  if (!redoStack.length) return;
  undoStack.push(snapshot());
  restore(redoStack.pop());
  say('Redid the change.');
}

function redraw() {
  canvas.width = exportSize.w;
  canvas.height = exportSize.h;
  slotRects = drawCover(canvas, state, photos.map((p) => p.img));
  // A cover screenshot shows the exported art alone — no editor chrome on it.
  if (!document.body.classList.contains('shot-cover')) drawSelection();
  renderThumbs();
}

/** Outlines the selected panel on the preview so it can be found at a glance. */
function drawSelection() {
  const rect = slotRects[selectedPanel];
  if (!rect) return;
  const ctx = canvas.getContext('2d');
  const s = Math.min(canvas.width, canvas.height);
  ctx.save();
  ctx.strokeStyle = '#ffd166';
  ctx.lineWidth = Math.max(3, s * 0.006);
  ctx.setLineDash([Math.round(s * 0.02), Math.round(s * 0.012)]);
  ctx.strokeRect(rect.x, rect.y, rect.w, rect.h);
  ctx.restore();
}

function renderThumbs() {
  const strip = document.getElementById('thumbs');
  strip.replaceChildren();
  photos.forEach((p, i) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'thumb' + (state.panels[selectedPanel]?.photo === i ? ' active' : '');
    b.title = `Use ${p.name} in the selected panel`;
    const thumb = document.createElement('img');
    thumb.src = p.img.src;
    thumb.alt = p.name;
    b.append(thumb);
    b.addEventListener('click', () => {
      pushHistory();
      state.panels[selectedPanel] = { ...state.panels[selectedPanel], photo: i };
      redraw();
      say(`${p.name} is now in panel ${selectedPanel + 1}.`);
    });
    strip.append(b);
  });
  document.getElementById('panelLabel').textContent = `Panel ${selectedPanel + 1} of ${photoSlots(state.layout).length}`;
  const zoom = document.getElementById('zoom');
  const panel = state.panels[selectedPanel];
  if (panel) {
    zoom.value = panel.zoom;
    document.getElementById('panX').value = panel.ox;
    document.getElementById('panY').value = panel.oy;
  }
}

function syncControls() {
  document.getElementById('title').value = state.title;
  document.getElementById('subtitle').value = state.subtitle;
  document.getElementById('titleFont').value = state.titleFont;
  document.getElementById('titlePos').value = state.titlePos;
  document.getElementById('titleGradient').checked = state.titleGradient;
  document.getElementById('frame').checked = state.frame;
  document.getElementById('grain').checked = state.grain;
  document.getElementById('vignette').checked = state.vignette;
  document.getElementById('badge').checked = state.badge;
  document.getElementById('stars').value = String(state.stars);
  document.querySelectorAll('#layouts button').forEach((b) => b.classList.toggle('active', b.dataset.layout === state.layout));
  document.querySelectorAll('#grades button').forEach((b) => b.classList.toggle('active', b.dataset.grade === state.grade));
  document.querySelectorAll('input[name=size]').forEach((r) => { r.checked = r.value === exportSize.id; });
}

/** Builds the layout picker: one button per layout, with a mini diagram. */
function buildLayoutPicker() {
  const wrap = document.getElementById('layouts');
  for (const [id, layout] of Object.entries(LAYOUTS)) {
    const b = document.createElement('button');
    b.type = 'button';
    b.dataset.layout = id;
    b.title = layout.hint;
    const diagram = document.createElement('span');
    diagram.className = 'diagram';
    for (const slot of layout.slots) {
      const cell = document.createElement('i');
      cell.style.left = `${slot.x * 100}%`;
      cell.style.top = `${slot.y * 100}%`;
      cell.style.width = `${slot.w * 100}%`;
      cell.style.height = `${slot.h * 100}%`;
      if (slot.title) cell.classList.add('title-cell');
      diagram.append(cell);
    }
    const name = document.createElement('span');
    name.textContent = layout.label;
    b.append(diagram, name);
    b.addEventListener('click', () => {
      if (state.layout === id) return;
      pushHistory();
      state.layout = id;
      selectedPanel = 0;
      syncControls();
      redraw();
      say(`${layout.label} — ${photoSlots(id).length} photo panels. Click a panel to fill it.`);
    });
    wrap.append(b);
  }
}

/** Builds the grade picker: one swatch button per colour grade. */
function buildGradePicker() {
  const wrap = document.getElementById('grades');
  const swatches = {
    sunset: 'linear-gradient(135deg,#ffd166,#ff5e7a,#c026d3)',
    neon: 'linear-gradient(135deg,#ff3db8,#5ff2ff)',
    'vice-gold': 'linear-gradient(135deg,#ffe259,#ffa751)',
    'teal-night': 'linear-gradient(135deg,#0f766e,#1e3a8a)',
    'mono-noir': 'linear-gradient(135deg,#f2f2f2,#111111)',
  };
  for (const [id, grade] of Object.entries(GRADES)) {
    const b = document.createElement('button');
    b.type = 'button';
    b.dataset.grade = id;
    b.style.background = swatches[id];
    const name = document.createElement('span');
    name.textContent = grade.label;
    b.append(name);
    b.addEventListener('click', () => {
      pushHistory();
      state.grade = id;
      syncControls();
      redraw();
      say(`${grade.label} grade applied.`);
    });
    wrap.append(b);
  }
}

/** Builds the export-size radios and wires the PNG downloads. */
function buildExportBar() {
  const wrap = document.getElementById('sizes');
  for (const size of EXPORT_SIZES) {
    const label = document.createElement('label');
    label.className = 'size';
    const radio = document.createElement('input');
    radio.type = 'radio';
    radio.name = 'size';
    radio.value = size.id;
    radio.checked = size.id === exportSize.id;
    radio.addEventListener('change', () => {
      exportSize = size;
      redraw();
      say(`Previewing ${size.label}.`);
    });
    label.append(radio, document.createTextNode(size.label));
    wrap.append(label);
  }
}

function exportPNG(size) {
  const out = renderCoverCanvas(state, photos.map((p) => p.img), size.w, size.h);
  out.toBlob((blob) => {
    if (!blob) return;
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `palm-sunset-cover-${size.id}.png`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 5000);
    say(`Saved palm-sunset-cover-${size.id}.png — share it anywhere.`);
  }, 'image/png');
}

async function addPhotoFiles(files) {
  let added = 0;
  for (const file of files) {
    if (!file.type.startsWith('image/')) continue;
    const img = await loadImage(URL.createObjectURL(file));
    photos.push({ img, name: file.name });
    added += 1;
  }
  if (added) {
    selectedPanel = 0;
    redraw();
    say(`${added} photo${added > 1 ? 's' : ''} loaded — click a thumbnail to place one.`);
  }
}

/** Loads the two bundled sample photos so the app opens as a finished cover. */
async function loadSamples() {
  for (const name of ['boulevard.jpg', 'pier.jpg']) {
    try {
      const img = await loadImage(`samples/${name}`);
      photos.push({ img, name });
    } catch { /* a missing sample just leaves the library smaller */ }
  }
}

/** Shuffles layout, grade and caption for a fresh cover in one click. */
function randomize() {
  const titles = [
    ['NEON SHORE', 'a vice coast story'],
    ['PIER PRESSURE', 'golden hour, no mercy'],
    ['BOULEVARD QUEEN', 'crown optional'],
    ['NIGHT SHIFT', 'the city never sleeps'],
    ['SUNSET HEIST', 'one last job'],
    ['PALM & CHROME', 'summer in the city'],
  ];
  pushHistory();
  const layoutIds = Object.keys(LAYOUTS);
  const gradeIds = Object.keys(GRADES);
  state.layout = layoutIds[Math.floor(Math.random() * layoutIds.length)];
  state.grade = gradeIds[Math.floor(Math.random() * gradeIds.length)];
  const [title, subtitle] = titles[Math.floor(Math.random() * titles.length)];
  state.title = title;
  state.subtitle = subtitle;
  selectedPanel = 0;
  syncControls();
  redraw();
  say(`Surprise me: ${state.layout}, ${state.grade}, “${title}”.`);
}

function bindControls() {
  document.getElementById('photo').addEventListener('change', (e) => addPhotoFiles(e.target.files));
  document.getElementById('samples').addEventListener('click', async () => {
    if (photos.length >= 2) { say('The sample photos are already loaded.'); return; }
    await loadSamples();
    redraw();
    say('Sample photos loaded.');
  });
  document.getElementById('fillAll').addEventListener('click', () => {
    if (!photos.length) return;
    pushHistory();
    const pick = state.panels[selectedPanel]?.photo ?? 0;
    state.panels = state.panels.map((p) => ({ ...p, photo: pick }));
    redraw();
    say('Every panel now uses the selected photo.');
  });
  document.getElementById('title').addEventListener('input', (e) => { state.title = e.target.value; redraw(); });
  document.getElementById('subtitle').addEventListener('input', (e) => { state.subtitle = e.target.value; redraw(); });
  document.getElementById('titleFont').addEventListener('change', (e) => { pushHistory(); state.titleFont = e.target.value; redraw(); });
  document.getElementById('titlePos').addEventListener('change', (e) => { pushHistory(); state.titlePos = e.target.value; redraw(); });
  document.getElementById('titleGradient').addEventListener('change', (e) => { pushHistory(); state.titleGradient = e.target.checked; redraw(); });
  for (const id of ['frame', 'grain', 'vignette', 'badge']) {
    document.getElementById(id).addEventListener('change', (e) => { pushHistory(); state[id] = e.target.checked; redraw(); });
  }
  document.getElementById('stars').addEventListener('change', (e) => { pushHistory(); state.stars = Number(e.target.value); redraw(); });
  document.getElementById('zoom').addEventListener('input', (e) => {
    const p = state.panels[selectedPanel];
    if (p) { p.zoom = Number(e.target.value); redraw(); }
  });
  document.getElementById('zoom').addEventListener('change', pushHistory);
  document.getElementById('panX').addEventListener('input', (e) => {
    const p = state.panels[selectedPanel];
    if (p) { p.ox = Number(e.target.value); redraw(); }
  });
  document.getElementById('panY').addEventListener('input', (e) => {
    const p = state.panels[selectedPanel];
    if (p) { p.oy = Number(e.target.value); redraw(); }
  });
  document.getElementById('export').addEventListener('click', () => exportPNG(exportSize));
  document.getElementById('exportAll').addEventListener('click', () => {
    EXPORT_SIZES.forEach((size, i) => setTimeout(() => exportPNG(size), i * 350));
  });
  document.getElementById('random').addEventListener('click', randomize);
  document.getElementById('undo').addEventListener('click', undo);
  document.getElementById('redo').addEventListener('click', redo);
  document.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z' && !e.shiftKey) { e.preventDefault(); undo(); }
    if ((e.ctrlKey || e.metaKey) && (e.key.toLowerCase() === 'y' || (e.key.toLowerCase() === 'z' && e.shiftKey))) { e.preventDefault(); redo(); }
  });
}

/** Pointer position on the canvas, in canvas pixels. */
function canvasPoint(e) {
  const rect = canvas.getBoundingClientRect();
  return {
    x: ((e.clientX - rect.left) / rect.width) * canvas.width,
    y: ((e.clientY - rect.top) / rect.height) * canvas.height,
  };
}

function bindCanvas() {
  let dragging = false;
  let last = null;
  canvas.addEventListener('pointerdown', (e) => {
    const p = canvasPoint(e);
    const hit = slotRects.findIndex((r) => p.x >= r.x && p.x <= r.x + r.w && p.y >= r.y && p.y <= r.y + r.h);
    if (hit === -1) return;
    selectedPanel = hit;
    dragging = true;
    last = p;
    canvas.setPointerCapture(e.pointerId);
    renderThumbs();
  });
  canvas.addEventListener('pointermove', (e) => {
    if (!dragging || !last) return;
    const p = canvasPoint(e);
    const panel = state.panels[selectedPanel];
    const rect = slotRects[selectedPanel];
    if (!panel || !rect) return;
    panel.ox = Math.max(-0.5, Math.min(0.5, panel.ox + (p.x - last.x) / rect.w));
    panel.oy = Math.max(-0.5, Math.min(0.5, panel.oy + (p.y - last.y) / rect.h));
    last = p;
    redraw();
  });
  canvas.addEventListener('pointerup', () => {
    if (dragging) pushHistory();
    dragging = false;
    last = null;
  });
  canvas.addEventListener('wheel', (e) => {
    e.preventDefault();
    const panel = state.panels[selectedPanel];
    if (!panel) return;
    panel.zoom = Math.max(1, Math.min(4, panel.zoom * Math.exp(-e.deltaY * 0.0012)));
    redraw();
  }, { passive: false });
}

buildLayoutPicker();
buildGradePicker();
buildExportBar();
bindControls();
bindCanvas();
syncControls();

const shot = new URLSearchParams(location.search).get('shot');
if (shot) {
  // A screenshot scene: the shot module sets the state up, loads the sample
  // photos and paints, then raises window.__shotReady for the capture.
  runShot(shot, new URLSearchParams(location.search), {
    state, photos,
    loadImage,
    loadSamples,
    setExportSize(size) { exportSize = size; },
    redraw,
    say,
  });
} else {
  await loadSamples();
  redraw();
  say('Sample cover loaded — add your own photos, or export this one now.');
}
