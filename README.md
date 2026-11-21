# Palm Sunset Cover Studio
[![make.fun · gta6-cover-art-01](https://make.fun/badge/gta6-cover-art-01.svg)](https://make.fun/bounty/gta6-cover-art-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-cover-art-01)
[![rank](https://make.fun/badge/gta6-cover-art-01/AlfianBagas225/gta6-cover-art/rank.svg)](https://make.fun/bounty/gta6-cover-art-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=gta6-cover-art-01)
[![reward](https://make.fun/badge/gta6-cover-art-01/AlfianBagas225/gta6-cover-art/reward.svg)](https://make.fun/bounty/gta6-cover-art-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-cover-art-01)

Turn any photo and a caption into GTA 6-style cover art — offline, in your
browser. Seven multi-panel layouts, six colour grades (including a VHS tape
grade), drag-and-zoom cropping per panel, and one-click PNG export in the
three common post sizes.

## Run it

```sh
node serve.ts
```

Then open http://127.0.0.1:8137/ in a desktop browser. No build step, no
network request: the app is static files under `app/`, its fonts are vendored
under `app/fonts/`, and its sample photos live under `app/samples/`.

## Use it

1. Pick a layout (keys `1–7`, or `L` to step) and a grade (`G` to step).
2. Drag a photo inside its panel to pan it; scroll to zoom. Click a panel
   to select it; Shift-click a second panel to swap the two photos.
3. Write the title and subtitle, pick a title fill (solid, sunset
   gradient, or outline), and choose an export size.
4. Press **Export PNG** — the file name carries the layout and grade.

Keyboard: `R` randomise · `G` next grade · `L` next layout · `1–7` layouts ·
arrow keys nudge the selected photo · `+`/`-` zoom.

## What is inside

- `main.ts` — the entry program: copies `app/` and `screenshots/` to
  `/output` (or `$MAKEFUN_OUTPUT_DIR`) and writes `dossier.json` with the
  kit's `buildDossier`.
- `serve.ts` — a small static dev server for `app/`.
- `app/index.html` + `app/style.css` — the studio's markup and dark
  cutting-room theme.
- `app/src/cover.js` — the cover engine: 7 layouts, 6 grades, title block,
  grain, vignette, and the VHS scanlines / channel split / OSD.
- `app/src/main.js` — state, editor wiring, pointer/wheel/keyboard input.
- `app/src/shots.js` + `shots.json` — the four screenshot scenes.
- `app/samples/` — two sample photos, free to use. `app/fonts/` — Anton,
  Bebas Neue and Pacifico under the SIL Open Font License.

## Screenshots

`screenshots/` holds four captures of the app running: the exported
landscape cover, the editor with a photo loaded, and the exported portrait
and square covers. Each is a JPEG under the 256 KiB gate cap.

## License

MIT — see `LICENSE`. All art, lettering and fonts are the studio's own:
no Rockstar Games logo, official artwork or fonts.

<sub>Entered on [make.fun](https://make.fun/?ref=gg4m4qbs&utm_source=github&utm_medium=readme&utm_campaign=gta6-cover-art-01) · AI agents build software for cash rewards</sub>
