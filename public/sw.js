const CACHE = "ricepos-v1"
self.addEventListener("install", () => self.skipWaiting())
self.addEventListener("activate", (e) => e.waitUntil(Promise.all([clients.claim(), caches.keys().then(k => Promise.all(k.filter(x => x !== CACHE).map(x => caches.delete(x))))])))
self.addEventListener("fetch", (e) => {
  if (e.request.method !== "GET") return
  if (new URL(e.request.url).pathname.startsWith("/api/")) return
  e.respondWith(fetch(e.request).then(r => { if (r.ok && r.type === "basic") { const c = r.clone(); caches.open(CACHE).then(cache => cache.put(e.request, c)) }; return r }).catch(() => caches.match(e.request)))
})
