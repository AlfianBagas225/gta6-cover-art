/**
 * main.js — the studio's wiring: state, editor, and the live preview.
 *
 * The cover engine (cover.js) draws; this file owns everything around it:
 * loading the sample photos, keeping the editor state, answering pointer,
 * wheel and keyboard input, and turning the scene query string (?shot=…)
 * into the four screenshot views. Nothing here fetches over the network:
 * photos come from app/samples/ or the person's own file picker.
 */

import {
  LAYOUTS,
  GRADES,
  TITLE_FILLS,
  EXPORT_SIZES,
  layoutById,
  gradeById,
  panelAtPoint,
  drawCoverArt,
  defaultPanelCrops,
  defaultCoverState,
  coverFileName,
  exportCoverPng,
} from "./cover.js";
import { shotSceneFromUrl } from "./shots.js";

/** The two sample photos the studio ships with, under app/samples/. */
const SAMPLE_PHOTOS = ["samples/boulevard.jpg", "samples/pier.jpg"];

/** Small helper: one element by id, failing loudly when the markup moves. */
function el(id) {
  const node = document.getElementById(id);
  if (!node) throw new Error(`main.js: #${id} is missing from index.html`);
  return node;
}

/** Load one image, resolving with the element or null when it fails. */
function loadImage(src) {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = src;
  });
}

/** The studio's state: one object, mutated only through the helpers below. */
const state = defaultCoverState();

/** Loaded photos, in the same order as state.panels' photo indexes. */
let photos = [];

/** The preview canvas and its 2d context. */
const canvas = el("coverCanvas");
const preview = canvas.getContext("2d");

/** A drag in progress: which panel, where it started, and its crop then. */
let drag = null;

/** Read the cover size for the current state. */
function currentSize() {
  return EXPORT_SIZES[state.size] ?? EXPORT_SIZES.portrait;
}

/** Redraw the preview and refresh every readout that mirrors the state. */
function render() {
  const info = drawCoverArt(canvas, state, photos);
  drawSelectionOutline(info);
  syncEditorReadouts(info);
  return info;
}

/** Dashed outline around the selected panel, drawn over the finished art. */
function drawSelectionOutline(info) {
  const layout = layoutById(state.layout);
  const panel = layout.panels[state.selected];
  if (!panel || document.body.classList.contains("shot-cover")) return;
  const { width, height } = info;
  preview.save();
  preview.setLineDash([10, 8]);
  preview.lineWidth = Math.max(2, width * 0.003);
  preview.strokeStyle = "#22e6ff";
  preview.shadowColor = "#22e6ff";
  preview.shadowBlur = Math.max(6, width * 0.006);
  preview.beginPath();
  panel.points.forEach(([nx, ny], i) => {
    const px = nx * width;
    const py = ny * height;
    if (i === 0) preview.moveTo(px, py);
    else preview.lineTo(px, py);
  });
  preview.closePath();
  preview.stroke();
  preview.restore();
}

/** Mirror the state into the editor panel: names, blurbs, dots, readouts. */
function syncEditorReadouts(info) {
  const layout = layoutById(state.layout);
  const grade = gradeById(state.grade);
  el("layoutName").textContent = layout.name;
  el("layoutBlurb").textContent = layout.blurb;
  el("gradeName").textContent = grade.name;
  el("gradeBlurb").textContent = grade.blurb;
  el("fileNamePreview").textContent = coverFileName(state);
  const crop = state.panels[state.selected] ?? { photo: 0, scale: 1 };
  const photoName = photos[crop.photo] ? photoNameOf(crop.photo) : "no photo";
  el("photoLabel").textContent = `Panel ${state.selected + 1} · ${photoName}`;
  el("zoomLabel").textContent = `${Math.round(crop.scale * 100)}% zoom`;
  document.querySelectorAll("#layoutDots button").forEach((b, i) => {
    b.classList.toggle("active", LAYOUTS[i].id === state.layout);
    b.setAttribute("aria-pressed", String(LAYOUTS[i].id === state.layout));
  });
  document.querySelectorAll("#gradeSwatches button").forEach((b, i) => {
    b.classList.toggle("active", GRADES[i].id === state.grade);
    b.setAttribute("aria-pressed", String(GRADES[i].id === state.grade));
  });
  document.querySelectorAll("[data-fill]").forEach((b) => {
    b.classList.toggle("active", b.dataset.fill === state.titleFill);
  });
  document.querySelectorAll("[data-size]").forEach((b) => {
    b.classList.toggle("active", b.dataset.size === state.size);
  });
  document.querySelectorAll("#panelStrip button").forEach((b, i) => {
    b.classList.toggle("active", i === state.selected);
  });
}

