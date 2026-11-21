// A tiny static server for app/ (Node 22, standard library only), so the
// cover maker can be tried locally without a build step: `node serve.ts`
// serves app/ on http://localhost:8080 (or --port <n>). It sends the MIME
// types an offline web app needs — HTML, modules, CSS, sample photos and
// the vendored TTF fonts — refuses any path outside app/, and otherwise
// does nothing clever: a development convenience, not a web server for the
// internet. Palm Sunset Cover Studio's editor loads its fonts and samples
// from these same routes, so a 404 here shows up at once as a missing font
// or a blank panel while testing.
import { createReadStream, statSync } from 'node:fs';
import { createServer } from 'node:http';
import { extname, join, normalize, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const appRoot = resolve(fileURLToPath(new URL('./app', import.meta.url)));

const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.avif': 'image/avif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
  '.woff': 'font/woff',
  '.ttf': 'font/ttf',
  '.otf': 'font/otf',
  '.bin': 'application/octet-stream',
  '.wasm': 'application/wasm',
  '.wav': 'audio/wav',
  '.mp3': 'audio/mpeg',
  '.ogg': 'audio/ogg',
  '.txt': 'text/plain; charset=utf-8',
};

/** Resolves a request path inside app/, or null when it escapes the root. */
function resolveInApp(pathname) {
  const candidate = resolve(join(appRoot, normalize(pathname)));
  if (candidate === appRoot) return candidate;
  return candidate.startsWith(appRoot + sep) ? candidate : null;
}

function pickPort() {
  const flag = process.argv.indexOf('--port');
  const wanted = flag === -1 ? 8080 : Number(process.argv[flag + 1]);
  return Number.isInteger(wanted) && wanted > 0 && wanted < 65536 ? wanted : 8080;
}

const server = createServer((request, response) => {
  const url = new URL(request.url ?? '/', 'http://localhost');
  let pathname;
  try {
    pathname = decodeURIComponent(url.pathname);
  } catch {
    response.writeHead(400).end('bad request');
    return;
  }
  if (pathname.endsWith('/')) pathname += 'index.html';
  const file = resolveInApp(pathname);
  if (file === null) {
    response.writeHead(403).end('forbidden');
    return;
  }
  let size;
  try {
    const stats = statSync(file);
    if (!stats.isFile()) throw new Error('not a file');
    size = stats.size;
  } catch {
    response.writeHead(404).end('not found');
    return;
  }
  const rel = relative(appRoot, file);
  response.writeHead(200, {
    'content-type': TYPES[extname(file).toLowerCase()] ?? 'application/octet-stream',
    'content-length': size,
    'cache-control': 'no-store',
  });
  createReadStream(join(appRoot, rel)).pipe(response);
});

server.listen(pickPort(), '127.0.0.1', () => {
  console.log(`app/ is on http://localhost:${pickPort()}`);
});
