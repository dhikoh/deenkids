// Adably Service Worker — Cache-first strategy for static assets
const CACHE_NAME = 'adably-v1';
const STATIC_ASSETS = [
  '/',
  '/favicon.svg',
  '/manifest.json',
];

// Install: pre-cache static shell
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(STATIC_ASSETS))
  );
  self.skipWaiting();
});

// Activate: clean up old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// Fetch: network-first for API, cache-first for static
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-http(s) schemes (chrome-extension, moz-extension, etc.)
  if (!url.protocol.startsWith('http')) return;

  // Skip non-GET and API requests
  if (request.method !== 'GET') return;
  if (url.pathname.startsWith('/api')) return;

  event.respondWith(
    caches.match(request).then((cached) => {
      const fetched = fetch(request).then((response) => {
        // Cache successful responses
        if (response.ok) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
        }
        return response;
      }).catch(() => cached || new Response('Offline', { status: 503, statusText: 'Service Unavailable' }));
      return cached || fetched;
    })
  );
});
