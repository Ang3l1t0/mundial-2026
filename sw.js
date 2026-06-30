/* ============================================================
   Mundial 2026 — Service Worker (offline-first)
   · Precachea el "app shell" (archivos locales) al instalar.
   · Cachea al vuelo las banderas (flagcdn) y las fuentes (Google Fonts)
     en la primera carga CON internet → después funciona 100% offline.
   ============================================================ */

const CACHE = "mundial2026-v8";

// Archivos locales que forman la app (sin estos no arranca).
const SHELL = [
  "./",
  "index.html",
  "styles.css",
  "seed.js",
  "data.js",
  "allocation.js",
  "engine.js",
  "render.js",
  "manifest.json",
  "icon.svg",
  "icon-192.png",
  "icon-512.png",
  "assets/habi-logo.svg",
];

// Hosts externos que cacheamos al vuelo (no podemos precachearlos todos a ciegas).
const RUNTIME_HOSTS = ["flagcdn.com", "fonts.googleapis.com", "fonts.gstatic.com"];

self.addEventListener("install", (e) => {
  e.waitUntil(
    caches.open(CACHE)
      // addAll falla entero si un archivo falta; lo hacemos tolerante.
      .then((c) => Promise.allSettled(SHELL.map((u) => c.add(u))))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET") return;

  const url = new URL(req.url);
  const sameOrigin = url.origin === self.location.origin;
  const cacheable = sameOrigin || RUNTIME_HOSTS.includes(url.hostname);
  if (!cacheable) return;

  // Cache-first: si está en caché lo servimos (offline ok); si no, red + guardamos.
  e.respondWith(
    caches.match(req).then((hit) => {
      if (hit) return hit;
      return fetch(req)
        .then((res) => {
          // Guardamos copias válidas (incluye opacas de cross-origin).
          if (res && (res.ok || res.type === "opaque")) {
            const copy = res.clone();
            caches.open(CACHE).then((c) => c.put(req, copy));
          }
          return res;
        })
        .catch(() => {
          // Sin red y sin caché: para navegación, devolvemos el index cacheado.
          if (req.mode === "navigate") return caches.match("index.html");
          return new Response("", { status: 504, statusText: "offline" });
        });
    })
  );
});
