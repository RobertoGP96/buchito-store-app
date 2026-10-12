import { roundToCurrency } from "@/lib/currency-math";

// Cálculo puro de ganancia: sin DB, usable en cliente y servidor. Todo en base.

export interface ProfitLine {
  /** Lo cobrado por la línea (ya prorrateado si venía de un combo). */
  lineTotal: number;
  qty: number;
  /** Costo de compra por unidad; null = no se registró y no cuenta. */
  unitCost: number | null;
}

export interface ProfitSummary {
  revenue: number;
  /** Σ unitCost × qty de las líneas con costo conocido. */
  cost: number;
  /** revenue − cost. Si hay líneas sin costo es una cota superior. */
  profit: number;
  /** profit / revenue × 100; null sin ventas. */
  marginPct: number | null;
  linesWithoutCost: number;
}

export function summarizeProfit(lines: ProfitLine[], decimals: number): ProfitSummary {
  let revenue = 0;
  let cost = 0;
  let linesWithoutCost = 0;
  for (const line of lines) {
    revenue += line.lineTotal;
    if (line.unitCost == null) linesWithoutCost += 1;
    else cost += line.unitCost * line.qty;
  }
  revenue = roundToCurrency(revenue, decimals);
  cost = roundToCurrency(cost, decimals);
  const profit = roundToCurrency(revenue - cost, decimals);
  return {
    revenue,
    cost,
    profit,
    marginPct: revenue > 0 ? Math.round((profit / revenue) * 1000) / 10 : null,
    linesWithoutCost,
  };
}

/** Margen de una variante sobre su precio de venta (ambos en base). */
export function marginPct(priceBase: number, costBase: number | null): number | null {
  if (costBase == null || priceBase <= 0) return null;
  return Math.round(((priceBase - costBase) / priceBase) * 1000) / 10;
}