/** A short display name for a loaded photo, from its source path. */
function photoNameOf(index) {
  const img = photos[index];
  if (!img) return "empty";
  const src = img.currentSrc || img.src || "";
  const base = src.split("/").pop() || "upload";
  return base.replace(/\.[a-z0-9]+$/i, "");
}

/** Rebuild the panel strip buttons for the current layout's panel count. */
function rebuildPanelStrip() {
  const strip = el("panelStrip");
  strip.innerHTML = "";
  const layout = layoutById(state.layout);
  layout.panels.forEach((_, i) => {
    const button = document.createElement("button");
    button.type = "button";
    button.textContent = `P${i + 1}`;
    button.title = `Select panel ${i + 1} (Shift-click another panel to swap photos)`;
    button.addEventListener("click", () => {
      state.selected = i;
      render();
    });
    strip.appendChild(button);
  });
}

/** Switch layout, keeping crops sane for the new panel count. */
function setLayout(id) {
  const layout = layoutById(id);
  state.layout = layout.id;
  state.panels = defaultPanelCrops(layout.id, Math.max(1, photos.length));
  state.selected = 0;
  rebuildPanelStrip();
  render();
}

/** Step the layout forward or back, wrapping around the seven. */
function stepLayout(direction) {
  const index = LAYOUTS.findIndex((l) => l.id === state.layout);
  const next = (index + direction + LAYOUTS.length) % LAYOUTS.length;
  setLayout(LAYOUTS[next].id);
}

/** Step the grade forward or back, wrapping around the six. */
function stepGrade(direction) {
  const index = GRADES.findIndex((g) => g.id === state.grade);
  const next = (index + direction + GRADES.length) % GRADES.length;
  state.grade = GRADES[next].id;
  render();
}

/** Cycle the selected panel's photo through every loaded photo. */
function nextPhoto() {
  if (photos.length === 0) return;
  const crop = state.panels[state.selected];
  if (!crop) return;
  crop.photo = (crop.photo + 1) % photos.length;
  render();
}

/** Swap the photos of two panels (the Shift-click gesture). */
function swapPanelPhotos(a, b) {
  const cropA = state.panels[a];
  const cropB = state.panels[b];
  if (!cropA || !cropB || a === b) return;
  const photo = cropA.photo;
  cropA.photo = cropB.photo;
  cropB.photo = photo;
  render();
}

/** Randomise layout, grade, title fill, photos and seed — the R key. */
function randomiseCover() {
  const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
  state.layout = pick(LAYOUTS).id;
  state.grade = pick(GRADES).id;
  state.titleFill = pick(TITLE_FILLS).id;
  state.seed = Math.floor(Math.random() * 100000);
  state.panels = defaultPanelCrops(state.layout, Math.max(1, photos.length));
  state.panels.forEach((crop) => {
    crop.photo = Math.floor(Math.random() * Math.max(1, photos.length));
    crop.scale = 1 + Math.random() * 0.35;
  });
  state.selected = 0;
  rebuildPanelStrip();
  render();
}

/** Back to the studio's opening state, photos included. */
function resetCover() {
  const fresh = defaultCoverState();
  Object.assign(state, fresh, { panels: defaultPanelCrops(fresh.layout, Math.max(1, photos.length)) });
  el("titleInput").value = state.title;
  el("subtitleInput").value = state.subtitle;
  rebuildPanelStrip();
  render();
}

