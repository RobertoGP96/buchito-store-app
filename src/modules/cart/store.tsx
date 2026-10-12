"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useReducer,
} from "react";
import { MAX_LINE_QTY, maxSellable, snapQty, type SaleUnit } from "@/modules/products/lib/units";

/** Línea del carrito. `unitPrice` va en moneda BASE: lo que la tienda muestra
 *  en otra moneda es solo conversión de display. El servidor recalcula todo
 *  al crear el pedido; aquí solo viajan ids y cantidades. */
export interface CartLine {
  variantId: number;
  productId: number;
  slug: string;
  name: string;
  variantName: string | null;
  sku: string;
  imageUrl: string | null;
  unitPrice: number;
  compareAtPrice: number | null;
  /** Unidad de venta y paso: la cantidad siempre es múltiplo del paso. */
  unit: SaleUnit;
  qtyStep: number;
  stock: number;
  qty: number;
}

/** Combo en el carrito: una unidad agrupa varias variantes con sus cantidades.
 *  `available` es cuántos combos permite el stock de sus componentes. */
export interface CartCombo {
  comboId: number;
  slug: string;
  name: string;
  imageUrl: string | null;
  /** Precio del combo en base. */
  unitPrice: number;
  /** Lo que costarían los componentes por separado, en base. */
  regularPrice: number;
  available: number;
  qty: number;
  items: { variantId: number; productName: string; variantName: string | null; qty: number; unit: SaleUnit }[];
}

export interface CartState {
  lines: CartLine[];
  combos: CartCombo[];
  hydrated: boolean;
}

type CartAction =
  | { type: "hydrate"; lines: CartLine[]; combos: CartCombo[] }
  | { type: "add"; line: Omit<CartLine, "qty">; qty: number }
  | { type: "setQty"; variantId: number; qty: number }
  | { type: "remove"; variantId: number }
  | { type: "addCombo"; combo: Omit<CartCombo, "qty">; qty: number }
  | { type: "setComboQty"; comboId: number; qty: number }
  | { type: "removeCombo"; comboId: number }
  | { type: "clear" };

export const CART_STORAGE_KEY = "buchito-cart-v2";
/** Versión anterior (solo líneas): se migra al leer y se deja de escribir. */
const LEGACY_STORAGE_KEY = "buchito-cart-v1";

export { MAX_LINE_QTY };

/** Cantidad válida para la línea: múltiplo del paso y dentro del stock. */
function clampLineQty(qty: number, line: Pick<CartLine, "stock" | "qtyStep">): number {
  const cap = maxSellable(line.stock, line.qtyStep);
  if (cap <= 0) return 0;
  return Math.min(cap, snapQty(qty, line.qtyStep));
}

export function cartCount(state: Pick<CartState, "lines" | "combos">): number {
  return (
    state.lines.reduce((sum, line) => sum + line.qty, 0) +
    state.combos.reduce((sum, combo) => sum + combo.qty, 0)
  );
}

export function cartIsEmpty(state: Pick<CartState, "lines" | "combos">): boolean {
  return state.lines.length === 0 && state.combos.length === 0;
}

/** Líneas para `computeCartTotals`: productos sueltos y combos, ambos en base. */
export function cartPriceLines(state: Pick<CartState, "lines" | "combos">): { unitPrice: number; qty: number }[] {
  return [
    ...state.lines.map((l) => ({ unitPrice: l.unitPrice, qty: l.qty })),
    ...state.combos.map((c) => ({ unitPrice: c.unitPrice, qty: c.qty })),
  ];
}

export function cartReducer(state: CartState, action: CartAction): CartState {
  switch (action.type) {
    case "hydrate":
      return { lines: action.lines, combos: action.combos, hydrated: true };
    case "add": {
      const existing = state.lines.find(
        (l) => l.variantId === action.line.variantId
      );
      if (existing) {
        const qty = clampLineQty(existing.qty + action.qty, action.line);
        return {
          ...state,
          lines: state.lines.map((l) =>
            l.variantId === action.line.variantId
              ? { ...l, ...action.line, qty }
              : l
          ),
        };
      }
      const qty = clampLineQty(action.qty, action.line);
      // Sin stock para ni un paso no hay nada que añadir.
      if (qty <= 0) return state;
      return { ...state, lines: [...state.lines, { ...action.line, qty }] };
    }
    case "setQty": {
      // Bajar por debajo de un paso quita la línea (el "menos" en el mínimo).
      if (action.qty < 1e-9) {
        return {
          ...state,
          lines: state.lines.filter((l) => l.variantId !== action.variantId),
        };
      }
      return {
        ...state,
        lines: state.lines.map((l) =>
          l.variantId === action.variantId ? { ...l, qty: clampLineQty(action.qty, l) } : l
        ),
      };
    }
    case "remove":
      return {
        ...state,
        lines: state.lines.filter((l) => l.variantId !== action.variantId),
      };
    case "addCombo": {
      const existing = state.combos.find((c) => c.comboId === action.combo.comboId);
      const cap = Math.min(MAX_LINE_QTY, action.combo.available);
      if (existing) {
        const qty = Math.min(cap, existing.qty + action.qty);
        return {
          ...state,
          combos: state.combos.map((c) =>
            c.comboId === action.combo.comboId ? { ...c, ...action.combo, qty } : c
          ),
        };
      }
      return {
        ...state,
        combos: [...state.combos, { ...action.combo, qty: Math.max(1, Math.min(cap, action.qty)) }],
      };
    }
    case "setComboQty": {
      if (action.qty <= 0) {
        return { ...state, combos: state.combos.filter((c) => c.comboId !== action.comboId) };
      }
      return {
        ...state,
        combos: state.combos.map((c) =>
          c.comboId === action.comboId
            ? { ...c, qty: Math.min(MAX_LINE_QTY, c.available, action.qty) }
            : c
        ),
      };
    }
    case "removeCombo":
      return { ...state, combos: state.combos.filter((c) => c.comboId !== action.comboId) };
    case "clear":
      return { ...state, lines: [], combos: [] };
  }
}

