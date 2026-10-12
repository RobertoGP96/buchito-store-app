import { describe, expect, it } from "vitest";
import {
  cartCount,
  cartIsEmpty,
  cartPriceLines,
  cartReducer,
  type CartCombo,
  type CartLine,
  type CartState,
} from "./store";

const line = (over: Partial<CartLine> = {}): Omit<CartLine, "qty"> => ({
  variantId: 1,
  productId: 1,
  slug: "camisa",
  name: "Camisa",
  variantName: "M",
  sku: "CAM-M",
  imageUrl: null,
  unitPrice: 1000,
  compareAtPrice: null,
  unit: "unit",
  qtyStep: 1,
  stock: 5,
  ...over,
});

const combo = (over: Partial<CartCombo> = {}): Omit<CartCombo, "qty"> => ({
  comboId: 7,
  slug: "combo-basico",
  name: "Combo básico",
  imageUrl: null,
  unitPrice: 2400,
  regularPrice: 3000,
  available: 3,
  items: [{ variantId: 1, productName: "Arroz", variantName: null, qty: 2, unit: "unit" }],
  ...over,
});

const empty: CartState = { lines: [], combos: [], hydrated: true };

describe("cartReducer", () => {
  it("añade y acumula la misma variante sin superar el stock", () => {
    let state = cartReducer(empty, { type: "add", line: line(), qty: 2 });
    state = cartReducer(state, { type: "add", line: line(), qty: 10 });
    expect(state.lines).toHaveLength(1);
    expect(state.lines[0].qty).toBe(5);
    expect(cartCount(state)).toBe(5);
  });

  it("venta por peso: suma por pasos, ajusta al múltiplo y respeta el stock", () => {
    const kg = line({ variantId: 9, unit: "kg", qtyStep: 0.25, stock: 1.1 });
    let state = cartReducer(empty, { type: "add", line: kg, qty: 0.25 });
    state = cartReducer(state, { type: "add", line: kg, qty: 0.25 });
    expect(state.lines[0].qty).toBe(0.5);
    state = cartReducer(state, { type: "setQty", variantId: 9, qty: 0.6 });
    expect(state.lines[0].qty).toBe(0.5);
    state = cartReducer(state, { type: "setQty", variantId: 9, qty: 5 });
    // 1.1 kg de stock: el mayor múltiplo de 0.25 que cabe es 1.
    expect(state.lines[0].qty).toBe(1);
    state = cartReducer(state, { type: "setQty", variantId: 9, qty: 0 });
    expect(state.lines).toHaveLength(0);
  });

  it("no añade una variante sin stock para un paso", () => {
    const state = cartReducer(empty, { type: "add", line: line({ stock: 0 }), qty: 1 });
    expect(state.lines).toHaveLength(0);
  });

  it("setQty a 0 elimina la línea", () => {
    let state = cartReducer(empty, { type: "add", line: line(), qty: 1 });
    state = cartReducer(state, { type: "setQty", variantId: 1, qty: 0 });
    expect(state.lines).toHaveLength(0);
  });

  it("añade combos sin superar su disponibilidad y los cuenta", () => {
    let state = cartReducer(empty, { type: "addCombo", combo: combo(), qty: 2 });
    state = cartReducer(state, { type: "addCombo", combo: combo(), qty: 5 });
    expect(state.combos).toHaveLength(1);
    expect(state.combos[0].qty).toBe(3);
    state = cartReducer(state, { type: "add", line: line(), qty: 1 });
    expect(cartCount(state)).toBe(4);
    expect(cartIsEmpty(state)).toBe(false);
  });

  it("setComboQty a 0 elimina el combo y cartPriceLines mezcla ambos", () => {
    let state = cartReducer(empty, { type: "addCombo", combo: combo(), qty: 1 });
    state = cartReducer(state, { type: "add", line: line(), qty: 2 });
    expect(cartPriceLines(state)).toEqual([
      { unitPrice: 1000, qty: 2 },
      { unitPrice: 2400, qty: 1 },
    ]);
    state = cartReducer(state, { type: "setComboQty", comboId: 7, qty: 0 });
    expect(state.combos).toHaveLength(0);
  });

  it("clear vacía el carrito y conserva hydrated", () => {
    let state = cartReducer(empty, { type: "add", line: line(), qty: 1 });
    state = cartReducer(state, { type: "addCombo", combo: combo(), qty: 1 });
    state = cartReducer(state, { type: "clear" });
    expect(state).toEqual(empty);
    expect(cartIsEmpty(state)).toBe(true);
  });
});
