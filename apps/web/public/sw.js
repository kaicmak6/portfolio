// Served straight from `public/`, so this is plain script: no imports, no build step.
const SHELL = 'pwa-v1';
const RUNTIME = 'pwa-runtime-v1';
const MAX_RUNTIME_ENTRIES = 60;
const IMMUTABLE = ['/_next/static/', '/fonts/', '/ops/'];
// Mirrors the manifest `short_name`: the offline document is built with no
// network, so it cannot read the manifest to find it.
const APP_NAME = 'Kaius Mak';
// The app is mounted at a sub-path while the host also serves the apex, so both
// the URL and the cache names are scoped to the directory this worker came from.
const BASE = new URL(globalThis.registration.scope).pathname.replace(/\/+$/, '');

globalThis.addEventListener('install', () => globalThis.skipWaiting());

globalThis.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const names = await caches.keys();
    await Promise.all(names
      .filter(name => name.startsWith('pwa-') && name !== SHELL && name !== RUNTIME)
      .map(name => caches.delete(name)));
    await globalThis.clients.claim();
  })());
});

globalThis.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') {
    return;
  }
  const url = new URL(request.url);
  if (url.origin !== globalThis.location.origin) {
    return;
  }
  const path = url.pathname;
  if (path.includes('/api/') || path.includes('/health')) {
    return;
  }
  if (BASE && path !== BASE && !path.startsWith(`${BASE}/`)) {
    return;
  }
  if (request.mode === 'navigate') {
    // A document served from cache after a deploy is the worst thing this worker
    // can do, so navigation always asks the network first.
    event.respondWith(networkFirst(request));
    return;
  }
  if (IMMUTABLE.some(prefix => path.includes(prefix))) {
    event.respondWith(cacheFirst(request));
    return;
  }
  // Images — `/_next/image` and the image files themselves — and everything else
  // same-origin: show the cached copy and refresh behind it.
  event.respondWith(staleWhileRevalidate(event, request));
});

async function networkFirst(request) {
  try {
    const response = await fetch(request);
    if (response.ok) {
      await storeInRuntime(request, response.clone());
    }
    return response;
  } catch {
    const cached = await caches.match(request, { ignoreSearch: true });
    return cached ?? offlineDocument();
  }
}

async function cacheFirst(request) {
  const cache = await caches.open(SHELL);
  const cached = await cache.match(request);
  if (cached) {
    return cached;
  }
  const response = await fetch(request);
  if (response.ok) {
    await cache.put(request, response.clone());
  }
  return response;
}

function staleWhileRevalidate(event, request) {
  const network = fetch(request)
    .then(async (response) => {
      if (response.ok) {
        await storeInRuntime(request, response.clone());
      }
      return response;
    })
    .catch(() => undefined);
  // The page already has the cached copy, so the refresh has to be held open
  // explicitly or the worker is stopped before it lands.
  event.waitUntil(network);
  return caches.match(request)
    .then(cached => cached ?? network.then(fresh => fresh ?? offlineMissing()));
}

function offlineMissing() {
  return new Response('', { status: 504, statusText: 'Offline' });
}

// The runtime cache holds documents and revalidated assets, so it is the one that
// grows with browsing. `keys()` is insertion order, so the oldest go first.
async function storeInRuntime(request, response) {
  const cache = await caches.open(RUNTIME);
  await cache.put(request, response);
  const keys = await cache.keys();
  for (const key of keys.slice(0, Math.max(0, keys.length - MAX_RUNTIME_ENTRIES))) {
    await cache.delete(key);
  }
}

function offlineDocument() {
  const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${APP_NAME}</title>
<style>body{margin:0;min-height:100vh;display:grid;place-content:center;gap:12px;padding:24px;background:#f0f5fa;color:#001b3f;font:16px/1.5 system-ui,sans-serif}button{font:inherit;padding:8px 16px;color:#f0f5fa;background:#001b3f;border:0;border-radius:6px;cursor:pointer}</style>
</head>
<body>
<h1>${APP_NAME}</h1>
<p>You are offline, and this page has not been saved for offline reading yet.</p>
<button onclick="location.reload()">Try again</button>
</body>
</html>`;
  return new Response(html, { status: 200, headers: { 'Content-Type': 'text/html; charset=utf-8' } });
}
