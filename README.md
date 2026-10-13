# Buchito Store

Tienda web de distintos tipos de productos con panel de gestión y entregas a domicilio por mensajeros. Una sola app Next.js con tres zonas:

| Zona | Ruta | Quién entra |
|---|---|---|
| Tienda pública | `/` | cualquiera; comprar requiere una cuenta de cliente |
| Panel de gestión | `/admin` | rol `admin` |
| App del mensajero | `/mensajero` | rol `courier` (y `admin`) |

## Stack

Next.js 15 (App Router) · React 19 · TypeScript estricto · Tailwind 4 · **HeroUI v3** · lucide-react · Prisma 7 + Neon Postgres · next-auth 5 (Credentials) · Zod 4 + react-hook-form · Vitest.

El design system (tokens navy/crema/dorado, Poppins, tema claro/oscuro) viene de `mareyreg/apps/tienda` y está mapeado a las variables de HeroUI en `src/app/globals.css`.

## Arranque

```bash
pnpm install
```

Copia `.env.example` a `.env` y rellena `DATABASE_URL` (Neon) y `AUTH_SECRET` (`openssl rand -base64 32`). Si el proyecto está enlazado con el CLI de Neon (`neon link`), `neon env pull` rellena `DATABASE_URL` solo.

> Aviso: `neon.ts` declara `auth: true` (Neon Auth), así que `neon env pull` / `neon deploy` también escriben `AUTH_URL` y `AUTH_SECRET` en `.env`. La app usa **next-auth**, que lee esas mismas variables: `AUTH_URL` apuntando al host de Neon Auth rompe el login (cookie `__Secure-…` y redirección a otro host). Tras cada pull, borra la línea `AUTH_URL` (o quita `auth: true` de `neon.ts` si no vas a usar Neon Auth).

**Verificación en dos pasos (2FA).** Cualquier usuario la activa desde «Mi perfil» con una app de autenticación (TOTP) o con un código por correo; al activarla recibe 8 códigos de respaldo de un solo uso y un admin puede quitarla desde Usuarios. Variables: `TWO_FACTOR_KEY` (opcional; si falta se usa `AUTH_SECRET`; fíjala antes del primer alta y no la cambies, invalidaría todas las apps vinculadas) y, para el método correo, `RESEND_API_KEY` + `MAIL_FROM` (Resend). Sin proveedor de correo, en desarrollo el código se imprime en la consola del servidor y en producción el método correo queda deshabilitado. El provider de next-auth ya no acepta correo y contraseña: solo un ticket que acuñan las actions de login tras validar ambos factores.

```bash
pnpm db:push          # crea/actualiza las tablas desde prisma/schema.prisma
pnpm db:constraints   # CHECKs e índices parciales que db push no gestiona
pnpm db:seed          # datos de ejemplo (idempotente)
pnpm dev              # http://localhost:3000
```

Usuarios del seed (contraseña: la de `SEED_ADMIN_PASSWORD` en `.env`):

- `admin@buchito.local` → `/admin`
- `mensajero@buchito.local` → `/mensajero`
- `cliente@buchito.local` → tienda

Verificación: `pnpm typecheck`, `pnpm lint`, `pnpm test`.

## Estructura

```
prisma/schema.prisma        modelos (catálogo, pedidos, monedas, tasas, pagos, entregas)
prisma/sql/*.sql            SQL crudo (constraints) → pnpm db:sql <archivo>
src/app/(store)             tienda pública
src/app/(admin)/admin       panel
src/app/(courier)/mensajero app del mensajero
src/components              UI compartida (layout shells, campos de formulario HeroUI, listas)
src/lib                     db, auth, audit, currency (tasas), format, roles
src/modules/<modulo>        actions (server actions) · queries · components · lib (schemas, labels, máquinas de estado)
```

Módulos: `auth`, `settings`, `currency`, `payments`, `products`, `cart`, `orders`, `deliveries`.

## Reglas de dominio

