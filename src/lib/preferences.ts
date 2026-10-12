/** Preferencias de interfaz que el servidor necesita en el primer render para
 *  que no haya salto tras hidratar (ancho del sidebar, secciones plegadas,
 *  moneda de display). Viven en cookies, no en localStorage, porque el layout
 *  las lee en el servidor. No son datos sensibles. */
export const ADMIN_NAV_COOKIE = "buchito-admin-nav";
export const ADMIN_NAV_SECTIONS_COOKIE = "buchito-admin-nav-sections";
export const DISPLAY_CURRENCY_COOKIE = "buchito-currency";

const ONE_YEAR = 60 * 60 * 24 * 365;

export function writePreferenceCookie(name: string, value: string): void {
  try {
    document.cookie = `${name}=${encodeURIComponent(value)}; path=/; max-age=${ONE_YEAR}; samesite=lax`;
  } catch {
    // Cookies bloqueadas: la preferencia dura la sesión.
  }
}

/** Ids de las secciones plegadas del sidebar, separados por coma. Cualquier
 *  valor extraño (cookie manipulada, sección que ya no existe) se ignora. */
export function parseCollapsedSections(raw: string | undefined): string[] {
  if (!raw) return [];
  return raw
    .split(",")
    .map((id) => id.trim())
    .filter((id) => /^[a-z0-9-]+$/.test(id));
}

export function serializeCollapsedSections(ids: Iterable<string>): string {
  return Array.from(ids).join(",");
}
