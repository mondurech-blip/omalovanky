// Keeps Larine omaľovánky working with no internet (car, plane).
// Everything the app needs is stored on install: both languages, the voice recordings and the icons.
// The font is inside index.html, so nothing is loaded from other websites.
// Other apps live on the same domain (Počty), so only this app's own old caches are deleted,
// and the page asks for a check on every start (another app may have removed our cache).
const CACHE = 'larine-omalovanky-test-20261024-141548';
const FAMILY = CACHE.replace(/\d{8}-\d{6}$/, '');        // 'larine-omalovanky-' or 'larine-omalovanky-test-'
const CORE = ['./', './index.html', './en/', './en/index.html', './clips-sk.js', './clips-en.js', './manifest.webmanifest', './icon-180.png', './icon-512.png'];
const ours = k => k.startsWith(FAMILY) && !(FAMILY === 'larine-omalovanky-' && k.startsWith('larine-omalovanky-test-'));

async function fillCore(onlyMissing) {
  const c = await caches.open(CACHE);
  for (const u of CORE) {
    if (onlyMissing && await c.match(u)) continue;
    try { const r = await fetch(new Request(u, { cache: 'reload' })); if (r.ok) await c.put(u, r); } catch (e) { /* offline: try next time */ }
  }
}

self.addEventListener('install', e => {
  e.waitUntil((async () => {
    const c = await caches.open(CACHE);
    await c.addAll(CORE.map(u => new Request(u, { cache: 'reload' })));
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', e => {
  e.waitUntil((async () => {
    for (const k of await caches.keys()) if (ours(k) && k !== CACHE) await caches.delete(k);
    await self.clients.claim();
  })());
});

self.addEventListener('message', e => { if (e.data === 'check-cache') e.waitUntil(fillCore(true)); });

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== location.origin) return;
  e.respondWith((async () => {
    const c = await caches.open(CACHE);
    const hit = await c.match(req, { ignoreSearch: true });
    if (hit) return hit;
    try {
      const res = await fetch(req);
      if (res && res.ok) c.put(req, res.clone());
      return res;
    } catch (err) {
      if (req.mode === 'navigate') { const p = await c.match(url.pathname.includes('/en/') ? './en/index.html' : './index.html'); if (p) return p; }
      throw err;
    }
  })());
});
