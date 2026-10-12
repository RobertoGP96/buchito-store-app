import { roundQty } from "./units";

export type StockMovementKind = "entry" | "exit" | "adjustment";

export interface StockPlan {
  stockAfter: number;
  /** Cantidad que registra el `StockMovement` (siempre > 0; el signo lo da el tipo). */
  movementQuantity: number;
}

export type StockPlanResult = { ok: true; plan: StockPlan } | { ok: false; error: string };

/** Regla de stock incumplida dentro de la transacción. La action devuelve el
 *  mensaje tal cual al usuario (ya viene en español). */
export class StockRuleError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "StockRuleError";
  }
}

export function isStockRuleError(error: unknown): error is StockRuleError {
  return error instanceof StockRuleError;
}

/** Calcula el resultado de un movimiento sin tocar la DB. Las cantidades van
 *  en la unidad de la variante (hasta 3 decimales). Para `adjustment`
 *  `quantity` es el conteo real (stock final), no un delta. */
export function planStockMovement(
  currentStock: number,
  type: StockMovementKind,
  quantity: number
): StockPlanResult {
  if (!Number.isFinite(quantity) || quantity <= 0) {
    return { ok: false, error: "La cantidad debe ser mayor que cero" };
  }
  const qty = roundQty(quantity);
  const current = roundQty(currentStock);

  switch (type) {
    case "entry":
      return { ok: true, plan: { stockAfter: roundQty(current + qty), movementQuantity: qty } };
    case "exit":
      if (qty > current) return { ok: false, error: "Stock insuficiente" };
      return { ok: true, plan: { stockAfter: roundQty(current - qty), movementQuantity: qty } };
    case "adjustment": {
      const delta = roundQty(qty - current);
      if (delta === 0) return { ok: false, error: "El stock ya es ese" };
      return { ok: true, plan: { stockAfter: qty, movementQuantity: Math.abs(delta) } };
    }
  }
}
