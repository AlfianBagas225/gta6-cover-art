// Fixed scenes for screenshots: ?shot=cover shows one exported cover full
// frame (the app's own drawing, at the size the query names), ?shot=editor
// shows the editor with a photo loaded. The query picks the sample photo
// (or both), the layout, the grade, the size and the words, and
// window.__shotReady is set once the cover is painted and the fonts are in.
// A layout or grade the query names that does not exist falls back to the
// defaults with a warning, so a typo in a shot scene never paints a blank.
import { COVER_LAYOUTS, COLOR_GRADES, EXPORT_PRESETS } from './cover.js';

const SCENE_SAMPLES = { boulevard: 'samples/boulevard.jpg', pier: 'samples/pier.jpg' };

/** Waits until the vendored display fonts can actually draw on canvas. */
async function ensureFonts() {
  try {
    await Promise.all([
      document.fonts.load('100px Anton'),
      document.fonts.load('100px Pacifico'),
      document.fonts.load('100px "Bebas Neue"'),
      document.fonts.ready,
    ]);
  } catch { /* fall back to system fonts if a vendored one fails to load */ }
}

function flagReady() {
  requestAnimationFrame(() => requestAnimationFrame(() => { window.__shotReady = true; }));
}

/** Applies a query-string scene onto the editor state, then paints it. */
export async function stageShot(kind, params, api) {
  const { state, library } = api;
  const want = (params.get('photo') ?? 'both').toLowerCase();
  const picks = want === 'both' ? ['boulevard', 'pier'] : [SCENE_SAMPLES[want] ? want : 'pier'];
  for (const name of picks) {
    try {
      library.push({ img: await api.loadImage(SCENE_SAMPLES[name]), name: `${name}.jpg` });
    } catch { /* a missing sample leaves the library smaller */ }
  }
  if (!library.length) {
    try { await api.loadSamples(); } catch { /* nothing to draw with */ }
  }

  // Each query key maps onto one piece of state; a key that is absent keeps
  // the default, and a toggle is on unless the query says '0'. A layout or
  // grade name that is not in the painter's tables falls back to the
  // defaults instead of painting nothing.
  const text = (key, fallback) => params.get(key) ?? fallback;
  const on = (key) => params.get(key) !== '0';
  const layoutKey = text('layout', 'hero-trio');
  const gradeKey = text('grade', 'sunset');
  if (!COVER_LAYOUTS[layoutKey]) console.warn(`shot: unknown layout "${layoutKey}", using hero-trio`);
  if (!COLOR_GRADES[gradeKey]) console.warn(`shot: unknown grade "${gradeKey}", using sunset`);
  state.layout = COVER_LAYOUTS[layoutKey] ? layoutKey : 'hero-trio';
  state.grade = COLOR_GRADES[gradeKey] ? gradeKey : 'sunset';
  state.title = text('caption', 'NEON SHORE');
  state.subtitle = text('subtitle', 'a vice coast story');
  state.titleFace = text('titleFont', 'anton');
  const fill = text('titleFill', 'gradient');
  state.titleStyle = ['gradient', 'solid', 'outline'].includes(fill) ? fill : 'gradient';
  state.titleSpot = text('titlePos', 'bottom');
  state.titleSunset = on('titleGradient');
  state.showFrames = on('frame');
  state.showGrain = on('grain');
  state.showVignette = on('vignette');
  state.showBadge = on('badge');
  state.stars = Number(params.get('stars') ?? '5');

  if (kind === 'cover') {
    document.body.classList.add('shot-mode');
    const size = params.get('size') ?? '1920x1080';
    const [w, h] = size.split('x').map(Number);
    const known = EXPORT_PRESETS.find((p) => p.w === w && p.h === h);
    api.setPreviewSize(known ?? { key: 'shot', name: `Shot ${w} x ${h}`, w, h });
  }

  await ensureFonts();
  api.repaint();
  api.announce('Screenshot scene ready.');
  flagReady();
}
