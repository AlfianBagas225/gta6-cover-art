// Fixed scenes for screenshots (round 2): ?shot=cover shows one exported
// cover full frame (the app's own drawing, at the size the query names),
// ?shot=editor shows the editor with a photo loaded. `photo` picks a sample
// (samples/<photo>.jpg) or `both`; `caption` and `subtitle` the words;
// `layout`, `grade`, `size` (WxH) and `stars` shape the cover.
// window.__shotReady is set once the cover is painted and the fonts are in.
import { EXPORT_SIZES } from './cover.js';

const SAMPLES = { boulevard: 'samples/boulevard.jpg', pier: 'samples/pier.jpg' };

/** Waits until the vendored display fonts can actually draw on canvas. */
async function fontsReady() {
  try {
    await Promise.all([
      document.fonts.load('100px Anton'),
      document.fonts.load('100px Pacifico'),
      document.fonts.load('100px "Bebas Neue"'),
      document.fonts.ready,
    ]);
  } catch { /* fall back to system fonts if a vendored one fails to load */ }
}

function shotReady() {
  requestAnimationFrame(() => requestAnimationFrame(() => { window.__shotReady = true; }));
}

export async function runShot(shot, query, api) {
  const { state, photos } = api;
  const want = (query.get('photo') ?? 'both').toLowerCase();
  const names = want === 'both' ? ['boulevard', 'pier'] : [SAMPLES[want] ? want : 'pier'];
  for (const name of names) {
    try {
      photos.push({ img: await api.loadImage(SAMPLES[name]), name: `${name}.jpg` });
    } catch { /* a missing sample leaves the library smaller */ }
  }
  if (!photos.length) {
    try { await api.loadSamples(); } catch { /* nothing to draw with */ }
  }

  state.layout = query.get('layout') ?? 'hero-trio';
  state.grade = query.get('grade') ?? 'sunset';
  state.title = query.get('caption') ?? 'NEON SHORE';
  state.subtitle = query.get('subtitle') ?? 'a vice coast story';
  state.titleFont = query.get('titleFont') ?? 'anton';
  state.titlePos = query.get('titlePos') ?? 'bottom';
  state.titleGradient = query.get('titleGradient') !== '0';
  state.frame = query.get('frame') !== '0';
  state.grain = query.get('grain') !== '0';
  state.vignette = query.get('vignette') !== '0';
  state.badge = query.get('badge') !== '0';
  state.stars = Number(query.get('stars') ?? '5');

  if (shot === 'cover') {
    document.body.classList.add('shot-cover');
    const size = query.get('size') ?? '1920x1080';
    const [w, h] = size.split('x').map(Number);
    const known = EXPORT_SIZES.find((s) => s.w === w && s.h === h);
    api.setExportSize(known ?? { id: 'shot', label: `Shot ${w} x ${h}`, w, h });
  }

  await fontsReady();
  api.redraw();
  api.say('Screenshot scene ready.');
  shotReady();
}