/** Export the current cover as a PNG named after its layout and grade. */
async function exportCurrentCover() {
  const button = el("exportBtn");
  button.disabled = true;
  button.textContent = "Rendering…";
  try {
    const { blob } = await exportCoverPng(state, photos);
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = coverFileName(state);
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 5000);
  } catch (err) {
    console.error("export failed", err);
  } finally {
    button.disabled = false;
    button.textContent = "Export PNG";
  }
}

/** Map a pointer event to cover pixels, whatever the canvas display size. */
function eventToCoverPixels(event) {
  const rect = canvas.getBoundingClientRect();
  const x = ((event.clientX - rect.left) / rect.width) * canvas.width;
  const y = ((event.clientY - rect.top) / rect.height) * canvas.height;
  return { x, y };
}

/** Pointer down: select a panel, or Shift-click to swap two panels' photos. */
function onPointerDown(event) {
  const { x, y } = eventToCoverPixels(event);
  const layout = layoutById(state.layout);
  const hit = panelAtPoint(x, y, layout, canvas.width, canvas.height);
  if (hit < 0) return;
  if (event.shiftKey && hit !== state.selected) {
    swapPanelPhotos(state.selected, hit);
    state.selected = hit;
    render();
    return;
  }
  state.selected = hit;
  const crop = state.panels[hit];
  drag = { panel: hit, startX: x, startY: y, ox: crop?.ox ?? 0, oy: crop?.oy ?? 0 };
  canvas.setPointerCapture(event.pointerId);
  render();
}

/** Pointer drag: pan the selected panel's photo inside its frame. */
function onPointerMove(event) {
  if (!drag) return;
  const { x, y } = eventToCoverPixels(event);
  const rect = canvas.getBoundingClientRect();
  const scaleX = canvas.width / rect.width;
  const crop = state.panels[drag.panel];
  if (!crop) return;
  crop.ox = drag.ox + (x - drag.startX);
  crop.oy = drag.oy + (y - drag.startY);
  void scaleX;
  render();
}

/** Pointer up ends the drag. */
function onPointerUp() {
  drag = null;
}

/** Wheel over the canvas zooms the selected panel's photo. */
function onWheel(event) {
  event.preventDefault();
  const crop = state.panels[state.selected];
  if (!crop) return;
  const factor = Math.exp(-event.deltaY * 0.0012);
  crop.scale = Math.min(3, Math.max(0.8, crop.scale * factor));
  render();
}

/** Keyboard shortcuts: R randomise, G grade, L layout, arrows nudge, 1-7 layout. */
function onKeyDown(event) {
  if (event.target && (event.target.tagName === "INPUT" || event.target.tagName === "TEXTAREA")) return;
  const key = event.key.toLowerCase();
  if (key === "r") {
    randomiseCover();
  } else if (key === "g") {
    stepGrade(1);
  } else if (key === "l") {
    stepLayout(1);
  } else if (key >= "1" && key <= "7") {
    setLayout(LAYOUTS[Number(key) - 1].id);
  } else if (key === "arrowleft" || key === "arrowright" || key === "arrowup" || key === "arrowdown") {
    const crop = state.panels[state.selected];
    if (!crop) return;
    event.preventDefault();
    const step = event.shiftKey ? 24 : 8;
    if (key === "arrowleft") crop.ox -= step;
    if (key === "arrowright") crop.ox += step;
    if (key === "arrowup") crop.oy -= step;
    if (key === "arrowdown") crop.oy += step;
    render();
  } else if (key === "+" || key === "=") {
    const crop = state.panels[state.selected];
    if (crop) {
      crop.scale = Math.min(3, crop.scale * 1.1);
      render();
    }
  } else if (key === "-") {
    const crop = state.panels[state.selected];
    if (crop) {
      crop.scale = Math.max(0.8, crop.scale / 1.1);
      render();
    }
  }
}

