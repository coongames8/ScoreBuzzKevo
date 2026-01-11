const CACHE_NAME = "ScoreBuzz-cache-v1";
const STATIC_CACHE_NAME = "ScoreBuzz-static-v1";

// Cache only essential static assets
const STATIC_URLS_TO_CACHE = [
  "/",
  "/index.html",
  "/manifest.json",
  "/favicon.ico",
  "/logo16.png",
  "/logo32.png",
  "/logo512.png",
  "/logo192.png",
];

// Don't cache API requests or Firebase data
const NO_CACHE_URLS = [
  /\/api\//,
  /firebaseio\.com/,
  /firestore\.googleapis\.com/,
  /identitytoolkit\.googleapis\.com/,
  /securetoken\.googleapis\.com/,
  /\.hot-update\./,
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(STATIC_CACHE_NAME)
      .then((cache) => {
        return cache.addAll(STATIC_URLS_TO_CACHE);
      })
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    Promise.all([
      // Clean up old caches
      caches.keys().then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            if (cacheName !== CACHE_NAME && cacheName !== STATIC_CACHE_NAME) {
              return caches.delete(cacheName);
            }
          })
        );
      }),
      self.clients.claim(),
    ])
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip caching for API calls, Firebase requests, and hot updates
  if (NO_CACHE_URLS.some((regex) => regex.test(url.href))) {
    // Network only for dynamic data
    event.respondWith(fetch(request));
    return;
  }

  // For static assets, use cache-first strategy
  if (
    request.method === "GET" &&
    STATIC_URLS_TO_CACHE.some(
      (staticUrl) =>
        url.pathname === staticUrl || url.pathname.startsWith("/logo")
    )
  ) {
    event.respondWith(
      caches.match(request).then((cachedResponse) => {
        if (cachedResponse) {
          // Update cache in background
          fetch(request).then((response) => {
            if (response.ok) {
              caches.open(STATIC_CACHE_NAME).then((cache) => {
                cache.put(request, response);
              });
            }
          });
          return cachedResponse;
        }
        return fetch(request).then((response) => {
          if (response.ok) {
            const responseToCache = response.clone();
            caches.open(STATIC_CACHE_NAME).then((cache) => {
              cache.put(request, responseToCache);
            });
          }
          return response;
        });
      })
    );
    return;
  }

  // For other requests, use network-first strategy
  event.respondWith(
    fetch(request)
      .then((response) => {
        // Cache only successful responses for non-API, non-Firebase requests
        if (
          response.ok &&
          request.method === "GET" &&
          !NO_CACHE_URLS.some((regex) => regex.test(url.href))
        ) {
          const responseToCache = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(request, responseToCache);
          });
        }
        return response;
      })
      .catch(() => {
        // If network fails, try cache for non-API requests
        if (!NO_CACHE_URLS.some((regex) => regex.test(url.href))) {
          return caches.match(request);
        }
        return new Response("Network error occurred", {
          status: 408,
          headers: { "Content-Type": "text/plain" },
        });
      })
  );
});
