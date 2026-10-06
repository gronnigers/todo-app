/* Donezo service worker — app-shell cache + update handshake (same pattern as Dwellness).
   Bump VERSION on every release and keep it in sync with APP_VERSION in index.html.
   A new worker installs and WAITS; the page shows "Update ready" and sends
   SKIP_WAITING when you tap Update. Never caches Graph / login calls. */
const VERSION = "2026.10.06-3";
const PREFIX = "donezo-";
const CACHE = PREFIX + VERSION;
const SHELL = ["./", "index.html", "manifest.json", "icon-180.png", "icon-192.png", "icon-512.png", "icon-add-96.png"];

self.addEventListener("install", e => {
  // add files one at a time so a single missing file can't block an update
  e.waitUntil(caches.open(CACHE).then(c => Promise.all(SHELL.map(u => c.add(u).catch(() => {})))));
});
self.addEventListener("activate", e => {
  // only clear Donezo's own old caches; other apps on the same site keep theirs
  e.waitUntil(caches.keys()
    .then(ks => Promise.all(ks.filter(k => k.startsWith(PREFIX) && k !== CACHE).map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});
self.addEventListener("message", e => {
  if (e.data === "SKIP_WAITING") self.skipWaiting();
  if (e.data === "GET_VERSION" && e.ports[0]) e.ports[0].postMessage(VERSION);
});
self.addEventListener("fetch", e => {
  const u = new URL(e.request.url);
  if (e.request.method !== "GET" || u.origin !== location.origin || u.search.includes("code=")) return;
  // network-first so a reload always gets the latest files; cache is the offline fallback
  e.respondWith(fetch(e.request)
    .then(r => { if (r.ok) { const c = r.clone(); caches.open(CACHE).then(x => x.put(e.request, c)); } return r; })
    .catch(() => caches.match(e.request).then(r => r || caches.match("index.html"))));
});
