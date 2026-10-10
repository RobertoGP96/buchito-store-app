// Parte pura de la conversión de monedas: sin DB, usable en cliente.
// Convención: `rate` = unidades de moneda BASE por 1 unidad de la moneda origen.

// Redondeo half-up estable: evita que artefactos de coma flotante binaria
// (ej. 1.005 -> 1.00 en vez de 1.01) rompan el redondeo de montos monetarios.
export function roundToCurrency(amount: number, decimalPlaces: number): number {
  const factor = 10 ** decimalPlaces;
  return Math.round((amount + Number.EPSILON) * factor) / factor;
}

export function toBaseAmount(
  amount: number,
  rate: number,
  baseDecimals: number
): number {
  return roundToCurrency(amount * rate, baseDecimals);
}

export function fromBaseAmount(
  amountBase: number,
  rate: number,
  targetDecimals: number
): number {
  if (rate <= 0) throw new Error("La tasa de cambio debe ser mayor que cero");
  return roundToCurrency(amountBase / rate, targetDecimals);
}
