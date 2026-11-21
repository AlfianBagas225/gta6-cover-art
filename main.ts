/**
 * Palm Sunset Cover Studio — entry program (main.ts).
 *
 * This program hands the cover-art web app in to make.fun. It is the only
 * file the competition's Node 22 runtime executes for this entry, and it does
 * exactly three things:
 *
 *   1. copies the app's static files (app/) into the output directory,
 *   2. copies the entry's screenshots (screenshots/) into the output directory,
 *   3. writes /output/dossier.json with buildDossier from vendor/makefun-app.ts,
 *      the kit's own library, byte for byte the scorer's copy.
 *
 * The output directory is /output inside the grader, and $MAKEFUN_OUTPUT_DIR
 * anywhere else (local runs, the pre-submit check, the dossier hash check).
 * The program never touches the network and never writes outside the output
 * directory. It exits non-zero with a plain message when anything is missing,
 * so a failed handoff is loud instead of silent.
 *
 * Run it locally:
 *   MAKEFUN_OUTPUT_DIR=/tmp/pso-out node main.ts
 *
 * Run the dev server instead (serves app/ for a browser):
 *   node serve.ts
 */

import { buildDossier } from "./vendor/makefun-app.ts";
import {
  cpSync,
  existsSync,
  lstatSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { createHash } from "node:crypto";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

/** Dossier text cap from the competition's gate: 160 KiB of source text. */
const DOSSIER_TEXT_MAX_BYTES = 163_840;

/** Screenshots the gate allows: at most 4 images, at most 256 KiB each. */
const SCREENSHOT_LIMITS = { max: 4, max_bytes: 262_144 } as const;

/** app/ caps from the competition's gate: files, total bytes, path bytes. */
const APP_LIMITS = {
  app_max_files: 993,
  app_max_bytes: 48 * 1024 * 1024,
  app_path_max_bytes: 1000,
} as const;

/** The directory this file lives in is the repository root. */
function repoRootDir(): string {
  return resolve(dirname(fileURLToPath(import.meta.url)));
}

/**
 * Where the handoff goes: $MAKEFUN_OUTPUT_DIR when set (local runs), else
 * the grader's /output. Always resolved to an absolute path.
 */
function outputDir(): string {
  const raw = process.env.MAKEFUN_OUTPUT_DIR ?? "/output";
  return resolve(raw);
}

/** SHA-256 of a file, hex, for the run summary and the hash check. */
function sha256HexOf(path: string): string {
  return createHash("sha256").update(readFileSync(path)).digest("hex");
}

/** Human-readable byte counts for the summary lines. */
function formatByteCount(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KiB`;
  return `${(n / (1024 * 1024)).toFixed(2)} MiB`;
}

/** Count the plain files under a directory, recursively, for the summary. */
function countPlainFiles(dir: string): number {
  let total = 0;
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) total += countPlainFiles(full);
    else if (entry.isFile()) total += 1;
  }
  return total;
}

/** Total bytes of the plain files under a directory, recursively. */
function sumPlainFileBytes(dir: string): number {
  let total = 0;
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) total += sumPlainFileBytes(full);
    else if (entry.isFile()) total += lstatSync(full).size;
  }
  return total;
}

/**
 * Fail loudly: print the problem on stderr and exit non-zero. A handoff that
 * cannot complete must never look like it did.
 */
function fail(message: string): never {
  console.error(`main.ts: ${message}`);
  process.exit(1);
}

/** The repository must hand in an app/ and a screenshots/ directory. */
function requireHandinDirs(root: string): { appDir: string; shotsDir: string } {
  const appDir = join(root, "app");
  const shotsDir = join(root, "screenshots");
  if (!existsSync(appDir) || !lstatSync(appDir).isDirectory()) {
    fail(`no app/ directory in ${root}: the entry hands in its web app as app/`);
  }
  if (!existsSync(join(appDir, "index.html"))) {
    fail(`app/index.html is missing: the app must open from app/index.html`);
  }
  if (!existsSync(shotsDir) || !lstatSync(shotsDir).isDirectory()) {
    fail(`no screenshots/ directory in ${root}: hand in 3 or 4 renders of the app`);
  }
  const shots = readdirSync(shotsDir, { withFileTypes: true }).filter(
    (e) => e.isFile() && !e.name.startsWith("."),
  );
  if (shots.length < 3 || shots.length > 4) {
    fail(`screenshots/ holds ${shots.length} images: the gate wants 3 or 4`);
  }
  for (const shot of shots) {
    const size = lstatSync(join(shotsDir, shot.name)).size;
    if (size > SCREENSHOT_LIMITS.max_bytes) {
      fail(`screenshots/${shot.name} is ${size} bytes, over the 256 KiB cap`);
    }
  }
  return { appDir, shotsDir };
}

/** Copy a directory tree, wiping the destination first so stale files die. */
function copyFresh(source: string, destination: string): void {
  rmSync(destination, { recursive: true, force: true });
  mkdirSync(destination, { recursive: true });
  cpSync(source, destination, { recursive: true });
}

/**
 * Build the dossier from the output directory (the exact files the gate will
 * read back) and write it as /output/dossier.json. Returns its byte length.
 */
function writeDossierFile(out: string): number {
  const dossier = buildDossier(out, {
    text_max_bytes: DOSSIER_TEXT_MAX_BYTES,
    screenshots: { ...SCREENSHOT_LIMITS },
    ...APP_LIMITS,
  });
  const dossierPath = join(out, "dossier.json");
  writeFileSync(dossierPath, dossier);
  return dossier.length;
}

/** Rebuild the dossier in memory and confirm the written file matches it. */
function verifyWrittenDossier(out: string): void {
  const again = buildDossier(out, {
    text_max_bytes: DOSSIER_TEXT_MAX_BYTES,
    screenshots: { ...SCREENSHOT_LIMITS },
    ...APP_LIMITS,
  });
  const written = readFileSync(join(out, "dossier.json"));
  if (!written.equals(Buffer.from(again))) {
    fail("dossier.json does not match a fresh buildDossier run: not deterministic");
  }
}

/** The handoff: copy, build the dossier, verify it, and print the summary. */
function handInEntry(): void {
  const root = repoRootDir();
  const out = outputDir();
  const startedAt = Date.now();

  const { appDir, shotsDir } = requireHandinDirs(root);
  const appFiles = countPlainFiles(appDir);
  const appBytes = sumPlainFileBytes(appDir);
  const shotNames = readdirSync(shotsDir, { withFileTypes: true })
    .filter((e) => e.isFile() && !e.name.startsWith("."))
    .map((e) => e.name)
    .sort();

  mkdirSync(out, { recursive: true });
  copyFresh(appDir, join(out, "app"));
  copyFresh(shotsDir, join(out, "screenshots"));
  const dossierBytes = writeDossierFile(out);
  verifyWrittenDossier(out);

  const dossierPath = join(out, "dossier.json");
  const dossierHash = sha256HexOf(dossierPath);
  const elapsedMs = Date.now() - startedAt;

  console.log("Palm Sunset Cover Studio — handoff complete");
  console.log(`  repo:        ${root}`);
  console.log(`  output:      ${out}`);
  console.log(`  app:         ${appFiles} files, ${formatByteCount(appBytes)}`);
  console.log(`  screenshots: ${shotNames.length} (${shotNames.join(", ")})`);
  console.log(`  dossier:     ${formatByteCount(dossierBytes)} bytes`);
  console.log(`  dossier sha256: ${dossierHash}`);
  console.log(`  elapsed:     ${elapsedMs} ms`);
}

handInEntry();
