/** Datos de una moneda que necesita el cliente para pintar montos. */
export interface CurrencyInfo {
  currencyId: number;
  code: string;
  symbol: string;
  decimalPlaces: number;
  name?: string;
}

/** Fallback antes de que cargue la configuración: CUP, 0 decimales. */
export const DEFAULT_CURRENCY: CurrencyInfo = {
  currencyId: 0,
  code: "CUP",
  symbol: "$",
  decimalPlaces: 0,
  name: "Peso cubano",
};

// Miles con espacio + código (ej. "4 750 CUP"): evita el ambiguo "$" solo.
// Los decimales reales siempre se muestran ("250.50 CUP") aunque la moneda
// declare 0 decimales; se omiten solo cuando son todo ceros ("250 CUP",
// nunca "250.00 CUP").
export function fmt(
  n: number,
  currency: Pick<CurrencyInfo, "code" | "decimalPlaces"> = DEFAULT_CURRENCY
): string {
  const decimals = Math.max(2, currency.decimalPlaces);
  const [intPart, decimalPart] = n.toFixed(decimals).split(".");
  const sign = intPart.startsWith("-") ? "−" : "";
  const digits = intPart.replace("-", "");
  const withThousands = digits.replace(/\B(?=(\d{3})+(?!\d))/g, " ");
  const amount =
    decimalPart && Number(decimalPart) !== 0
      ? `${withThousands}.${decimalPart}`
      : withThousands;
  return `${sign}${amount} ${currency.code}`;
}

// Rango de combinantes diacríticos vía constructor: un literal /\p{Diacritic}/u
// es SyntaxError al parsear el bundle en WebViews/Safari viejos.
const DIACRITICS = new RegExp("[\\u0300-\\u036f]", "g");

/** Normaliza para búsqueda: minúsculas y sin acentos ("azucar" encuentra "Azúcar"). */
export function normalizeText(value: string): string {
  return value.toLowerCase().normalize("NFD").replace(DIACRITICS, "");
}

export function discountPct(price: number, compareAtPrice: number | null): number {
  if (compareAtPrice == null || compareAtPrice <= 0 || compareAtPrice <= price) {
    return 0;
  }
  return Math.round(((compareAtPrice - price) / compareAtPrice) * 100);
}

const DATE_FMT = new Intl.DateTimeFormat("es-MX", {
  day: "2-digit",
  month: "short",
  year: "numeric",
});

const DATETIME_FMT = new Intl.DateTimeFormat("es-MX", {
  day: "2-digit",
  month: "short",
  hour: "2-digit",
  minute: "2-digit",
});

export function fmtDate(value: Date | string): string {
  return DATE_FMT.format(new Date(value));
}

export function fmtDateTime(value: Date | string): string {
  return DATETIME_FMT.format(new Date(value));
}
