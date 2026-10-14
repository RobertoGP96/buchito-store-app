import { roundQty } from "@/modules/products/lib/units";

/** ¿Este movimiento hace que la variante pase a "stock bajo" o se agote?
 *  Misma definición que el inventario (bajo = stock <= umbral, incluye
 *  agotado), pero solo avisa al cruzar: si ya estaba baja, no repite. Las
 *  cantidades admiten decimales (kg, g): se redondean antes de comparar. */
export function lowStockCrossing(before: number, after: number, threshold: number): "out" | "low" | null {
  const b = roundQty(before);
  const a = roundQty(after);
  if (a >= b) return null;
  if (a <= 0) return b > 0 ? "out" : null;
  if (threshold > 0 && a <= threshold && b > threshold) return "low";
  return null;
}
