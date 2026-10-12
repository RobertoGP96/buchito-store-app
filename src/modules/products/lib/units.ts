// Unidades de venta: parte pura, sin DB, usable en cliente y servidor.
// Unión espejo del enum SaleUnit de Prisma (los componentes cliente no
// pueden importar @/generated/prisma).

export type SaleUnit = "unit" | "kg" | "g" | "lb" | "l" | "ml" | "m";

export const SALE_UNITS: readonly SaleUnit[] = ["unit", "kg", "g", "lb", "l", "ml", "m"];

export const SALE_UNIT_LABELS: Record<SaleUnit, string> = {
  unit: "Unidad",
  kg: "Kilogramo",
  g: "Gramo",
  lb: "Libra",
  l: "Litro",
  ml: "Mililitro",
  m: "Metro",
};

/** Abreviatura que acompaña a la cantidad ("2 ud", "0.5 kg"). */
export const SALE_UNIT_SHORT: Record<SaleUnit, string> = {
  unit: "ud",
  kg: "kg",
  g: "g",
  lb: "lb",
  l: "L",
  ml: "ml",
  m: "m",
};

/** Decimales que admiten las cantidades (coincide con Decimal(14, 3)). */
export const QTY_DECIMALS = 3;

/** Cantidad máxima por línea, en la unidad de la variante. */
export const MAX_LINE_QTY = 9999;

export function roundQty(qty: number): number {
  const factor = 10 ** QTY_DECIMALS;
  return Math.round((qty + Number.EPSILON) * factor) / factor;
}

/** Número de cantidad sin ceros sobrantes ("2", "0.5", "1.25"). */
export function fmtQtyNumber(qty: number): string {
  const rounded = roundQty(qty);
  const text = rounded.toFixed(QTY_DECIMALS).replace(/\.?0+$/, "");
  return text === "" || text === "-0" ? "0" : text;
}

/** "2 ud" / "0.5 kg". Para la unidad, `long` da "2 unidades". */
export function fmtQty(qty: number, unit: SaleUnit, long = false): string {
  const n = fmtQtyNumber(qty);
  if (unit === "unit" && long) return `${n} ${roundQty(qty) === 1 ? "unidad" : "unidades"}`;
  return `${n} ${SALE_UNIT_SHORT[unit]}`;
}

/** Sufijo del precio cuando no se vende por unidad: "/ kg". */
export function perUnitSuffix(unit: SaleUnit): string | null {
  return unit === "unit" ? null : `/ ${SALE_UNIT_SHORT[unit]}`;
}

/** Múltiplo del paso dentro de la tolerancia del redondeo a 3 decimales. */
export function isMultipleOf(qty: number, step: number): boolean {
  if (step <= 0) return false;
  const ratio = qty / step;
  return Math.abs(ratio - Math.round(ratio)) < 1e-6;
}

/** Cantidad vendible: positiva, múltiplo del paso y dentro del máximo. */
export function isValidQty(qty: number, step: number): boolean {
  return Number.isFinite(qty) && qty > 0 && qty <= MAX_LINE_QTY && isMultipleOf(qty, step);
}

/** Ajusta una cantidad al múltiplo del paso más cercano, nunca por debajo de un paso. */
export function snapQty(qty: number, step: number): number {
  if (step <= 0) return roundQty(Math.max(0, qty));
  const snapped = Math.round(qty / step) * step;
  return roundQty(Math.max(step, snapped));
}

/** Máximo vendible dado el stock: el mayor múltiplo del paso que cabe. */
export function maxSellable(stock: number, step: number): number {
  if (step <= 0 || stock <= 0) return 0;
  return roundQty(Math.min(MAX_LINE_QTY, Math.floor(stock / step + 1e-9) * step));
}

/** La unidad "unidad" solo admite pasos enteros; el resto cualquier positivo. */
export function isValidStep(step: number, unit: SaleUnit): boolean {
  if (!Number.isFinite(step) || step <= 0) return false;
  return unit !== "unit" || Number.isInteger(step);
}
