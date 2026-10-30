/* Bersabeh service worker — app-shell cache only.
   APIs and staff/admin pages are NEVER cached (always fresh from network). */
const VERSION = 'bersabeh-v1.5-1';
const CORE = [
  '/', '/track', '/login', '/manifest.webmanifest',
  '/logo-wing.png', '/hero-et.jpg',
  '/icons/icon-192.png', '/icons/icon-512.png', '/icons/maskable-512.png',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(VERSION)
      .then((cache) => Promise.allSettled(CORE.map((u) => cache.add(u))))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== VERSION).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  // Always live data / private screens: network only
  if (url.pathname.startsWith('/api/') || url.pathname.startsWith('/staff') || url.pathname.startsWith('/admin')) {
    event.respondWith(fetch(req));
    return;
  }

  // Page navigations: network first, fall back to cached shell when offline
  if (req.mode === 'navigate') {
    event.respondWith(
      fetch(req)
        .then((res) => {
          const copy = res.clone();
          caches.open(VERSION).then((c) => c.put(req, copy)).catch(() => {});
          return res;
        })
        .catch(() => caches.match(req).then((m) => m || caches.match('/')))
    );
    return;
  }

  // Static assets/images: cache first, then network (and remember)
  event.respondWith(
    caches.match(req).then((hit) => hit || fetch(req).then((res) => {
      const copy = res.clone();
      caches.open(VERSION).then((c) => c.put(req, copy)).catch(() => {});
      return res;
    }))
  );
});
