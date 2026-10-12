/** Regla única de "Catálogo activo" para las dos barras de la tienda: la
 *  ficha de producto se abre desde el catálogo, así que la pestaña sigue
 *  encendida allí. */
export function isCatalogPath(pathname: string): boolean {
  return pathname === "/catalogo" || pathname.startsWith("/producto/");
}
