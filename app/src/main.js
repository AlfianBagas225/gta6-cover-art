// Palm Sunset Cover Studio — the editor.
//
// Wires the page together: photos in, layout and grade picked, caption
// typed, panels dragged and zoomed on the live preview, PNG out in three
// post sizes. The app opens with the two sample photos already loaded as
// a finished cover, so the first export is one click away; a person's own
// photos replace them from their machine and never leave it. A `?shot=`
// query sets up a fixed scene for a screenshot instead (./shots.js).
import { COVER_LAYOUTS, COLOR_GRADES, EXPORT_PRESETS, freshState, paintCover, renderToCanvas, photoCells } from './cover.js';
import { stageShot } from './shots.js';

const preview = document.getElementById('previewCanvas');
const notice = document.getElementById('notice');
const cover = freshState();
const library = []; // { img, name } — the person's photo library, local only
let activePanel = 0;
let previewSize = EXPORT_PRESETS[0];
let hitBoxes = [];

/** Undo / redo over snapshots of the cover state. */
const history = {
  past: [],
  future: [],
  commit() {
    this.past.push(JSON.stringify(cover));
    if (this.past.length > 60) this.past.shift();
    this.future.length = 0;
  },
  undo() {
    if (!this.past.length) return false;
    this.future.push(JSON.stringify(cover));
    this.apply(this.past.pop());
    return true;
  },
  redo() {
    if (!this.future.length) return false;
    this.past.push(JSON.stringify(cover));
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

function repaint() {
  preview.width = previewSize.w;
  preview.height = previewSize.h;
  hitBoxes = paintCover(preview, cover, library.map((p) => p.img));
  // A cover screenshot shows the exported art alone — no editor chrome on it.
  if (!document.body.classList.contains('shot-mode')) markActivePanel();
  renderStrip();
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

function renderStrip() {
  const strip = document.getElementById('photoStrip');
  strip.replaceChildren();
  library.forEach((entry, i) => {
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
    strip.append(b);
  });
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

/** Builds the layout picker: one button per layout, with a mini diagram.
 * A title cell in the diagram uses the layout's lettering zone for its
 * geometry, so the mosaic's centre block shows up purple. */
function buildLayoutGrid() {
  const wrap = document.getElementById('layoutPicker');
  for (const [key, layout] of Object.entries(COVER_LAYOUTS)) {
    const b = document.createElement('button');
    b.type = 'button';
    b.dataset.layout = key;
    b.title = layout.blurb;
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
    const name = document.createElement('span');
    name.textContent = layout.name;
    b.append(map, name);
    b.addEventListener('click', () => {
      if (cover.layout === key) return;
      history.commit();
      cover.layout = key;
      activePanel = 0;
      syncForm();
      repaint();
      announce(`${layout.name} — ${photoCells(key).length} photo panels. Click a panel to fill it.`);
    });
    wrap.append(b);
  }
}

/** Builds the grade picker: one swatch button per colour grade. */
const GRADE_SWATCHES = {
  sunset: 'linear-gradient(135deg,#ffd166,#ff5e7a,#c026d3)',
  neon: 'linear-gradient(135deg,#ff3db8,#5ff2ff)',
  'vice-gold': 'linear-gradient(135deg,#ffe259,#ffa751)',
  'teal-night': 'linear-gradient(135deg,#0f766e,#1e3a8a)',
  'mono-noir': 'linear-gradient(135deg,#f2f2f2,#111111)',
};

function buildGradeGrid() {
  const wrap = document.getElementById('gradePicker');
  for (const [key, grade] of Object.entries(COLOR_GRADES)) {
    const b = document.createElement('button');
    b.type = 'button';
    b.dataset.grade = key;
    b.style.background = GRADE_SWATCHES[key];
    const name = document.createElement('span');
    name.textContent = grade.name;
    b.append(name);
    b.addEventListener('click', () => {
      history.commit();
      cover.grade = key;
      syncForm();
      repaint();
      announce(`${grade.name} grade applied.`);
    });
    wrap.append(b);
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
    a.download = `palm-sunset-cover-${preset.key}.png`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 5000);
    announce(`Saved palm-sunset-cover-${preset.key}.png — share it anywhere.`);
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

/** Loads the two bundled sample photos so the app opens as a finished cover. */
async function loadSamples() {
  for (const name of ['boulevard.jpg', 'pier.jpg']) {
    try {
      const img = await loadImage(`samples/${name}`);
      library.push({ img, name });
    } catch { /* a missing sample just leaves the library smaller */ }
  }
}

/** Shuffles layout, grade and caption for a fresh cover in one click. */
function shuffleCover() {
  const titles = [
    ['NEON SHORE', 'a vice coast story'],
    ['PIER PRESSURE', 'golden hour, no mercy'],
    ['BOULEVARD QUEEN', 'crown optional'],
    ['NIGHT SHIFT', 'the city never sleeps'],
    ['SUNSET HEIST', 'one last job'],
    ['PALM & CHROME', 'summer in the city'],
  ];
  history.commit();
  const layoutKeys = Object.keys(COVER_LAYOUTS);
  const gradeKeys = Object.keys(COLOR_GRADES);
  cover.layout = layoutKeys[Math.floor(Math.random() * layoutKeys.length)];
  cover.grade = gradeKeys[Math.floor(Math.random() * gradeKeys.length)];
  const [title, subtitle] = titles[Math.floor(Math.random() * titles.length)];
  cover.title = title;
  cover.subtitle = subtitle;
  activePanel = 0;
  syncForm();
  repaint();
  announce(`Surprise me: ${cover.layout}, ${cover.grade}, “${title}”.`);
}

function wireControls() {
  document.getElementById('photoInput').addEventListener('change', (e) => addFiles(e.target.files));
  document.getElementById('loadSamplesBtn').addEventListener('click', async () => {
    if (library.length >= 2) { announce('The sample photos are already loaded.'); return; }
    await loadSamples();
    repaint();
    announce('Sample photos loaded.');
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
  document.getElementById('zoomSlider').addEventListener('input', (e) => {
    const p = cover.panels[activePanel];
    if (p) { p.zoom = Number(e.target.value); repaint(); }
  });
  document.getElementById('zoomSlider').addEventListener('change', () => history.commit());
  document.getElementById('panXSlider').addEventListener('input', (e) => {
    const p = cover.panels[activePanel];
    if (p) { p.panX = Number(e.target.value); repaint(); }
  });
  document.getElementById('panYSlider').addEventListener('input', (e) => {
    const p = cover.panels[activePanel];
    if (p) { p.panY = Number(e.target.value); repaint(); }
  });
  document.getElementById('exportBtn').addEventListener('click', () => downloadPNG(previewSize));
  document.getElementById('exportAllBtn').addEventListener('click', () => {
    EXPORT_PRESETS.forEach((preset, i) => setTimeout(() => downloadPNG(preset), i * 350));
  });
  document.getElementById('shuffleBtn').addEventListener('click', shuffleCover);
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

function wireCanvas() {
  let dragging = false;
  let last = null;
  preview.addEventListener('pointerdown', (e) => {
    const p = pointerToCanvas(e);
    const hit = hitBoxes.findIndex((r) => p.x >= r.left && p.x <= r.left + r.width && p.y >= r.top && p.y <= r.top + r.height);
    if (hit === -1) return;
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
