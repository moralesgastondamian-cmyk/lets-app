// ════════════════════════════════════════════════
// Let's App — Service Worker con versionado
// ════════════════════════════════════════════════
// INSTRUCCIÓN: Cada vez que subas un cambio al index.html,
// incrementá el número de CACHE_VERSION para forzar la actualización.
const CACHE_VERSION = 'lets-v17';

const ASSETS = [
  './',
  './index.html',
  'https://fonts.googleapis.com/css2?family=DM+Serif+Display:ital@0;1&family=DM+Sans:wght@300;400;500;600;700&display=swap',
  'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js'
];

// Install: cache new version
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_VERSION)
      .then(cache => cache.addAll(ASSETS))
      .then(() => self.skipWaiting()) // Activate immediately
  );
});

// Activate: delete old caches
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys.filter(k => k !== CACHE_VERSION).map(k => caches.delete(k))
      )
    ).then(() => self.clients.claim()) // Take control immediately
  );
});

// Fetch: network-first for HTML, cache-first for assets
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);

  // Network-first for same-origin HTML (ensures latest app version)
  if(url.origin === location.origin && (url.pathname.endsWith('.html') || url.pathname.endsWith('/'))) {
    event.respondWith(
      fetch(event.request)
        .then(response => {
          const clone = response.clone();
          caches.open(CACHE_VERSION).then(cache => cache.put(event.request, clone));
          return response;
        })
        .catch(() => caches.match(event.request))
    );
    return;
  }

  // Cache-first for CDN assets (they don't change)
  event.respondWith(
    caches.match(event.request)
      .then(cached => cached || fetch(event.request).then(response => {
        if(response.ok) {
          const clone = response.clone();
          caches.open(CACHE_VERSION).then(cache => cache.put(event.request, clone));
        }
        return response;
      }))
      .catch(() => new Response('Offline', { status: 503 }))
  );
});
