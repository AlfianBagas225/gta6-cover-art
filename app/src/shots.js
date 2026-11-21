/**
 * shots.js — the screenshot scenes of Palm Sunset Cover Studio.
 *
 * A scene is one reproducible view of the app: the cover size it draws, the
 * layout and grade it shows, the caption it carries, and whether the editor
 * chrome is visible. The four scenes below are exactly the four screenshots
 * the entry hands in, in the same order:
 *
 *   01 — the exported landscape cover, full frame;
 *   02 — the editor at work, a photo loaded, panels and controls visible;
 *   03 — the exported portrait cover, full frame;
 *   04 — the exported square cover, full frame.
 *
 * Open any scene in a browser with its query string, for example
 *   /?shot=cover-landscape
 * and the app applies the scene before its first paint. The headless
 * screenshot pass uses the same URLs, so a screenshot is always a capture
 * of the app running, never a composed picture.
 */

/** The four scenes, in screenshot order. */
export const SHOT_SCENES = [
  {
    id: "cover-landscape",
    file: "01-cover-landscape.jpg",
    size: "landscape",
    layout: "classic",
    grade: "sunset",
    title: "PALM SUNSET",
    subtitle: "Neon Shore",
    titleFill: "gradient",
    coverOnly: true,
    blurb: "The exported landscape cover, full frame.",
  },
  {
    id: "editor",
    file: "02-editor.jpg",
    size: "portrait",
    layout: "grid",
    grade: "vice",
    title: "PALM SUNSET",
    subtitle: "Neon Shore",
    titleFill: "gradient",
    coverOnly: false,
    blurb: "The editor with a photo loaded, four panels and the controls.",
  },
  {
    id: "cover-portrait",
    file: "03-cover-portrait.jpg",
    size: "portrait",
    layout: "trio",
    grade: "sunset",
    title: "PALM SUNSET",
    subtitle: "Neon Shore",
    titleFill: "solid",
    coverOnly: true,
    blurb: "The exported portrait cover, full frame.",
  },
  {
    id: "cover-square",
    file: "04-cover-square.jpg",
    size: "square",
    layout: "neon-grid",
    grade: "vice",
    title: "PALM SUNSET",
    subtitle: "Neon Shore",
    titleFill: "outline",
    coverOnly: true,
    blurb: "The exported square cover, full frame, neon grid lit.",
  },
];

/** Look a scene up by its shot id, falling back to the landscape cover. */
export function shotSceneById(id) {
  return SHOT_SCENES.find((s) => s.id === id) ?? SHOT_SCENES[0];
}

/**
 * Read the scene from the page's query string. Unknown or missing values
 * fall back to the defaults, so a plain / still opens the studio.
 */
export function shotSceneFromUrl(search) {
  const params = new URLSearchParams(search || "");
  const shot = params.get("shot");
  if (!shot) return null;
  const scene = shotSceneById(shot);
  const layout = params.get("layout");
  const grade = params.get("grade");
  const size = params.get("size");
  const title = params.get("title");
  return {
    ...scene,
    layout: layout || scene.layout,
    grade: grade || scene.grade,
    size: size || scene.size,
    title: title || scene.title,
  };
}

/** The viewport a scene wants, in CSS pixels, for the screenshot pass. */
export function shotViewport(scene) {
  if (scene.id === "cover-landscape") return { width: 1280, height: 720 };
  if (scene.id === "editor") return { width: 1280, height: 800 };
  if (scene.id === "cover-portrait") return { width: 1024, height: 1280 };
  return { width: 1080, height: 1080 };
}
