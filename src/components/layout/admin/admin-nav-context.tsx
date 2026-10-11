"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

const STORAGE_KEY = "buchito-admin-nav";

interface AdminNavApi {
  /** Sidebar en modo solo iconos (desktop). */
  collapsed: boolean;
  toggleCollapsed: () => void;
  /** Panel lateral abierto (móvil). */
  sheetOpen: boolean;
  setSheetOpen: (open: boolean) => void;
}

const AdminNavContext = createContext<AdminNavApi | null>(null);

export function AdminNavProvider({ children }: { children: React.ReactNode }) {
  // El primer render debe coincidir con el servidor (expandido); la
  // preferencia guardada se aplica al hidratar.
  const [collapsed, setCollapsed] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);

  useEffect(() => {
    try {
      setCollapsed(localStorage.getItem(STORAGE_KEY) === "collapsed");
    } catch {
      // Sin storage: se queda expandido.
    }
  }, []);

  const toggleCollapsed = useCallback(() => {
    setCollapsed((prev) => {
      const next = !prev;
      try {
        localStorage.setItem(STORAGE_KEY, next ? "collapsed" : "expanded");
      } catch {
        // Modo privado: la preferencia dura la sesión.
      }
      return next;
    });
  }, []);

  const value = useMemo(
    () => ({ collapsed, toggleCollapsed, sheetOpen, setSheetOpen }),
    [collapsed, toggleCollapsed, sheetOpen]
  );

  return <AdminNavContext.Provider value={value}>{children}</AdminNavContext.Provider>;
}

export function useAdminNav(): AdminNavApi {
  const context = useContext(AdminNavContext);
  if (!context) throw new Error("useAdminNav debe usarse dentro de AdminNavProvider");
  return context;
}
