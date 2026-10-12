# Buchito Store · Guía para agentes IA

Tienda web + panel de gestión + app de mensajero en UNA app Next.js. Hereda el design system y las convenciones de `D:\Projects\mareyreg` (ERP + tienda). Mantener este archivo corto y opinado.

## Stack

- **Next.js 15** App Router · **React 19** · **TypeScript estricto** · **Tailwind 4** · **HeroUI v3** (`@heroui/react`, sin provider; compound components: `Modal.Backdrop > Modal.Container > Modal.Dialog`, `Table.ScrollContainer > Table.Content`, `Select.Trigger/Popover + ListBox`; **solo en archivos `"use client"`**: su barrel rompe `next build` desde un componente servidor) · lucide-react
- **Prisma 7** + **Neon** (`@prisma/adapter-neon`), cliente generado en `generated/prisma` (import `@/generated/prisma`), `db push` (sin migraciones manuales), SQL crudo en `prisma/sql/*.sql` (`pnpm db:sql <archivo>`)
- **next-auth 5** Credentials, JWT, roles `admin | courier | customer` (`src/lib/roles.ts`)
- **Zod 4** + react-hook-form (`@hookform/resolvers`) · **Vitest** (`src/**/*.test.ts`)
- UI en **español**; identificadores y archivos en **inglés**.
- Terminal del usuario: PowerShell 5.1 → no encadenar con `&&`; nunca `pnpm dlx tsx` (usar `pnpm exec tsx`).

## Comandos


`pnpm dev` (3000) · `pnpm typecheck` · `pnpm lint` · `pnpm test` · `pnpm db:push` · `pnpm db:constraints` · `pnpm db:seed` · `pnpm db:studio`.
Tras cambiar `prisma/schema.prisma`: `pnpm exec prisma validate`, `pnpm db:generate`, `pnpm db:push`, y añadir CHECKs a `prisma/sql/store-constraints.sql` si aplica.

## Estructura

```
src/app/(store)            tienda pública (layout con CurrencyProvider + CartProvider)
src/app/(admin)/admin      panel (layout: requireRole("admin") + CurrencyProvider lockToBase)
src/app/(courier)/mensajero app del mensajero (requireRole("courier"))
src/components             shells, PageHeader/ScreenHeader, EmptyState, StatusChip, Money, ResponsiveList/ListCard,
                           ResponsiveFormDialog, form/fields.tsx (FormTextField/FormSelect/FormSwitch/FormTextArea) + form-footer
src/lib                    db, auth, auth-guard (requireRole/assertRole/getSessionCourierId), audit, folio,
                           currency (getBaseCurrency/getRateToBase/getRatesToBase/convertToBase), currency-math, format, money
src/modules/<modulo>/      actions/ ("use server") · queries/ (server-only) · components/ · lib/ (schemas, labels, máquinas de estado)
```

Módulos: `auth`, `settings`, `currency`, `payments`, `products`, `cart`, `orders`, `deliveries`. Patrón de referencia para CRUD: `src/modules/currency/` (actions + list + form) y `src/modules/deliveries/` (zonas, mensajeros).

## Reglas de dominio

- **Moneda base** en `StoreSetting.baseCurrencyId`. TODO lo contable en base: `Order.subtotal/shippingFee/discount/paymentSurcharge/total/paidBase`, `OrderLine.unitPrice/lineTotal`, `DeliveryZone.fee`, `OrderPayment.amountBase`.
- **Precios de variante** en `priceCurrencyId`; se convierten a base al leer con la tasa vigente (`getRatesToBase` una vez por request, `roundToCurrency(price × rate, base.decimalPlaces)`). Sin tasa ⇒ la variante no se vende. `OrderLine` guarda el trío `origCurrencyId/origUnitPrice/exchangeRate` (todo null si ya estaba en base).
- **Tasa** = base por 1 unidad de la moneda origen (`ExchangeRate` único por par; `getRateToBase` resuelve la inversa). Snapshot dentro de la misma tx que la operación.
- **Métodos de pago** (`PaymentMethod`, con `currencyId`): el pedido snapshotea `paymentMethodName/paymentCurrencyId/paymentExchangeRate/totalInPaymentCurrency`. Cobros en `OrderPayment` (`amountTendered` en la moneda pagada, `exchangeRate`, `amountBase`); `Order.paidBase` = Σ amountBase y `paymentStatus = derivePaymentStatus(paidBase, total)` (`src/modules/payments/lib/payment-status.ts`).
- **Totales** del carrito/pedido: una sola fórmula, `computeCartTotals` en `src/modules/cart/cart-totals.ts` (cliente y servidor).
- **Máquinas de estado** puras: `src/modules/orders/lib/state-machine.ts` (`canTransitionOrder`, actor `admin|customer|system`) y `src/modules/deliveries/lib/state-machine.ts` (`canTransitionDelivery`, `orderEffectFor`). Las transiciones de reparto sobre el pedido las ejecuta SOLO el sistema desde la máquina de entregas. Una entrega fallida se re-asigna, no se duplica.
- **Stock**: nunca `decrement` ciego. Salidas con `updateMany({ where: { variantId, stock: { gte: qty } } })` + verificar `count === 1`; cada cambio escribe `StockMovement` (`quantity > 0`, `stockAfter`, `referenceType/Id`). Se descuenta al crear el pedido y se repone al cancelar.
- **Concurrencia** (Neon no soporta `SELECT FOR UPDATE` fiable): optimistic locking con `version` + `updateMany where { id, version }` y `StaleVersionError` (`src/lib/action-utils.ts`).
- **Atributos dinámicos**: `ProductType.attributeSchema` (`AttributeDef[]`, scope `product|variant`); validar SIEMPRE con `validateAttributes(schema, values, scope)` (`src/modules/products/lib/attribute-schema.ts`).

