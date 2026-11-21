/**
 * Palm Sunset Cover Studio — dev server (serve.ts).
 *
 * Serves the app/ directory over plain HTTP so a desktop browser can open
 * app/index.html, load its vendored fonts and sample photos, and export
 * covers — all offline, no network request leaves the machine. This server
 * is a development convenience only: the handed-in app is static files, and
 * any static file server (or the competition's own hosting) serves it the
 * same way.
 *
 *   node serve.ts            # serves http://127.0.0.1:8137/
 *   PORT=8080 node serve.ts  # pick another port
 *
 * The server only ever reads files under app/. A request that climbs out of
 * app/ (../ and friends) gets a 403 instead of a file.
 */

import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { existsSync, lstatSync, readFileSync } from "node:fs";
import { dirname, extname, join, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

/** The port, from $PORT when set, else the studio's own default. */
const LISTEN_PORT = Number.parseInt(process.env.PORT ?? "8137", 10) || 8137;

/** The directory this file lives in is the repository root. */
const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)));

/** The only directory this server will ever read from. */
const APP_ROOT = join(REPO_ROOT, "app");

/** Content types for the file kinds the app serves. */
const MIME_BY_EXTENSION: Record<string, string> = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".gif": "image/gif",
  ".svg": "image/svg+xml",
  ".ttf": "font/ttf",
  ".otf": "font/otf",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
  ".txt": "text/plain; charset=utf-8",
};

/** Fallback content type for anything the table does not name. */
const FALLBACK_MIME = "application/octet-stream";

/** Look up the content type for a file path, falling back to octet-stream. */
function mimeFor(path: string): string {
  return MIME_BY_EXTENSION[extname(path).toLowerCase()] ?? FALLBACK_MIME;
}

/**
 * Resolve a request path to a file under app/, or null when the request is
 * not a file we serve. "/" maps to index.html; a directory maps to its own
 * index.html; anything climbing out of app/ is refused.
 */
function resolveRequestPath(requestPath: string): string | null {
  const clean = requestPath.split("?")[0]?.split("#")[0] ?? "/";
  const decoded = decodeURIComponent(clean);
  const joined = resolve(APP_ROOT, `.${sep}${decoded}`);
  if (joined !== APP_ROOT && !joined.startsWith(`${APP_ROOT}${sep}`)) return null;
  if (existsSync(joined) && lstatSync(joined).isDirectory()) {
    const index = join(joined, "index.html");
    return existsSync(index) ? index : null;
  }
  return existsSync(joined) && lstatSync(joined).isFile() ? joined : null;
}

/** One-line access log: method, path, status, bytes. */
function logAccess(method: string, path: string, status: number, bytes: number): void {
  const stamp = new Date().toISOString().slice(11, 19);
  console.log(`${stamp} ${method} ${path} -> ${status} (${bytes} B)`);
}

/** Answer one request: the file, or a short plain-text error. */
function handleRequest(req: IncomingMessage, res: ServerResponse): void {
  const method = req.method ?? "GET";
  const rawPath = req.url ?? "/";
  if (method !== "GET" && method !== "HEAD") {
    res.writeHead(405, { "content-type": "text/plain; charset=utf-8" });
    res.end("method not allowed\n");
    logAccess(method, rawPath, 405, 0);
    return;
  }
  const file = resolveRequestPath(rawPath);
  if (file === null) {
    const body = "not found\n";
    res.writeHead(404, { "content-type": "text/plain; charset=utf-8" });
    res.end(body);
    logAccess(method, rawPath, 404, body.length);
    return;
  }
  const body = readFileSync(file);
  res.writeHead(200, {
    "content-type": mimeFor(file),
    "content-length": body.length,
    "cache-control": "no-store",
  });
  res.end(method === "HEAD" ? undefined : body);
  logAccess(method, rawPath, 200, body.length);
}

/** Start listening and print the address to open. */
function startServer(): void {
  const server = createServer(handleRequest);
  server.on("error", (err: Error) => {
    console.error(`serve.ts: cannot listen on port ${LISTEN_PORT}: ${err.message}`);
    process.exit(1);
  });
  server.listen(LISTEN_PORT, "127.0.0.1", () => {
    console.log(`Palm Sunset Cover Studio — dev server`);
    console.log(`  app:   http://127.0.0.1:${LISTEN_PORT}/`);
    console.log(`  shots: http://127.0.0.1:${LISTEN_PORT}/?shot=cover-landscape`);
    console.log(`  stop:  Ctrl+C`);
  });
}

startServer();
