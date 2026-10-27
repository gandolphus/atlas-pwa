// Sektile service worker, generated at build time (vite.config.ts). Version: dca917ef2e31
const CACHE = 'sektile-dca917ef2e31';
const PRECACHE = [
 "./",
 "assets/index-0Pql583f.css",
 "assets/index-C8ZsLoRl.js",
 "content/forms.791f5da063.json",
 "content/index.json",
 "content/sentences.b8b29446ad.json",
 "content/wiki.0feb75cef6.json",
 "content/words.7a50a0f5e2.json",
 "icons/apple-touch-icon.png",
 "icons/favicon.png",
 "icons/icon-192.png",
 "icons/icon-512.png",
 "icons/icon-maskable-512.png",
 "index.html",
 "manifest.webmanifest"
];
const HASHED = /\/(assets\/.+-[A-Za-z0-9_-]{8}\.[a-z0-9]+|content\/.+\.[0-9a-f]{6,}\.json)$/;
const INDEX = new URL('index.html', self.registration.scope).href;

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(PRECACHE)));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((ks) => Promise.all(ks.filter((k) => k.startsWith('sektile-') && k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('message', (e) => {
  if (e.data && e.data.type === 'SKIP_WAITING') self.skipWaiting();
});

const cacheable = (r) => {
  if (r.status !== 200 || r.type === 'opaque') return false;
  return !/no-store|private/i.test(r.headers.get('Cache-Control') || '');
};

async function put(key, r) {
  if (!cacheable(r)) return;
  const c = await caches.open(CACHE);
  await c.put(key, r);
}

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== location.origin) return;
  if (url.pathname.endsWith('/devnotes.js')) return;

  if (HASHED.test(url.pathname)) {
    e.respondWith(
      caches.match(req, { ignoreVary: true }).then((hit) => hit || fetch(req).then((r) => { e.waitUntil(put(req, r.clone())); return r; })),
    );
    return;
  }

  const nav = req.mode === 'navigate';
  e.respondWith(
    fetch(req)
      .then((r) => {
        e.waitUntil(put(nav ? INDEX : req, r.clone()));
        return r;
      })
      .catch(async () => {
        const hit = await caches.match(nav ? INDEX : req, { ignoreSearch: true, ignoreVary: true });
        if (hit) return hit;
        if (nav) { const root = await caches.match(new URL('./', self.registration.scope).href, { ignoreSearch: true, ignoreVary: true }); if (root) return root; }
        return Response.error();
      }),
  );
});
