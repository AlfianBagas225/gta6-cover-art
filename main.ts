// Palm Sunset Cover Studio — a gta6-cover-art-01 entry (Node 22,
// standard library only). The app is this directory's app/ folder: plain
// static files a desktop browser loads offline (app/index.html and its ES
// modules, the Anton / Pacifico / Bebas Neue fonts vendored under
// app/fonts/, no library and no network request). This program hands the
// app in: it copies app/ and screenshots/ from beside this file into the
// output directory and writes output/dossier.json, the summary the judge
// reads, with the vendored make.fun library. The cover maker itself lives
// in app/src/cover.js (seven multi-panel compositions — the newest is
// Neon Grid, with the title slotted into the middle row — six colour
// grades including a retro VHS treatment with scanlines, a channel split
// and tracking bands, gradient poster lettering, grain and vignette) and
// app/src/main.js (the editor: photos in, panels dragged and zoomed,
// Shift-click to swap two panels, a Randomize button that shuffles the
// layout, grade, title spot, title font and caption in one click, PNG
// out in 1080 x 1080, 1080 x 1350 and 1920 x 1080). The four screenshots
// in screenshots/ are the app's own drawings — a landscape exported cover
// first (the new Neon Grid in the VHS grade), then the editor with a
// photo loaded, a portrait cover and a square cover. The lettering is
// polished so the title and subtitle still read at ~300 px wide (bigger
// title, outlined subtitle, deeper scrim).
//
// Serve it locally with `node serve.ts`, then open http://localhost:8080.
// Outside the grader's container, MAKEFUN_OUTPUT_DIR stands in for /output:
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts

import { cpSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-app.ts';

const TITLE = 'Palm Sunset Cover Studio';

function fail(message) {
  throw new Error(`${TITLE}: ${message}`);
}

function main() {
  const here = fileURLToPath(new URL('.', import.meta.url));
  const out = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';
  const appDir = join(here, 'app');
  const shotsDir = join(here, 'screenshots');
  if (!existsSync(appDir)) fail('app/ is missing from the repository');
  if (!existsSync(shotsDir)) fail('screenshots/ is missing from the repository');

  mkdirSync(out, { recursive: true });
  cpSync(appDir, join(out, 'app'), { recursive: true });
  cpSync(shotsDir, join(out, 'screenshots'), { recursive: true });

  // The scorer's own caps (reference/gate.json): only text_max_bytes shapes
  // the bytes; the others refuse an entry the scorer would refuse (more
  // than 4 screenshots or one over 256 KiB; more than 993 files in app/ or
  // 48 MiB of app files, in all, or a path under app/ over 1000 bytes:
  // app/ counts beside /output's own 1000-entry cap, its screenshots/ and
  // dossier.json).
  writeFileSync(
    join(out, 'dossier.json'),
    buildDossier(out, {
      text_max_bytes: 163840,
      screenshots: { max: 4, max_bytes: 262144 },
      app_max_files: 993,
      app_max_bytes: 50331648,
      app_path_max_bytes: 1000,
    }),
  );
}

main();
