/** Regla única de "Catálogo activo" para las dos barras de la tienda: la
 *  ficha de producto se abre desde el catálogo, así que la pestaña sigue
 *  encendida allí. */
export function isCatalogPath(pathname: string): boolean {
  return pathname === "/catalogo" || pathname.startsWith("/producto/");
}

/** Rutas del flujo lineal de pago donde la barra inferior se esconde. */
const BOTTOM_NAV_HIDDEN_PREFIXES = ["/checkout", "/pedido-confirmado"];

/** Regla única de "barra inferior visible": la comparten la propia barra y el
 *  footer, que es quien reserva el hueco bajo ella. */
export function isBottomNavVisible(pathname: string): boolean {
  return !BOTTOM_NAV_HIDDEN_PREFIXES.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}

/** Hueco que el footer deja bajo la píldora flotante en móvil: alto de la
 *  píldora (56px) más 12px de aire, sobre su separación del borde
 *  (`max(14px, safe-area)`), la misma que usa la barra. */
export const BOTTOM_NAV_CLEARANCE = "pb-[calc(68px+max(14px,env(safe-area-inset-bottom)))] md:pb-0";