interface CartApi {
  state: CartState;
  addToCart: (line: Omit<CartLine, "qty">, qty?: number) => void;
  setQty: (variantId: number, qty: number) => void;
  removeLine: (variantId: number) => void;
  addCombo: (combo: Omit<CartCombo, "qty">, qty?: number) => void;
  setComboQty: (comboId: number, qty: number) => void;
  removeCombo: (comboId: number) => void;
  clearCart: () => void;
}

const CartContext = createContext<CartApi | null>(null);

function isLine(value: unknown): value is CartLine {
  return (
    typeof value === "object" &&
    value !== null &&
    typeof (value as CartLine).variantId === "number" &&
    typeof (value as CartLine).qty === "number"
  );
}

function isCombo(value: unknown): value is CartCombo {
  return (
    typeof value === "object" &&
    value !== null &&
    typeof (value as CartCombo).comboId === "number" &&
    typeof (value as CartCombo).qty === "number" &&
    Array.isArray((value as CartCombo).items)
  );
}

function readStorage(): { lines: CartLine[]; combos: CartCombo[] } {
  try {
    const raw = localStorage.getItem(CART_STORAGE_KEY) ?? localStorage.getItem(LEGACY_STORAGE_KEY);
    if (!raw) return { lines: [], combos: [] };
    const parsed: unknown = JSON.parse(raw);
    // v1 guardaba solo el array de líneas.
    if (Array.isArray(parsed)) return { lines: parsed.filter(isLine), combos: [] };
    if (typeof parsed !== "object" || parsed === null) return { lines: [], combos: [] };
    const data = parsed as { lines?: unknown; combos?: unknown };
    return {
      lines: Array.isArray(data.lines) ? data.lines.filter(isLine) : [],
      combos: Array.isArray(data.combos) ? data.combos.filter(isCombo) : [],
    };
  } catch {
    return { lines: [], combos: [] };
  }
}

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(cartReducer, {
    lines: [],
    combos: [],
    hydrated: false,
  });

  // El carrito vive en localStorage: hasta hidratar, servidor y cliente deben
  // coincidir en "vacío" o React descarta el árbol.
  useEffect(() => {
    dispatch({ type: "hydrate", ...readStorage() });
  }, []);

  useEffect(() => {
    if (!state.hydrated) return;
    try {
      localStorage.setItem(CART_STORAGE_KEY, JSON.stringify({ lines: state.lines, combos: state.combos }));
      localStorage.removeItem(LEGACY_STORAGE_KEY);
    } catch {
      // Modo privado / storage lleno: el carrito vive solo en esta sesión.
    }
  }, [state.lines, state.combos, state.hydrated]);

  const addToCart = useCallback(
    (line: Omit<CartLine, "qty">, qty?: number) => dispatch({ type: "add", line, qty: qty ?? line.qtyStep }),
    []
  );
  const setQty = useCallback(
    (variantId: number, qty: number) => dispatch({ type: "setQty", variantId, qty }),
    []
  );
  const removeLine = useCallback(
    (variantId: number) => dispatch({ type: "remove", variantId }),
    []
  );
  const addCombo = useCallback(
    (combo: Omit<CartCombo, "qty">, qty = 1) => dispatch({ type: "addCombo", combo, qty }),
    []
  );
  const setComboQty = useCallback(
    (comboId: number, qty: number) => dispatch({ type: "setComboQty", comboId, qty }),
    []
  );
  const removeCombo = useCallback((comboId: number) => dispatch({ type: "removeCombo", comboId }), []);
  const clearCart = useCallback(() => dispatch({ type: "clear" }), []);

  const value = useMemo(
    () => ({ state, addToCart, setQty, removeLine, addCombo, setComboQty, removeCombo, clearCart }),
    [state, addToCart, setQty, removeLine, addCombo, setComboQty, removeCombo, clearCart]
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart(): CartApi {
  const context = useContext(CartContext);
  if (!context) throw new Error("useCart debe usarse dentro de CartProvider");
  return context;
}