- **Moneda base** (`StoreSetting.baseCurrencyId`, CUP en el seed): todo lo contable se guarda en base. Los precios de variante pueden estar en cualquier moneda (`priceCurrencyId`) y el catálogo los convierte con la tasa vigente.
- **Tasas**: un `ExchangeRate` por par hacia la base (`rate` = base por 1 unidad), con historial. Se gestionan en `/admin/monedas/tasas`.
- **Métodos de pago**: catálogo configurable, cada uno con la moneda en la que paga el cliente. El pedido snapshotea método, moneda y tasa; los cobros se registran en `OrderPayment` y de su suma se deriva `paymentStatus`.
- **Pedidos y entregas**: máquinas de estado puras en `src/modules/orders/lib/state-machine.ts` y `src/modules/deliveries/lib/state-machine.ts` (con tests). Una entrega fallida se re-asigna, no se duplica.
- **Server actions**: siempre devuelven `ActionResult<T>`, validan con Zod, escriben audit log dentro de la transacción y usan `version` para optimistic locking (Neon no soporta `SELECT FOR UPDATE` fiable).

## Estado actual

Flujo completo funcionando y verificado de punta a punta contra Neon:

- **Catálogo**: tipos de producto con atributos dinámicos, categorías en árbol, productos con variantes (SKU, precio en cualquier moneda, stock, variante por defecto), publicación y ajustes de stock con kardex.
- **Compra**: carrito, checkout con entrega a domicilio por zona o recogida, método de pago en su moneda, cupones; el servidor recalcula precios con la tasa vigente y descuenta stock de forma atómica.
- **Gestión**: pedidos (confirmar, listo, entregar en recogida, cancelar con reposición de stock), registro de cobros multi-moneda, entregas (asignar/desasignar mensajero).
- **Mensajero**: recoger, entregar con cobro contra entrega, o registrar el fallo (el pedido vuelve a la cola).

## Fotos de producto y CDN

Las fotos (galería del producto y foto de variante) se suben desde el panel a `/api/uploads/products`, que las guarda en el bucket `products` de Neon Object Storage (declarado en `neon.ts`, `public_read`) con clave `<scope>/<uuid>.<ext>` y `Cache-Control: immutable`. Hace falta tener en `.env` las variables `AWS_*` que escribe `neon env pull`.

En la base **no** se guarda la URL del bucket sino la ruta relativa `/media/<clave>`, así las filas no dependen del host del bucket (cambia por rama de Neon) ni del CDN:

- `GET /media/<clave>` (`src/app/media/[...key]/route.ts`) proxea el objeto con `Cache-Control: public, max-age=31536000, s-maxage=31536000, immutable`. En Vercel eso lo cachea el Edge Network tras la primera petición; si tienes Cloudflare (u otro CDN) delante del dominio de la app, también. Solo sirve claves con la forma de la subida, no es un proxy abierto.
- `next/image` optimiza a partir de esa ruta; los `/_next/image` resultantes también se cachean en el edge.
- Si prefieres un CDN propio con origen directo en el bucket (`${AWS_ENDPOINT_URL_S3}/products/`), pon su URL pública en `NEXT_PUBLIC_IMAGE_CDN_URL` (sin barra final): `imageSrc()` (`src/lib/image-url.ts`) reescribe `/media/<clave>` → `<CDN>/<clave>` y `next.config.ts` añade ese host a `images.remotePatterns`. Con Cloudflare: un Worker o una regla de origen que reenvíe `https://img.tu-dominio.com/<clave>` a `${AWS_ENDPOINT_URL_S3}/products/<clave>` con "cache everything"; el objeto ya trae `immutable`, así que no hay que purgar nunca (cada versión es una clave nueva).

Pendiente / fuera de alcance por ahora: UI de administración de cupones (el modelo y la validación existen), reembolsos, pasarelas de pago online, notificaciones, favoritos, PWA, mapas, recuperación de contraseña.
