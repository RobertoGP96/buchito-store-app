# Buchito Store

Tienda web de distintos tipos de productos con panel de gestión y entregas a domicilio por mensajeros. Una sola app Next.js con tres zonas:

| Zona | Ruta | Quién entra |
|---|---|---|
| Tienda pública | `/` | cualquiera (compra como invitado o con cuenta) |
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

## Estado actual (bases)

Implementado: design system + shells, auth por roles, configuración, monedas/tasas, métodos de pago, tipos de producto, categorías, catálogo público con carrito y checkout (UI), listas de pedidos/entregas, zonas y mensajeros, app del mensajero.

Con firma estable pero **pendientes de implementar** (devuelven `success: false` con mensaje): alta/edición de productos y variantes, ajustes de stock, `createOrder`, `transitionOrder`, `registerOrderPayment`, `assignCourier`, `transitionDelivery`. El comentario sobre cada una describe qué debe hacer.

Fuera de alcance por ahora: pasarelas de pago online, reembolsos, cupones (UI), favoritos, imágenes (subida), PWA, mapas, recuperación de contraseña.
