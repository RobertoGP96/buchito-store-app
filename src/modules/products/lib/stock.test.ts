import { describe, expect, it } from "vitest";
import { planStockMovement } from "./stock";

describe("planStockMovement", () => {
  it("rechaza cantidades no positivas o no enteras", () => {
    expect(planStockMovement(10, "entry", 0).ok).toBe(false);
    expect(planStockMovement(10, "entry", -3).ok).toBe(false);
    expect(planStockMovement(10, "entry", 1.5).ok).toBe(false);
  });

  it("entry suma al stock actual", () => {
    expect(planStockMovement(10, "entry", 5)).toEqual({
      ok: true,
      plan: { stockAfter: 15, movementQuantity: 5 },
    });
  });

  it("exit resta y falla si no alcanza", () => {
    expect(planStockMovement(10, "exit", 4)).toEqual({
      ok: true,
      plan: { stockAfter: 6, movementQuantity: 4 },
    });
    expect(planStockMovement(10, "exit", 10).ok).toBe(true);
    expect(planStockMovement(10, "exit", 11)).toEqual({ ok: false, error: "Stock insuficiente" });
  });

  it("adjustment fija el conteo real y registra el delta en valor absoluto", () => {
    expect(planStockMovement(10, "adjustment", 7)).toEqual({
      ok: true,
      plan: { stockAfter: 7, movementQuantity: 3 },
    });
    expect(planStockMovement(10, "adjustment", 25)).toEqual({
      ok: true,
      plan: { stockAfter: 25, movementQuantity: 15 },
    });
  });

  it("adjustment sin cambio se rechaza", () => {
    expect(planStockMovement(10, "adjustment", 10)).toEqual({ ok: false, error: "El stock ya es ese" });
  });
});
