"use client";

import { createContext, useCallback, useContext, useMemo, useState } from "react";
import { ADMIN_NAV_COOKIE, writePreferenceCookie } from "@/lib/preferences";

interface AdminNavApi {
  /** Sidebar en modo solo iconos (desktop). */
  collapsed: boolean;
  toggleCollapsed: () => void;
  /** Panel lateral abierto (móvil). */
  sheetOpen: boolean;
  setSheetOpen: (open: boolean) => void;
}

const AdminNavContext = createContext<AdminNavApi | null>(null);

export function AdminNavProvider({
  initialCollapsed = false,
  children,
}: {
  initialCollapsed?: boolean;
  children: React.ReactNode;
}) {
  // La preferencia llega del layout servidor (cookie): el primer render ya
  // tiene el ancho definitivo y el sidebar no salta al hidratar.
  const [collapsed, setCollapsed] = useState(initialCollapsed);
  const [sheetOpen, setSheetOpen] = useState(false);

  const toggleCollapsed = useCallback(() => {
    setCollapsed((prev) => {
      const next = !prev;
      writePreferenceCookie(ADMIN_NAV_COOKIE, next ? "collapsed" : "expanded");
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
