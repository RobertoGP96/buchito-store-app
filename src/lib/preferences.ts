/** Preferencias de interfaz que el servidor necesita en el primer render para
 *  que no haya salto tras hidratar (ancho del sidebar, moneda de display).
 *  Viven en cookies, no en localStorage, porque el layout las lee en el
 *  servidor. No son datos sensibles. */
export const ADMIN_NAV_COOKIE = "buchito-admin-nav";
export const DISPLAY_CURRENCY_COOKIE = "buchito-currency";

const ONE_YEAR = 60 * 60 * 24 * 365;

export function writePreferenceCookie(name: string, value: string): void {
  try {
    document.cookie = `${name}=${encodeURIComponent(value)}; path=/; max-age=${ONE_YEAR}; samesite=lax`;
  } catch {
    // Cookies bloqueadas: la preferencia dura la sesión.
  }
}