/** A photo picked from the person's machine joins the studio's photos. */
async function onUploadPicked(event) {
  const file = event.target.files && event.target.files[0];
  if (!file) return;
  const url = URL.createObjectURL(file);
  const img = await loadImage(url);
  if (img) {
    photos.push(img);
    const crop = state.panels[state.selected];
    if (crop) crop.photo = photos.length - 1;
    render();
  }
  event.target.value = "";
}

/** Wire every control in the editor panel to the state it drives. */
function wireEditorControls() {
  el("layoutPrev").addEventListener("click", () => stepLayout(-1));
  el("layoutNext").addEventListener("click", () => stepLayout(1));
  el("gradePrev").addEventListener("click", () => stepGrade(-1));
  el("gradeNext").addEventListener("click", () => stepGrade(1));
  el("randomizeBtn").addEventListener("click", randomiseCover);
  el("resetBtn").addEventListener("click", resetCover);
  el("exportBtn").addEventListener("click", exportCurrentCover);
  el("nextPhotoBtn").addEventListener("click", nextPhoto);
  el("uploadBtn").addEventListener("click", () => el("uploadInput").click());
  el("uploadInput").addEventListener("change", onUploadPicked);
  el("titleInput").addEventListener("input", (e) => {
    state.title = e.target.value;
    render();
  });
  el("subtitleInput").addEventListener("input", (e) => {
    state.subtitle = e.target.value;
    render();
  });
  document.querySelectorAll("#layoutDots button").forEach((b, i) => {
    b.addEventListener("click", () => setLayout(LAYOUTS[i].id));
  });
  document.querySelectorAll("#gradeSwatches button").forEach((b, i) => {
    b.addEventListener("click", () => {
      state.grade = GRADES[i].id;
      render();
    });
  });
  document.querySelectorAll("[data-fill]").forEach((b) => {
    b.addEventListener("click", () => {
      state.titleFill = b.dataset.fill;
      render();
    });
  });
  document.querySelectorAll("[data-size]").forEach((b) => {
    b.addEventListener("click", () => {
      state.size = b.dataset.size;
      render();
    });
  });
  canvas.addEventListener("pointerdown", onPointerDown);
  canvas.addEventListener("pointermove", onPointerMove);
  canvas.addEventListener("pointerup", onPointerUp);
  canvas.addEventListener("pointercancel", onPointerUp);
  canvas.addEventListener("wheel", onWheel, { passive: false });
  window.addEventListener("keydown", onKeyDown);
}

/** Apply a ?shot= scene: layout, grade, size, caption, cover-only chrome. */
function applyShotScene() {
  const scene = shotSceneFromUrl(window.location.search);
  if (!scene) return;
  state.layout = scene.layout;
  state.grade = scene.grade;
  state.size = scene.size;
  state.title = scene.title;
  state.subtitle = scene.subtitle;
  state.titleFill = scene.titleFill;
  state.panels = defaultPanelCrops(scene.layout, Math.max(1, photos.length));
  el("titleInput").value = state.title;
  el("subtitleInput").value = state.subtitle;
  if (scene.coverOnly) document.body.classList.add("shot-cover");
  document.title = `Palm Sunset — ${scene.id}`;
}

/** Boot: fonts, photos, controls, scene, first paint. */
async function bootStudio() {
  wireEditorControls();
  rebuildPanelStrip();
  el("titleInput").value = state.title;
  el("subtitleInput").value = state.subtitle;
  const loaded = await Promise.all(SAMPLE_PHOTOS.map((src) => loadImage(src)));
  photos = loaded.filter(Boolean);
  if (photos.length === 0) {
    const placeholder = new Image();
    photos = [placeholder];
  }
  applyShotScene();
  rebuildPanelStrip();
  try {
    await Promise.all([
      document.fonts.load("900 100px Anton"),
      document.fonts.load("400 60px Pacifico"),
      document.fonts.load("400 40px 'Bebas Neue'"),
    ]);
  } catch {
    /* The canvas falls back to system sans when a font is missing. */
  }
  render();
  document.fonts.ready.then(() => render()).catch(() => {});
}

bootStudio();
