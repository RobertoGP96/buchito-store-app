"use client";

import { usePathname } from "next/navigation";
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { lazyDialog } from "@/components/lazy-dialog";
import type { CatalogProduct } from "../queries/catalog-queries";

/** Clave en `history.state` de la entrada que abre el drawer. */
const HISTORY_KEY = "buchitoProductDrawer";

interface ProductDrawerApi {
  openProduct: (product: CatalogProduct) => void;
}

interface DrawerState {
  product: CatalogProduct | null;
  open: boolean;
  /** Ruta en la que se abrió: si cambia, el drawer se cierra. */
  path: string;
}

const ProductDrawerContext = createContext<ProductDrawerApi | null>(null);

// El chunk del drawer (HeroUI Drawer, carrusel) se descarga en la primera
// apertura y el componente queda montado para animar los cierres.
const LazyProductDrawer = lazyDialog(() => import("./product-drawer").then((m) => m.ProductDrawer));

/** Abre la ficha rápida de un producto sobre la vista actual. Cada apertura
 *  empuja una entrada de historial propia para que el botón «atrás» del
 *  navegador (o el gesto del móvil) cierre el drawer en vez de abandonar la
 *  página; cerrarlo desde el drawer retira esa entrada. Next copia su estado
 *  interno en la entrada, así que al volver no recarga nada. */
export function ProductDrawerProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [state, setState] = useState<DrawerState>({ product: null, open: false, path: "" });

  const openProduct = useCallback((product: CatalogProduct) => {
    setState({ product, open: true, path: window.location.pathname });
    window.history.pushState({ [HISTORY_KEY]: product.slug }, "");
  }, []);

  // Cierre desde el propio drawer: se retira la entrada que lo abrió (si
  // sigue arriba del historial) y el popstate resultante no hace nada más.
  const close = useCallback(() => {
    setState((s) => (s.open ? { ...s, open: false } : s));
    if (window.history.state?.[HISTORY_KEY]) window.history.back();
  }, []);

  // Un enlace del drawer navega: la entrada queda bajo la ruta nueva y al
  // volver atrás el drawer se reabre con el mismo producto.
  const dismiss = useCallback(() => {
    setState((s) => (s.open ? { ...s, open: false } : s));
  }, []);

  useEffect(() => {
    const onPopState = (event: PopStateEvent) => {
      const slug = (event.state as Record<string, unknown> | null)?.[HISTORY_KEY];
      setState((s) => {
        const open = typeof slug === "string" && s.product?.slug === slug;
        return open === s.open ? s : { ...s, open };
      });
    };
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, []);

  // Red de seguridad para navegaciones que no pasan por los enlaces del
  // drawer (buscador, barra inferior tras cerrar a medias).
  useEffect(() => {
    setState((s) => (s.open && s.path !== pathname ? { ...s, open: false } : s));
  }, [pathname]);

  // Calentar el chunk en un hueco libre: la primera apertura sale al instante.
  useEffect(() => {
    const warm = () => {
      void import("./product-drawer");
    };
    if (typeof window.requestIdleCallback === "function") {
      const id = window.requestIdleCallback(warm, { timeout: 3000 });
      return () => window.cancelIdleCallback(id);
    }
    const id = window.setTimeout(warm, 1500);
    return () => window.clearTimeout(id);
  }, []);

  const api = useMemo<ProductDrawerApi>(() => ({ openProduct }), [openProduct]);

  return (
    <ProductDrawerContext.Provider value={api}>
      {children}
      <LazyProductDrawer open={state.open} product={state.product} onClose={close} onNavigate={dismiss} />
    </ProductDrawerContext.Provider>
  );
}

export function useProductDrawer(): ProductDrawerApi {
  const api = useContext(ProductDrawerContext);
  if (!api) throw new Error("useProductDrawer debe usarse dentro de ProductDrawerProvider");
  return api;
}
