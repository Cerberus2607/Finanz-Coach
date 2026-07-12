// Service Worker v7 — network-first für die App-Seite (Updates sofort), Cache als Offline-Fallback
const CACHE = "finanz-dashboard-v7";
const ASSETS = [
  "./index.html",
  "./manifest.json",
  "./icon-180.png",
  "./icon-192.png",
  "./icon-512.png",
  "https://cdnjs.cloudflare.com/ajax/libs/Chart.js/4.4.1/chart.umd.min.js"
];

self.addEventListener("install", e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", e => {
  e.waitUntil(
    caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", e => {
  const url = e.request.url;
  // Krypto-Kurse: immer live, kein Cache
  if (url.includes("api.coingecko.com")) {
    e.respondWith(fetch(e.request).catch(() => new Response("{}", {headers:{"Content-Type":"application/json"}})));
    return;
  }
  // HTML/Navigation: NETWORK-FIRST → Updates erscheinen sofort, Cache nur offline
  if (e.request.mode === "navigate" || url.endsWith(".html") || url.endsWith("/")) {
    e.respondWith(
      fetch(e.request).then(res => {
        const copy = res.clone();
        caches.open(CACHE).then(c => c.put(e.request, copy));
        return res;
      }).catch(() => caches.match(e.request).then(hit => hit || caches.match("./index.html")))
    );
    return;
  }
  // Assets (Icons, Chart.js): cache-first, das ändert sich selten
  e.respondWith(
    caches.match(e.request).then(hit => hit || fetch(e.request).then(res => {
      if (res.ok && e.request.method === "GET") {
        const copy = res.clone();
        caches.open(CACHE).then(c => c.put(e.request, copy));
      }
      return res;
    }))
  );
});
