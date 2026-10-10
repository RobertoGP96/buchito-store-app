import { describe, expect, it } from "vitest";
import { cartCount, cartReducer, type CartLine, type CartState } from "./store";

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
  stock: 5,
  ...over,
});

const empty: CartState = { lines: [], hydrated: true };

describe("cartReducer", () => {
  it("añade y acumula la misma variante sin superar el stock", () => {
    let state = cartReducer(empty, { type: "add", line: line(), qty: 2 });
    state = cartReducer(state, { type: "add", line: line(), qty: 10 });
    expect(state.lines).toHaveLength(1);
    expect(state.lines[0].qty).toBe(5);
    expect(cartCount(state)).toBe(5);
  });

  it("setQty a 0 elimina la línea", () => {
    let state = cartReducer(empty, { type: "add", line: line(), qty: 1 });
    state = cartReducer(state, { type: "setQty", variantId: 1, qty: 0 });
    expect(state.lines).toHaveLength(0);
  });

  it("clear vacía el carrito y conserva hydrated", () => {
    let state = cartReducer(empty, { type: "add", line: line(), qty: 1 });
    state = cartReducer(state, { type: "clear" });
    expect(state).toEqual(empty);
  });
});
