// Beachside EP — Service Worker v9 — offline-capable, staleness-safe
// v8 deliberately did NOT cache index.html (stale-version fights). v9 adds
// offline opening WITHOUT reintroducing staleness:
//   - Navigations: NETWORK-FIRST with a 4s timeout. Online users always get
//     the newest index.html (same freshness guarantee as v8). Only when the
//     network is unavailable/slow does the cached copy serve — so the app
//     opens instantly in the gym with no reception.
//   - Static assets (manifest/icons) + Google Fonts: stale-while-revalidate.
//   - Supabase / Cliniko / YouTube: NEVER intercepted. Saves and sync always
//     hit the network directly (the app has its own retry + pending backup).
const CACHE = "bep-v9";

const STATIC = [
  "./manifest.json",
  "./icon-192.png",
  "./icon-512.png",
  "./apple-touch-icon.png"
];

self.addEventListener("install", function(e) {
  e.waitUntil(
    caches.open(CACHE).then(function(cache) {
      // Precache the shell too, so offline works from the first update.
      // addAll is atomic; do index.html separately so an icon 404 can't
      // block the shell from caching.
      return cache.addAll(STATIC).catch(function(){}).then(function() {
        return cache.add("./index.html").catch(function(){});
      });
    })
  );
  self.skipWaiting();
});

self.addEventListener("activate", function(e) {
  e.waitUntil(
    caches.keys().then(function(keys) {
      return Promise.all(
        keys.filter(function(k) { return k !== CACHE; })
            .map(function(k) { return caches.delete(k); })
      );
    }).then(function() {
      return self.clients.claim();
    })
  );
});

function bypassed(url) {
  return url.indexOf("supabase.co") !== -1 ||
         url.indexOf("cliniko.com") !== -1 ||
         url.indexOf("youtube.com") !== -1 ||
         url.indexOf("ytimg.com")   !== -1 ||
         url.indexOf("youtu.be")    !== -1;
}

// Network-first with timeout: fresh when online, instant cached open offline.
function navHandler(req) {
  return new Promise(function(resolve) {
    var settled = false;
    function settle(res) { if (!settled && res) { settled = true; resolve(res); } }
    var timer = setTimeout(function() {
      caches.match("./index.html").then(function(cached) { settle(cached); });
    }, 4000);
    fetch(req).then(function(res) {
      clearTimeout(timer);
      if (res && res.ok) {
        var copy = res.clone();
        caches.open(CACHE).then(function(c) { c.put("./index.html", copy); }).catch(function(){});
      }
      settle(res);
    }).catch(function() {
      clearTimeout(timer);
      caches.match("./index.html").then(function(cached) {
        settle(cached || new Response(
          "You're offline and the app hasn't been cached yet. Connect to the internet once and reopen.",
          { status: 503, headers: { "Content-Type": "text/plain" } }
        ));
      });
    });
  });
}

function swr(req) {
  return caches.match(req).then(function(cached) {
    var net = fetch(req).then(function(res) {
      if (res && res.ok && (res.type === "basic" || res.type === "cors")) {
        var copy = res.clone();
        caches.open(CACHE).then(function(c) { c.put(req, copy); }).catch(function(){});
      }
      return res;
    }).catch(function() { return cached; });
    return cached || net;
  });
}

self.addEventListener("fetch", function(e) {
  var req = e.request;
  if (req.method !== "GET") return;
  var url = req.url || "";
  if (url.indexOf("http") !== 0) return;
  if (bypassed(url)) return;

  if (req.mode === "navigate") {
    e.respondWith(navHandler(req));
    return;
  }

  var sameOrigin = url.indexOf(self.location.origin) === 0;
  var isFont = url.indexOf("fonts.googleapis.com") !== -1 || url.indexOf("fonts.gstatic.com") !== -1;
  if (sameOrigin || isFont) {
    e.respondWith(swr(req));
  }
});
