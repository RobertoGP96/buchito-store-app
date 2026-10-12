import { describe, expect, it } from "vitest";
import { fmtQty, fmtQtyNumber, isValidQty, isValidStep, maxSellable, snapQty } from "./units";

describe("fmtQty", () => {
  it("quita ceros sobrantes y añade la unidad", () => {
    expect(fmtQtyNumber(2)).toBe("2");
    expect(fmtQtyNumber(0.5)).toBe("0.5");
    expect(fmtQtyNumber(1.25)).toBe("1.25");
    expect(fmtQty(0.5, "kg")).toBe("0.5 kg");
    expect(fmtQty(3, "unit")).toBe("3 ud");
    expect(fmtQty(1, "unit", true)).toBe("1 unidad");
    expect(fmtQty(2, "unit", true)).toBe("2 unidades");
  });
});

describe("isValidQty / snapQty / maxSellable", () => {
  it("acepta múltiplos del paso y rechaza el resto", () => {
    expect(isValidQty(0.75, 0.25)).toBe(true);
    expect(isValidQty(0.7, 0.25)).toBe(false);
    expect(isValidQty(0, 1)).toBe(false);
    expect(isValidQty(3, 1)).toBe(true);
    // Tolerancia al redondeo binario.
    expect(isValidQty(0.3, 0.1)).toBe(true);
  });

  it("ajusta al paso y nunca por debajo de un paso", () => {
    expect(snapQty(0.7, 0.25)).toBe(0.75);
    expect(snapQty(0.1, 0.25)).toBe(0.25);
    expect(snapQty(2.4, 1)).toBe(2);
  });

  it("el máximo vendible es el mayor múltiplo que cabe en el stock", () => {
    expect(maxSellable(2.6, 0.5)).toBe(2.5);
    expect(maxSellable(5, 1)).toBe(5);
    expect(maxSellable(0, 1)).toBe(0);
  });
});

describe("isValidStep", () => {
  it("las unidades sueltas solo admiten pasos enteros", () => {
    expect(isValidStep(1, "unit")).toBe(true);
    expect(isValidStep(0.5, "unit")).toBe(false);
    expect(isValidStep(0.25, "kg")).toBe(true);
    expect(isValidStep(0, "kg")).toBe(false);
  });
});
