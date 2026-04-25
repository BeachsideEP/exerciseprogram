// Beachside EP — Service Worker
const CACHE = "bep-v2";

// Files to cache for offline use
const OFFLINE_FILES = [
  "./index.html",
  "./manifest.json"
];

// Install — cache core files
self.addEventListener("install", function(e) {
  e.waitUntil(
    caches.open(CACHE).then(function(cache) {
      return cache.addAll(OFFLINE_FILES);
    })
  );
  self.skipWaiting();
});

// Activate — clean up old caches
self.addEventListener("activate", function(e) {
  e.waitUntil(
    caches.keys().then(function(keys) {
      return Promise.all(
        keys.filter(function(k) { return k !== CACHE; })
            .map(function(k) { return caches.delete(k); })
      );
    })
  );
  self.clients.claim();
});

// Fetch — network first, fall back to cache
self.addEventListener("fetch", function(e) {
  // Skip non-GET and cross-origin requests (Supabase, Anthropic etc)
  if (e.request.method !== "GET") return;
  var url = new URL(e.request.url);
  if (url.origin !== self.location.origin) return;

  e.respondWith(
    fetch(e.request).then(function(response) {
      // Cache a copy of the response
      if (response.ok) {
        var clone = response.clone();
        caches.open(CACHE).then(function(cache) {
          cache.put(e.request, clone);
        });
      }
      return response;
    }).catch(function() {
      // Network failed — serve from cache
      return caches.match(e.request).then(function(cached) {
        return cached || new Response("Offline — please check your connection", {
          status: 503,
          headers: { "Content-Type": "text/plain" }
        });
      });
    })
  );
});
