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

/** Calcula el resultado de un movimiento sin tocar la DB. Para `adjustment`
 *  `quantity` es el conteo real (stock final), no un delta. */
export function planStockMovement(
  currentStock: number,
  type: StockMovementKind,
  quantity: number
): StockPlanResult {
  if (!Number.isInteger(quantity) || quantity <= 0) {
    return { ok: false, error: "La cantidad debe ser mayor que cero" };
  }

  switch (type) {
    case "entry":
      return { ok: true, plan: { stockAfter: currentStock + quantity, movementQuantity: quantity } };
    case "exit":
      if (quantity > currentStock) return { ok: false, error: "Stock insuficiente" };
      return { ok: true, plan: { stockAfter: currentStock - quantity, movementQuantity: quantity } };
    case "adjustment": {
      const delta = quantity - currentStock;
      if (delta === 0) return { ok: false, error: "El stock ya es ese" };
      return { ok: true, plan: { stockAfter: quantity, movementQuantity: Math.abs(delta) } };
    }
  }
}
