import { roundToCurrency } from "@/lib/currency-math";

// Parte pura de los combos: sin DB, usable en cliente y servidor.

export interface ComboStockItem {
  qty: number;
  stock: number;
}

/** Unidades del combo que se pueden vender con el stock actual: el componente
 *  más escaso manda. Sin componentes no hay nada que vender. */
export function comboAvailability(items: ComboStockItem[]): number {
  const limits = items.filter((item) => item.qty > 0).map((item) => Math.floor(item.stock / item.qty));
  if (limits.length === 0) return 0;
  return Math.max(0, Math.min(...limits));
}

export interface ComboPriceItem {
  qty: number;
  /** Precio regular de la variante, en base. */
  unitPriceBase: number;
}

/** Lo que costarían los componentes comprados por separado, en base. */
export function comboRegularPrice(items: ComboPriceItem[], decimals: number): number {
  return roundToCurrency(
    items.reduce((sum, item) => sum + item.unitPriceBase * item.qty, 0),
    decimals
  );
}

/** Porcentaje de ahorro frente al precio regular; 0 si el combo no ahorra. */
export function comboSavingsPct(priceBase: number, regularPriceBase: number): number {
  if (regularPriceBase <= 0 || priceBase >= regularPriceBase) return 0;
  return Math.round(((regularPriceBase - priceBase) / regularPriceBase) * 100);
}

export interface ProrateInput<T extends ComboPriceItem> {
  /** Precio del combo por unidad, en base. */
  comboPriceBase: number;
  /** Unidades del combo en el pedido. */
  comboQty: number;
  items: T[];
  decimals: number;
}

export interface ProratedLine<T> {
  item: T;
  /** Unidades de la variante en el pedido (qty del componente × comboQty). */
  qty: number;
  /** Informativo: lineTotal / qty redondeado. */
  unitPrice: number;
  /** Parte del precio del combo que corresponde a esta línea, en base. */
  lineTotal: number;
}

/** Reparte el precio del combo entre sus componentes en proporción a su precio
 *  regular, de forma que Σ lineTotal = comboPriceBase × comboQty EXACTO (método
 *  del mayor resto, en unidades mínimas de la moneda). Así la contabilidad por
 *  producto refleja lo que realmente se cobró por cada uno. */
export function prorateComboLines<T extends ComboPriceItem>(input: ProrateInput<T>): ProratedLine<T>[] {
  const { items, comboQty, decimals } = input;
  if (items.length === 0 || comboQty <= 0) return [];

  const scale = 10 ** decimals;
  const totalUnits = Math.round(roundToCurrency(input.comboPriceBase * comboQty, decimals) * scale);

  // Peso de cada componente: su precio regular total. Si todos valen 0, se
  // reparte por cantidad para no dividir entre cero.
  const weights = items.map((item) => Math.max(0, item.unitPriceBase) * item.qty);
  const weightSum = weights.reduce((a, b) => a + b, 0);
  const effective = weightSum > 0 ? weights : items.map((item) => item.qty);
  const effectiveSum = effective.reduce((a, b) => a + b, 0) || 1;

  const raw = effective.map((w) => (totalUnits * w) / effectiveSum);
  const floors = raw.map((r) => Math.floor(r));
  let remainder = totalUnits - floors.reduce((a, b) => a + b, 0);

  const order = raw
    .map((r, i) => ({ i, frac: r - floors[i] }))
    .sort((a, b) => b.frac - a.frac || a.i - b.i);
  for (const { i } of order) {
    if (remainder <= 0) break;
    floors[i] += 1;
    remainder -= 1;
  }

  return items.map((item, i) => {
    const qty = item.qty * comboQty;
    const lineTotal = floors[i] / scale;
    return {
      item,
      qty,
      unitPrice: qty > 0 ? roundToCurrency(lineTotal / qty, decimals) : 0,
      lineTotal,
    };
  });
}