## Server actions (patrón obligatorio)

```ts
"use server";
export async function createX(input: XInput): Promise<ActionResult<{ id: number }>> {
  const parsed = xSchema.safeParse(input);
  if (!parsed.success) return { success: false, error: firstIssueMessage(parsed.error, "Revisa los datos") };
  try {
    const userId = await assertRole("admin");          // lanza "No autenticado" / ForbiddenError
    const row = await db.$transaction(async (tx) => {
      // operación + createAuditLog(tx, { action, entityType, entityId, module, userId, oldValues, newValues })
    });
    revalidatePath("/admin/x");
    return { success: true, data: { id: row.id } };
  } catch (error) {
    if (error instanceof StaleVersionError) return { success: false, error: error.message };
    return failAction("createX", error, "Mensaje en español");
  }
}
```

- Archivos `"use server"` solo exportan funciones async: schemas, labels y helpers van en `lib/`. Helpers que participan en una tx reciben `tx: Prisma.TransactionClient` y NO llevan `"use server"`.
- **Doble parseo**: el resolver de RHF ya transforma en el cliente (`""` → `null`); el servidor vuelve a parsear, así que los schemas aceptan también el valor transformado (`z.union([z.literal(""), z.null(), z.coerce.number()])`). No romper esto.
- `Prisma.Decimal` nunca llega al cliente: convertir con `decimalToNumber` en queries. Enums de Prisma nunca en `"use client"`: usar las uniones de `lib/labels.ts`.
- **Data Cache por tags**: base/tasas, monedas activas, configuración y categorías se leen con `unstable_cache` (`CACHE_TAGS` en `src/lib/cache-tags.ts`); la action que escribe esas tablas llama a `revalidateTag` además de `revalidatePath`. Dentro de una tx usar siempre las versiones con `tx` (sin caché).
- Mensajes al usuario en español sin tecnicismos; `console.error` del error real. Handlers cliente: `try/catch/finally` con `setIsSubmitting(false)` en `finally`; feedback con `toast` de HeroUI. **Sin `router.refresh()`** tras una action que ya llama a `revalidatePath`/`revalidateTag`: la respuesta de la action trae la ruta actual re-renderizada y el refresh duplicaba el render completo. Solo login/registro lo usan, porque no revalidan.

## UI

Mobile-first (probar 375px). Listas: `ResponsiveList` (cards <md, tabla ≥md). Formularios: `ResponsiveFormDialog` + `FormFooter` + campos de `components/form/fields.tsx`. Montos siempre con `<Money value={base} />` (`tabular-nums`). Borrado: `DeleteButton` (`components/delete-button.tsx`, confirma o explica `blockedReason`) + action `deleteX(id)` que comprueba las referencias (`_count`) antes de borrar, audita con `action: "delete"` y traduce P2003 con `isForeignKeyViolation` → `IN_USE_MESSAGE`; lo que ya tiene pedidos/cobros/entregas no se borra, se desactiva. Enlaces con aspecto de botón: `ButtonLink`; HeroUI `Button` solo con `onPress`. Sin emojis. Comentarios solo para el "por qué".

Navegación: cada ruta hoja sin `searchParams` lleva `loading.tsx` con las siluetas de `components/skeletons.tsx`; las que filtran por URL no lo llevan (conservan la lista y el chip pulsado muestra `LinkPending`, con `scroll={false}`). Los enlaces de navegación (aside, navbar, tabs) no muestran loader ni skeleton: el único indicador de carga es el `loading.tsx` de la vista. Transición de ruta: `RouteTransition` en el `template.tsx` de cada grupo (View Transitions). Formularios en diálogo se importan en las listas con `lazyDialog(() => import("./x-form").then((m) => m.XForm))`, nunca con import estático.

## Entorno

`.env` (gitignored): `DATABASE_URL`, `AUTH_SECRET`, `NEXT_PUBLIC_STORE_NAME`, `SEED_*`. NO definir `AUTH_URL` (ver README: `neon env pull` la escribe por Neon Auth y rompe next-auth; borrarla tras cada pull). Neon: proyecto `bucito-store`, rama `production`, `neon.ts` con `auth: true` + buckets. Fotos: `AWS_*` (bucket `products`); en la base se guarda `/media/<clave>` (route handler cacheable que proxea el bucket); `NEXT_PUBLIC_IMAGE_CDN_URL` opcional reescribe a un CDN propio (`src/lib/image-url.ts`, nunca la URL del bucket en la base).
