import { describe, expect, it } from "vitest";
import {
  comboAvailability,
  comboRegularPrice,
  comboSavingsPct,
  prorateComboLines,
} from "./combo-pricing";

describe("comboAvailability", () => {
  it("la limita el componente más escaso", () => {
    expect(
      comboAvailability([
        { qty: 2, stock: 10 },
        { qty: 1, stock: 3 },
      ])
    ).toBe(3);
  });

  it("sin componentes o sin stock es 0", () => {
    expect(comboAvailability([])).toBe(0);
    expect(comboAvailability([{ qty: 1, stock: 0 }])).toBe(0);
  });
});

describe("comboRegularPrice / comboSavingsPct", () => {
  it("suma los componentes y calcula el ahorro", () => {
    const regular = comboRegularPrice(
      [
        { qty: 2, unitPriceBase: 850 },
        { qty: 1, unitPriceBase: 1300 },
      ],
      0
    );
    expect(regular).toBe(3000);
    expect(comboSavingsPct(2400, regular)).toBe(20);
    expect(comboSavingsPct(3000, regular)).toBe(0);
  });
});

describe("prorateComboLines", () => {
  it("reparte el precio en proporción y la suma es exacta", () => {
    const lines = prorateComboLines({
      comboPriceBase: 2400,
      comboQty: 1,
      decimals: 0,
      items: [
        { qty: 2, unitPriceBase: 850 },
        { qty: 1, unitPriceBase: 1300 },
      ],
    });
    expect(lines.map((l) => l.lineTotal)).toEqual([1360, 1040]);
    expect(lines.map((l) => l.qty)).toEqual([2, 1]);
    expect(lines[0].unitPrice).toBe(680);
  });

  it("multiplica por las unidades del combo y absorbe el redondeo", () => {
    const lines = prorateComboLines({
      comboPriceBase: 10,
      comboQty: 3,
      decimals: 2,
      items: [
        { qty: 1, unitPriceBase: 4 },
        { qty: 1, unitPriceBase: 4 },
        { qty: 1, unitPriceBase: 4 },
      ],
    });
    const sum = lines.reduce((s, l) => s + l.lineTotal, 0);
    expect(Math.round(sum * 100) / 100).toBe(30);
    expect(lines.map((l) => l.qty)).toEqual([3, 3, 3]);
    // 30 / 3 = 10 exacto por línea: sin resto que repartir.
    expect(lines.map((l) => l.lineTotal)).toEqual([10, 10, 10]);
  });

  it("con precios regulares a cero reparte por cantidad", () => {
    const lines = prorateComboLines({
      comboPriceBase: 100,
      comboQty: 1,
      decimals: 0,
      items: [
        { qty: 3, unitPriceBase: 0 },
        { qty: 1, unitPriceBase: 0 },
      ],
    });
    expect(lines.map((l) => l.lineTotal)).toEqual([75, 25]);
  });

  it("el resto de la división va a las fracciones mayores", () => {
    const lines = prorateComboLines({
      comboPriceBase: 100,
      comboQty: 1,
      decimals: 0,
      items: [
        { qty: 1, unitPriceBase: 1 },
        { qty: 1, unitPriceBase: 1 },
        { qty: 1, unitPriceBase: 1 },
      ],
    });
    expect(lines.map((l) => l.lineTotal)).toEqual([34, 33, 33]);
  });
});
