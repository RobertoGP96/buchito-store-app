import { describe, expect, it } from "vitest";
import { discountPct, fmt, normalizeText } from "./format";

describe("fmt", () => {
  it("separa miles con espacio y usa los decimales de la moneda", () => {
    expect(fmt(4750)).toBe("4 750 CUP");
    expect(fmt(1234567)).toBe("1 234 567 CUP");
  });

  it("redondea a los decimales de la moneda aunque el monto traiga más", () => {
    expect(fmt(250.5)).toBe("251 CUP");
    expect(fmt(250.4)).toBe("250 CUP");
  });

  it("muestra siempre los decimales configurados, incluso en cero", () => {
    expect(fmt(12.3456, { code: "USD", decimalPlaces: 2 })).toBe("12.35 USD");
    expect(fmt(12, { code: "USD", decimalPlaces: 2 })).toBe("12.00 USD");
    expect(fmt(1.5, { code: "BTC", decimalPlaces: 4 })).toBe("1.5000 BTC");
  });

  it("usa el signo menos tipográfico", () => {
    expect(fmt(-1500)).toBe("−1 500 CUP");
    expect(fmt(-1500.5, { code: "USD", decimalPlaces: 2 })).toBe("−1 500.50 USD");
  });
});

describe("normalizeText", () => {
  it("quita acentos y pasa a minúsculas", () => {
    expect(normalizeText("Azúcar Refinada")).toBe("azucar refinada");
  });
});

describe("discountPct", () => {
  it("calcula el porcentaje redondeado", () => {
    expect(discountPct(80, 100)).toBe(20);
    expect(discountPct(66, 100)).toBe(34);
  });

  it("devuelve 0 sin precio de comparación válido", () => {
    expect(discountPct(80, null)).toBe(0);
    expect(discountPct(80, 80)).toBe(0);
    expect(discountPct(80, 50)).toBe(0);
  });
});
