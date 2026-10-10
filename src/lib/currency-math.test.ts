import { describe, expect, it } from "vitest";
import { fromBaseAmount, roundToCurrency, toBaseAmount } from "./currency-math";

describe("roundToCurrency", () => {
  it("redondea half-up sin artefactos de coma flotante", () => {
    expect(roundToCurrency(1.005, 2)).toBe(1.01);
    expect(roundToCurrency(2.5, 0)).toBe(3);
    expect(roundToCurrency(1234.4, 0)).toBe(1234);
  });
});

describe("toBaseAmount / fromBaseAmount", () => {
  it("convierte USD a CUP con la tasa y redondea a 0 decimales", () => {
    expect(toBaseAmount(12.5, 400, 0)).toBe(5000);
    expect(toBaseAmount(1.999, 400, 0)).toBe(800);
  });

  it("convierte CUP a USD con 2 decimales", () => {
    expect(fromBaseAmount(5000, 400, 2)).toBe(12.5);
    expect(fromBaseAmount(1000, 400, 2)).toBe(2.5);
  });

  it("rechaza tasas no positivas", () => {
    expect(() => fromBaseAmount(100, 0, 2)).toThrow();
  });
});
