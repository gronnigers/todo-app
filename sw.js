/* Dwellness service worker — app-shell cache + update handshake.
   Bump VERSION on every release (keep it in sync with APP_VERSION in index.html).
   A new worker installs and WAITS; the page shows "Update available" and sends
   SKIP_WAITING when the user taps Update. Never caches Graph / login calls. */
const VERSION = "2026.09.29-15";
const CACHE = "dwellness-" + VERSION;
const SHELL = ["./", "index.html", "manifest.json", "icons/icon-192.png", "icons/icon-512.png", "icons/apple-touch-icon.png", "icons/favicon.svg"];

self.addEventListener("install", e => { e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL))); });
// only clear Dwellness's own old caches; other apps on the same site keep theirs
self.addEventListener("activate", e => { e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k.startsWith("dwellness-") && k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim())); });
self.addEventListener("message", e => {
  if (e.data === "SKIP_WAITING") self.skipWaiting();
  if (e.data === "GET_VERSION" && e.ports[0]) e.ports[0].postMessage(VERSION);
});
self.addEventListener("fetch", e => {
  const u = new URL(e.request.url);
  if (e.request.method !== "GET" || u.origin !== location.origin || u.search.includes("code=")) return;
  // network-first so a reload always gets the latest files; cache is the offline fallback
  e.respondWith(fetch(e.request).then(r => { const c = r.clone(); caches.open(CACHE).then(x => x.put(e.request, c)); return r; }).catch(() => caches.match(e.request).then(r => r || caches.match("index.html"))));
});
