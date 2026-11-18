/** Un día de la serie de ventas del panel, en moneda base. */
export interface SalesDay {
  /** Día local en formato `YYYY-MM-DD`. */
  date: string;
  total: number;
  orders: number;
}

export interface SalesRangeSummary {
  days: SalesDay[];
  total: number;
  orders: number;
  /** Variación porcentual frente al periodo anterior de igual largo; `null`
   *  si el anterior no tuvo ventas (no hay base para comparar). */
  delta: number | null;
}

function dayKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/** Serie diaria continua de los últimos `days` días (hoy incluido, el más
 *  antiguo primero): los días sin pedidos salen con total 0, no se omiten. */
export function buildDailySeries(orders: { createdAt: Date; total: number }[], days: number, now: Date): SalesDay[] {
  const byDay = new Map<string, { total: number; orders: number }>();
  for (const order of orders) {
    const key = dayKey(order.createdAt);
    const bucket = byDay.get(key) ?? { total: 0, orders: 0 };
    bucket.total += order.total;
    bucket.orders += 1;
    byDay.set(key, bucket);
  }

  const series: SalesDay[] = [];
  for (let offset = days - 1; offset >= 0; offset -= 1) {
    const day = new Date(now.getFullYear(), now.getMonth(), now.getDate() - offset);
    const key = dayKey(day);
    const bucket = byDay.get(key);
    // Los importes se suman como number: se redondea para no arrastrar ruido binario.
    series.push({ date: key, total: Math.round((bucket?.total ?? 0) * 100) / 100, orders: bucket?.orders ?? 0 });
  }
  return series;
}

/** Variación porcentual entera de `current` frente a `previous`. */
export function pctChange(current: number, previous: number): number | null {
  if (previous <= 0) return null;
  return Math.round(((current - previous) / previous) * 100);
}

/** Resumen de los últimos `range` días de una serie que trae al menos el doble
 *  de días: el tramo anterior es la base de la comparación. */
export function summarizeRange(series: SalesDay[], range: number): SalesRangeSummary {
  const days = series.slice(-range);
  const previous = series.slice(-range * 2, -range);
  const sum = (rows: SalesDay[]) => rows.reduce((acc, row) => acc + row.total, 0);
  const total = Math.round(sum(days) * 100) / 100;
  return {
    days,
    total,
    orders: days.reduce((acc, row) => acc + row.orders, 0),
    delta: previous.length === range ? pctChange(total, sum(previous)) : null,
  };
}
