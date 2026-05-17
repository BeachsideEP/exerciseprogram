// Beachside EP — Service Worker v8 — force cache bust
const CACHE = "bep-v8";

// Only cache static assets, NOT index.html itself
const STATIC = [
  "./manifest.json",
  "./icon-192.png",
  "./icon-512.png",
  "./apple-touch-icon.png"
];

self.addEventListener("install", function(e) {
  e.waitUntil(
    caches.open(CACHE).then(function(cache) {
      return cache.addAll(STATIC);
    })
  );
  self.skipWaiting(); // activate immediately
});

self.addEventListener("activate", function(e) {
  e.waitUntil(
    caches.keys().then(function(keys) {
      return Promise.all(
        keys.filter(function(k) { return k !== CACHE; })
            .map(function(k) { return caches.delete(k); })
      );
    }).then(function() {
      return self.clients.claim(); // take control of all open pages immediately
    })
  );
});

self.addEventListener("fetch", function(e) {
  if (e.request.method !== "GET") return;
  var url = new URL(e.request.url);

  // ALWAYS fetch index.html fresh — never cache it
  if (url.pathname.endsWith("index.html") || url.pathname === "/" || url.pathname.endsWith("/")) {
    e.respondWith(
      fetch(e.request, { cache: "no-store" }).catch(function() {
        return caches.match("./index.html");
      })
    );
    return;
  }

  // Skip cross-origin (Supabase, etc)
  if (url.origin !== self.location.origin) return;

  // Cache-first for static assets
  e.respondWith(
    caches.match(e.request).then(function(cached) {
      if (cached) return cached;
      return fetch(e.request).then(function(response) {
        if (response.ok) {
          var clone = response.clone();
          caches.open(CACHE).then(function(cache) { cache.put(e.request, clone); });
        }
        return response;
      });
    })
  );
});
