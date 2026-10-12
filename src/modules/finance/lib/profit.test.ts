import { describe, expect, it } from "vitest";
import { marginPct, summarizeProfit } from "./profit";

describe("summarizeProfit", () => {
  it("resta el costo de las líneas que lo tienen y cuenta las que no", () => {
    const summary = summarizeProfit(
      [
        { lineTotal: 1700, qty: 2, unitCost: 600 },
        { lineTotal: 5000, qty: 1, unitCost: null },
      ],
      0
    );
    expect(summary.revenue).toBe(6700);
    expect(summary.cost).toBe(1200);
    expect(summary.profit).toBe(5500);
    expect(summary.linesWithoutCost).toBe(1);
    expect(summary.marginPct).toBe(82.1);
  });

  it("sin ventas no hay margen", () => {
    expect(summarizeProfit([], 2).marginPct).toBeNull();
  });
});

describe("marginPct", () => {
  it("calcula el margen sobre el precio de venta", () => {
    expect(marginPct(850, 600)).toBe(29.4);
    expect(marginPct(850, null)).toBeNull();
    expect(marginPct(0, 10)).toBeNull();
  });
});
