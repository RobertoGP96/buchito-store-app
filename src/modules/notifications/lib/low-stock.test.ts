import { describe, expect, it } from "vitest";
import { lowStockCrossing } from "./low-stock";

describe("lowStockCrossing", () => {
  it("avisa al cruzar el umbral", () => {
    expect(lowStockCrossing(6, 5, 5)).toBe("low");
    expect(lowStockCrossing(10, 3, 5)).toBe("low");
  });

  it("no repite si ya estaba bajo", () => {
    expect(lowStockCrossing(5, 4, 5)).toBeNull();
  });

  it("avisa de agotado", () => {
    expect(lowStockCrossing(1, 0, 5)).toBe("out");
    expect(lowStockCrossing(0.5, 0, 5)).toBe("out");
    expect(lowStockCrossing(10, 0, 5)).toBe("out");
  });

  it("nada si no cruza o no baja", () => {
    expect(lowStockCrossing(10, 8, 5)).toBeNull();
    expect(lowStockCrossing(0, 0, 5)).toBeNull();
    expect(lowStockCrossing(3, 8, 5)).toBeNull();
  });

  it("umbral 0 solo avisa de agotado", () => {
    expect(lowStockCrossing(3, 1, 0)).toBeNull();
    expect(lowStockCrossing(3, 0, 0)).toBe("out");
  });

  it("redondea cantidades con decimales", () => {
    expect(lowStockCrossing(0.1 + 0.2 + 5, 5.0000000001, 5)).toBe("low");
    expect(lowStockCrossing(5.0000000001, 5, 5)).toBeNull();
  });
});
