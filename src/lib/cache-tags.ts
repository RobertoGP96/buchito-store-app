/** Tags de la Data Cache de Next (`unstable_cache`). La action que escribe en
 *  estas tablas llama a `revalidateTag` con el tag que corresponda; el
 *  `revalidate` de cada lectura es solo el respaldo por si algo cambia fuera
 *  de la app (seed, SQL directo). */
export const CACHE_TAGS = {
  /** Monedas, tasas y moneda base. */
  currency: "currency",
  /** StoreSetting (incluye la moneda base). */
  settings: "settings",
  /** Árbol de categorías del catálogo. */
  categories: "categories",
} as const;

/** Respaldo en segundos cuando nadie invalida el tag. */
export const CACHE_FALLBACK_SECONDS = 300;
