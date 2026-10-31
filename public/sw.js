/* Bersabeh service worker — app-shell cache only.
   APIs, staff/admin pages and Next.js router (RSC) requests are NEVER
   intercepted or cached, so in-app button/link navigation always talks
   to the live server and can never be served a stale screen. */
const VERSION = 'bersabeh-v1.7-1';
const CORE = [
  '/', '/track', '/login', '/manifest.webmanifest',
  '/logo-wing.png', '/hero-et.jpg',
  '/icons/icon-192.png', '/icons/icon-512.png', '/icons/maskable-512.png',
];
const CORE_PAGES = new Set(['/', '/track', '/login']);
const STATIC_RE = /\.(?:css|js|mjs|png|jpe?g|gif|svg|webp|ico|woff2?|ttf|webmanifest)$/i;

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

function isRouterRequest(req, url) {
  // Next.js client-side navigation/prefetch requests must go straight to
  // the network — caching these payloads can render the wrong page.
  return url.searchParams.has('_rsc')
    || req.headers.has('RSC')
    || req.headers.has('Next-Router-State-Tree')
    || req.headers.has('Next-Router-Prefetch');
}

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  // Always live: APIs, private screens, and app-router payloads.
  if (url.pathname.startsWith('/api/')
    || url.pathname.startsWith('/staff')
    || url.pathname.startsWith('/admin')
    || isRouterRequest(req, url)) {
    return; // let the browser handle it normally (network)
  }

  // Full-page navigations: network first. Only the three public shell
  // pages are cached (by pathname), as an offline fallback.
  if (req.mode === 'navigate') {
    event.respondWith(
      fetch(req)
        .then((res) => {
          if (res && res.ok && CORE_PAGES.has(url.pathname)) {
            const copy = res.clone();
            caches.open(VERSION).then((c) => c.put(url.pathname, copy)).catch(() => {});
          }
          return res;
        })
        .catch(async () => (await caches.match(url.pathname, { ignoreSearch: true })) || caches.match('/'))
    );
    return;
  }

  // Genuine static files only (hashed Next assets, images, fonts, css).
  const isStatic = url.pathname.startsWith('/_next/static/')
    || url.pathname.startsWith('/icons/')
    || STATIC_RE.test(url.pathname);
  if (!isStatic) return;

  event.respondWith(
    caches.match(req).then((hit) => hit || fetch(req).then((res) => {
      if (res && res.ok) {
        const copy = res.clone();
        caches.open(VERSION).then((c) => c.put(req, copy)).catch(() => {});
      }
      return res;
    }))
  );
});
