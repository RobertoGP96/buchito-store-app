"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useReducer,
} from "react";

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
  stock: number;
  qty: number;
}

export interface CartState {
  lines: CartLine[];
  hydrated: boolean;
}

type CartAction =
  | { type: "hydrate"; lines: CartLine[] }
  | { type: "add"; line: Omit<CartLine, "qty">; qty: number }
  | { type: "setQty"; variantId: number; qty: number }
  | { type: "remove"; variantId: number }
  | { type: "clear" };

export const CART_STORAGE_KEY = "buchito-cart-v1";

export const MAX_LINE_QTY = 99;

export function cartCount(state: Pick<CartState, "lines">): number {
  return state.lines.reduce((sum, line) => sum + line.qty, 0);
}

export function cartReducer(state: CartState, action: CartAction): CartState {
  switch (action.type) {
    case "hydrate":
      return { lines: action.lines, hydrated: true };
    case "add": {
      const existing = state.lines.find(
        (l) => l.variantId === action.line.variantId
      );
      const cap = Math.min(MAX_LINE_QTY, action.line.stock);
      if (existing) {
        const qty = Math.min(cap, existing.qty + action.qty);
        return {
          ...state,
          lines: state.lines.map((l) =>
            l.variantId === action.line.variantId
              ? { ...l, ...action.line, qty }
              : l
          ),
        };
      }
      return {
        ...state,
        lines: [
          ...state.lines,
          { ...action.line, qty: Math.max(1, Math.min(cap, action.qty)) },
        ],
      };
    }
    case "setQty": {
      if (action.qty <= 0) {
        return {
          ...state,
          lines: state.lines.filter((l) => l.variantId !== action.variantId),
        };
      }
      return {
        ...state,
        lines: state.lines.map((l) =>
          l.variantId === action.variantId
            ? { ...l, qty: Math.min(MAX_LINE_QTY, l.stock, action.qty) }
            : l
        ),
      };
    }
    case "remove":
      return {
        ...state,
        lines: state.lines.filter((l) => l.variantId !== action.variantId),
      };
    case "clear":
      return { ...state, lines: [] };
  }
}

interface CartApi {
  state: CartState;
  addToCart: (line: Omit<CartLine, "qty">, qty?: number) => void;
  setQty: (variantId: number, qty: number) => void;
  removeLine: (variantId: number) => void;
  clearCart: () => void;
}

const CartContext = createContext<CartApi | null>(null);

function readStorage(): CartLine[] {
  try {
    const raw = localStorage.getItem(CART_STORAGE_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (l): l is CartLine =>
        typeof l === "object" &&
        l !== null &&
        typeof (l as CartLine).variantId === "number" &&
        typeof (l as CartLine).qty === "number"
    );
  } catch {
    return [];
  }
}

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(cartReducer, {
    lines: [],
    hydrated: false,
  });

  // El carrito vive en localStorage: hasta hidratar, servidor y cliente deben
  // coincidir en "vacío" o React descarta el árbol.
  useEffect(() => {
    dispatch({ type: "hydrate", lines: readStorage() });
  }, []);

  useEffect(() => {
    if (!state.hydrated) return;
    try {
      localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(state.lines));
    } catch {
      // Modo privado / storage lleno: el carrito vive solo en esta sesión.
    }
  }, [state.lines, state.hydrated]);

  const addToCart = useCallback(
    (line: Omit<CartLine, "qty">, qty = 1) => dispatch({ type: "add", line, qty }),
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
  const clearCart = useCallback(() => dispatch({ type: "clear" }), []);

  const value = useMemo(
    () => ({ state, addToCart, setQty, removeLine, clearCart }),
    [state, addToCart, setQty, removeLine, clearCart]
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart(): CartApi {
  const context = useContext(CartContext);
  if (!context) throw new Error("useCart debe usarse dentro de CartProvider");
  return context;
}
