// Beachside EP — Service Worker v10 (adds drawn exercise illustrations to the offline cache)
// Previously: v9 — offline-capable, staleness-safe
// v8 deliberately did NOT cache index.html (stale-version fights). v9 adds
// offline opening WITHOUT reintroducing staleness:
//   - Navigations: NETWORK-FIRST with a 4s timeout. Online users always get
//     the newest index.html (same freshness guarantee as v8). Only when the
//     network is unavailable/slow does the cached copy serve — so the app
//     opens instantly in the gym with no reception.
//   - Static assets (manifest/icons) + Google Fonts: stale-while-revalidate.
//   - Supabase / Cliniko / YouTube: NEVER intercepted. Saves and sync always
//     hit the network directly (the app has its own retry + pending backup).
const CACHE = "bep-v10";

const STATIC = [
  "./manifest.json",
  "./icon-192.png",
  "./icon-512.png",
  "./apple-touch-icon.png"
];

const ILLUS = [
 "./illustrations/ab-wheel-rollout-end.png",
 "./illustrations/ab-wheel-rollout-start.png",
 "./illustrations/active-knee-extension-end.png",
 "./illustrations/active-knee-extension-start.png",
 "./illustrations/ball-squeeze-end.png",
 "./illustrations/ball-squeeze-start.png",
 "./illustrations/band-pull-apart-end.png",
 "./illustrations/band-pull-apart-start.png",
 "./illustrations/banded-row-end.png",
 "./illustrations/banded-row-start.png",
 "./illustrations/banded-shrug-end.png",
 "./illustrations/banded-shrug-start.png",
 "./illustrations/banded-tib-raise-end.png",
 "./illustrations/banded-tib-raise-start.png",
 "./illustrations/bent-over-db-row-end.png",
 "./illustrations/bent-over-db-row-start.png",
 "./illustrations/bird-dog-end.png",
 "./illustrations/bird-dog-start.png",
 "./illustrations/box-squat-end.png",
 "./illustrations/box-squat-start.png",
 "./illustrations/cable-bicep-curl-end.png",
 "./illustrations/cable-bicep-curl-start.png",
 "./illustrations/cable-hip-abduction-end.png",
 "./illustrations/cable-hip-abduction-start.png",
 "./illustrations/cable-kickback-end.png",
 "./illustrations/cable-kickback-start.png",
 "./illustrations/cable-woodchop-high-to-low-end.png",
 "./illustrations/cable-woodchop-high-to-low-start.png",
 "./illustrations/calf-raise-bilateral-end.png",
 "./illustrations/calf-raise-bilateral-start.png",
 "./illustrations/calf-raise-single-leg-end.png",
 "./illustrations/calf-raise-single-leg-start.png",
 "./illustrations/cat-cow-stretch-end.png",
 "./illustrations/cat-cow-stretch-start.png",
 "./illustrations/chest-press-machine-end.png",
 "./illustrations/chest-press-machine-start.png",
 "./illustrations/clamshell-end.png",
 "./illustrations/clamshell-start.png",
 "./illustrations/deadbug-end.png",
 "./illustrations/deadbug-start.png",
 "./illustrations/external-rotation-band-end.png",
 "./illustrations/external-rotation-band-start.png",
 "./illustrations/forward-fold-stretch-end.png",
 "./illustrations/forward-fold-stretch-start.png",
 "./illustrations/forward-lunge-end.png",
 "./illustrations/forward-lunge-start.png",
 "./illustrations/goblet-squat-end.png",
 "./illustrations/goblet-squat-start.png",
 "./illustrations/hanging-leg-raise-end.png",
 "./illustrations/hanging-leg-raise-start.png",
 "./illustrations/hip-90-90-stretch-end.png",
 "./illustrations/hip-90-90-stretch-start.png",
 "./illustrations/hip-abduction-machine-end.png",
 "./illustrations/hip-abduction-machine-start.png",
 "./illustrations/hip-adduction-machine-end.png",
 "./illustrations/hip-adduction-machine-start.png",
 "./illustrations/hip-thrust-end.png",
 "./illustrations/hip-thrust-start.png",
 "./illustrations/incline-chest-press-machine-end.png",
 "./illustrations/incline-chest-press-machine-start.png",
 "./illustrations/incline-db-press-end.png",
 "./illustrations/incline-db-press-start.png",
 "./illustrations/kb-around-the-world-end.png",
 "./illustrations/kb-around-the-world-start.png",
 "./illustrations/lat-pulldown-end.png",
 "./illustrations/lat-pulldown-start.png",
 "./illustrations/lateral-step-up-end.png",
 "./illustrations/lateral-step-up-start.png",
 "./illustrations/leg-curl-machine-prone-end.png",
 "./illustrations/leg-curl-machine-prone-start.png",
 "./illustrations/leg-curl-machine-seated-end.png",
 "./illustrations/leg-curl-machine-seated-start.png",
 "./illustrations/leg-press-end.png",
 "./illustrations/leg-press-start.png",
 "./illustrations/pigeon-stretch-end.png",
 "./illustrations/pigeon-stretch-start.png",
 "./illustrations/plate-loaded-hip-thrust-machine-end.png",
 "./illustrations/plate-loaded-hip-thrust-machine-start.png",
 "./illustrations/push-up-end.png",
 "./illustrations/push-up-start.png",
 "./illustrations/reverse-lunge-end.png",
 "./illustrations/reverse-lunge-start.png",
 "./illustrations/scooter-on-reformer-end.png",
 "./illustrations/scooter-on-reformer-start.png",
 "./illustrations/seated-cable-row-end.png",
 "./illustrations/seated-cable-row-start.png",
 "./illustrations/seated-calf-raise-machine-end.png",
 "./illustrations/seated-calf-raise-machine-start.png",
 "./illustrations/seated-row-machine-end.png",
 "./illustrations/seated-row-machine-start.png",
 "./illustrations/shoulder-press-machine-end.png",
 "./illustrations/shoulder-press-machine-start.png",
 "./illustrations/side-plank-end.png",
 "./illustrations/side-plank-start.png",
 "./illustrations/single-arm-db-row-end.png",
 "./illustrations/single-arm-db-row-start.png",
 "./illustrations/squat-end.png",
 "./illustrations/squat-jump-end.png",
 "./illustrations/squat-jump-start.png",
 "./illustrations/squat-start.png",
 "./illustrations/standing-hip-abduction-end.png",
 "./illustrations/standing-hip-abduction-start.png",
 "./illustrations/step-up-end.png",
 "./illustrations/step-up-start.png",
 "./illustrations/thread-the-needle-end.png",
 "./illustrations/thread-the-needle-start.png",
 "./illustrations/tib-raise-bar-end.png",
 "./illustrations/tib-raise-bar-start.png",
 "./illustrations/tricep-rope-extension-end.png",
 "./illustrations/tricep-rope-extension-start.png",
 "./illustrations/wall-angels-end.png",
 "./illustrations/wall-angels-start.png",
 "./illustrations/wall-push-up-end.png",
 "./illustrations/wall-push-up-start.png",
 "./illustrations/wall-sit-end.png",
 "./illustrations/wall-sit-start.png"
];

self.addEventListener("install", function(e) {
  e.waitUntil(
    caches.open(CACHE).then(function(cache) {
      // Precache the shell too, so offline works from the first update.
      // addAll is atomic; do index.html separately so an icon 404 can't
      // block the shell from caching.
      return cache.addAll(STATIC).catch(function(){}).then(function() {
        return cache.add("./index.html").catch(function(){});
      }).then(function() {
        // Drawn illustrations: cached one by one so a single missing file can't stop the rest.
        return Promise.all(ILLUS.map(function(u) { return cache.add(u).catch(function(){}); }));
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
