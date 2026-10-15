/* Inkora service worker: offline app shell, data and fonts.
   Bump VERSION whenever any shipped file (including data/) changes. */
const VERSION = 'inkora-v10';
const SHELL = [
  './', 'index.html', 'styles.css', 'app.js', 'anim.js', 'write.js', 'bgm.js', 'manifest.webmanifest',
  'data/brands.json', 'data/models.json', 'data/fillers.json', 'data/timeline.json', 'data/methods.json', 'data/glossary.json',
  'icons/icon.svg', 'icons/icon-192.png', 'icons/icon-512.png', 'icons/maskable-512.png', 'icons/apple-touch-icon.png'
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(VERSION).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => (k.startsWith('ink-leaf-') || k.startsWith('inkora-')) && k !== VERSION).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET' || req.headers.has('range')) return;
  const url = new URL(req.url);

  // Page navigations: network first (so updates arrive), cached shell when offline.
  if (req.mode === 'navigate') {
    e.respondWith(fetch(req).catch(() => caches.match('index.html').then((r) => r || caches.match('./'))));
    return;
  }

  // Google Fonts: stale-while-revalidate.
  if (url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com') {
    e.respondWith(
      caches.open(VERSION).then((cache) =>
        cache.match(req).then((hit) => {
          const net = fetch(req).then((res) => { if (res.ok || res.type === 'opaque') cache.put(req, res.clone()); return res; }).catch(() => hit);
          return hit || net;
        })
      )
    );
    return;
  }

  // Own files: cache first, then network.
  if (url.origin === self.location.origin) {
    e.respondWith(
      caches.match(req, { ignoreSearch: true }).then((hit) =>
        hit || fetch(req).then((res) => {
          if (res.ok) { const copy = res.clone(); caches.open(VERSION).then((c) => c.put(req, copy)); }
          return res;
        })
      )
    );
  }
});
