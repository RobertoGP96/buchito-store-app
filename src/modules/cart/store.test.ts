import { describe, expect, it } from "vitest";
import {
  cartCount,
  cartIsEmpty,
  cartPriceLines,
  cartReducer,
  normalizeStoredLine,
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

  it("ignora una cantidad NaN en lugar de romper los totales", () => {
    let state = cartReducer(empty, { type: "add", line: line(), qty: 2 });
    state = cartReducer(state, { type: "setQty", variantId: 1, qty: Number.NaN });
    expect(state.lines[0].qty).toBe(2);
    state = cartReducer(state, { type: "add", line: line({ variantId: 2 }), qty: 1 });
    state = cartReducer(state, { type: "addCombo", combo: combo(), qty: 1 });
    state = cartReducer(state, { type: "setComboQty", comboId: 7, qty: Number.NaN });
    expect(state.combos[0].qty).toBe(1);
    expect(cartPriceLines(state).every((l) => Number.isFinite(l.unitPrice * l.qty))).toBe(true);
  });

  it("clear vacía el carrito y conserva hydrated", () => {
    let state = cartReducer(empty, { type: "add", line: line(), qty: 1 });
    state = cartReducer(state, { type: "addCombo", combo: combo(), qty: 1 });
    state = cartReducer(state, { type: "clear" });
    expect(state).toEqual(empty);
    expect(cartIsEmpty(state)).toBe(true);
  });
});

describe("normalizeStoredLine", () => {
  // Carritos guardados antes de la venta por unidad de medida: sin unit ni qtyStep.
  const legacy = (over: Record<string, unknown> = {}): CartLine => {
    const { unit: _unit, qtyStep: _qtyStep, ...rest } = line();
    return { ...rest, qty: 2, ...over } as CartLine;
  };

  it("completa unidad y paso por defecto y el stepper ya no produce NaN", () => {
    const normalized = normalizeStoredLine(legacy());
    expect(normalized).toMatchObject({ unit: "unit", qtyStep: 1, qty: 2 });
    let state = cartReducer(empty, { type: "hydrate", lines: [normalized!], combos: [] });
    state = cartReducer(state, { type: "setQty", variantId: 1, qty: state.lines[0].qty + state.lines[0].qtyStep });
    expect(state.lines[0].qty).toBe(3);
  });

  it("ajusta la cantidad guardada al stock actual y descarta líneas sin precio", () => {
    expect(normalizeStoredLine(legacy({ qty: 50 }))?.qty).toBe(5);
    expect(normalizeStoredLine(legacy({ stock: 0 }))).toBeNull();
    expect(normalizeStoredLine(legacy({ unitPrice: undefined }))).toBeNull();
    expect(normalizeStoredLine(legacy({ unit: "kg", qtyStep: 0.25, qty: 0.5, stock: 2 }))).toMatchObject({
      unit: "kg",
      qtyStep: 0.25,
      qty: 0.5,
    });
  });
});
