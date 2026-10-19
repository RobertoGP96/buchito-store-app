/* Service worker mínimo de la PWA. Solo se registra en producción
 * (PwaRegister): no buscar aquí parpadeos vistos en `pnpm dev`. No cachea
 * páginas ni datos: la tienda depende de precios y stock en vivo y cachear
 * HTML o RSC mostraría información vieja. Solo guarda una página estática
 * para cuando no hay red, que es lo que un navegador espera de una app
 * instalable. */
const VERSION = "v3";
const CACHE = `buchito-offline-${VERSION}`;
const OFFLINE_URL = "/offline.html";

self.addEventListener("install", (event) => {
  // Static Routing API (Chromium 123+): lo que no es navegación (RSC,
  // imágenes, actions) ni siquiera arranca el worker. Donde no existe, el
  // handler de fetch lo deja pasar igual.
  if ("addRoutes" in event) {
    event.addRoutes([
      { condition: { requestMode: "navigate" }, source: "fetch-event" },
      { condition: { not: { requestMode: "navigate" } }, source: "network" },
    ]);
  }
  event.waitUntil(
    caches
      .open(CACHE)
      .then((cache) => cache.add(new Request(OFFLINE_URL, { cache: "reload" })))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)));
      // La petición del documento sale en paralelo con el arranque del worker
      // en vez de esperar a que este despierte.
      if (self.registration.navigationPreload) {
        await self.registration.navigationPreload.enable();
      }
      await self.clients.claim();
    })()
  );
});

self.addEventListener("fetch", (event) => {
  // Solo navegaciones de documento: el resto va directo a la red.
  if (event.request.mode !== "navigate") return;
  event.respondWith(
    (async () => {
      try {
        return (await event.preloadResponse) ?? (await fetch(event.request));
      } catch {
        return (await caches.match(OFFLINE_URL)) ?? Response.error();
      }
    })()
  );
});
