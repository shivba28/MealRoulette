/**
 * Service Worker stub: caches static assets and GraphQL responses for offline.
 *
 * Strategy:
 * - GET same-origin (HTML, JS, CSS, images): cache-first, then network (stale-while-revalidate).
 * - POST /graphql: network-first; on success cache response by (url + body); on failure serve from cache.
 * - Offline: serve from caches when network fails.
 *
 * Integrates with app IndexedDB recipe cache: SW caches raw API responses; app parses and stores recipes in IDB.
 */

const STATIC_CACHE = 'mealroulette-static-v1';
const API_CACHE = 'mealroulette-api-v1';

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((names) => {
      return Promise.all(
        names
          .filter((n) => n !== STATIC_CACHE && n !== API_CACHE)
          .map((n) => caches.delete(n))
      );
    })
  );
  self.clients.claim();
});

function isSameOrigin(url) {
  try {
    return new URL(url).origin === self.location.origin;
  } catch {
    return false;
  }
}

function isGraphQL(url) {
  try {
    const u = new URL(url);
    return u.pathname === '/graphql' || u.pathname.endsWith('/graphql');
  } catch {
    return false;
  }
}

self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = request.url;

  if (request.method !== 'GET' && request.method !== 'POST') {
    return;
  }

  // POST /graphql: network-first; cache response by request for offline fallback
  if (request.method === 'POST' && isGraphQL(url)) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (!response.ok || response.status !== 200) return response;
          const clone = response.clone();
          caches.open(API_CACHE).then((cache) => {
            cache.put(request, clone);
          });
          return response;
        })
        .catch(() => caches.match(request))
    );
    return;
  }

  // GET same-origin: cache-first then network (stale-while-revalidate)
  if (request.method === 'GET' && isSameOrigin(url)) {
    event.respondWith(
      caches.open(STATIC_CACHE).then((cache) => {
        return cache.match(request).then((cached) => {
          const fetchPromise = fetch(request).then((response) => {
            if (response.ok && response.type === 'basic') {
              cache.put(request, response.clone());
            }
            return response;
          });
          return cached || fetchPromise;
        });
      })
    );
  }
});
