/* Service worker mínimo de la PWA. No cachea páginas ni datos: la tienda
 * depende de precios y stock en vivo y cachear HTML o RSC mostraría
 * información vieja. Solo guarda una página estática para cuando no hay red,
 * que es lo que un navegador espera de una app instalable. */
const VERSION = "v1";
const CACHE = `buchito-offline-${VERSION}`;
const OFFLINE_URL = "/offline.html";

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE)
      .then((cache) => cache.add(new Request(OFFLINE_URL, { cache: "reload" })))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  // Solo navegaciones de documento: el resto (RSC, imágenes, actions) va
  // directo a la red sin pasar por aquí.
  if (event.request.mode !== "navigate") return;
  event.respondWith(
    fetch(event.request).catch(() => caches.match(OFFLINE_URL).then((r) => r ?? Response.error()))
  );
});
