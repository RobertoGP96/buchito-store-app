"use client";

import { createContext, useCallback, useContext, useMemo, useState } from "react";
import {
  ADMIN_NAV_COOKIE,
  ADMIN_NAV_SECTIONS_COOKIE,
  serializeCollapsedSections,
  writePreferenceCookie,
} from "@/lib/preferences";

interface AdminNavApi {
  /** Sidebar en modo solo iconos (desktop). */
  collapsed: boolean;
  toggleCollapsed: () => void;
  /** Secciones del sidebar plegadas por el usuario. */
  isSectionOpen: (sectionId: string) => boolean;
  toggleSection: (sectionId: string) => void;
  /** Despliega una sección si estaba plegada (p. ej. la de la ruta activa). */
  openSection: (sectionId: string) => void;
  /** Panel lateral abierto (móvil). */
  sheetOpen: boolean;
  setSheetOpen: (open: boolean) => void;
}

const AdminNavContext = createContext<AdminNavApi | null>(null);

export function AdminNavProvider({
  initialCollapsed = false,
  initialCollapsedSections = [],
  children,
}: {
  initialCollapsed?: boolean;
  initialCollapsedSections?: string[];
  children: React.ReactNode;
}) {
  // Las preferencias llegan del layout servidor (cookies): el primer render ya
  // tiene el ancho y las secciones definitivas y el sidebar no salta al hidratar.
  const [collapsed, setCollapsed] = useState(initialCollapsed);
  const [collapsedSections, setCollapsedSections] = useState<ReadonlySet<string>>(
    () => new Set(initialCollapsedSections)
  );
  const [sheetOpen, setSheetOpen] = useState(false);

  const toggleCollapsed = useCallback(() => {
    setCollapsed((prev) => {
      const next = !prev;
      writePreferenceCookie(ADMIN_NAV_COOKIE, next ? "collapsed" : "expanded");
      return next;
    });
  }, []);

  const updateSections = useCallback((mutate: (next: Set<string>) => void) => {
    setCollapsedSections((prev) => {
      const next = new Set(prev);
      mutate(next);
      if (next.size === prev.size && Array.from(next).every((id) => prev.has(id))) return prev;
      writePreferenceCookie(ADMIN_NAV_SECTIONS_COOKIE, serializeCollapsedSections(next));
      return next;
    });
  }, []);

  const toggleSection = useCallback(
    (sectionId: string) => {
      updateSections((next) => {
        if (next.has(sectionId)) next.delete(sectionId);
        else next.add(sectionId);
      });
    },
    [updateSections]
  );

  const openSection = useCallback(
    (sectionId: string) => updateSections((next) => void next.delete(sectionId)),
    [updateSections]
  );

  const isSectionOpen = useCallback((sectionId: string) => !collapsedSections.has(sectionId), [collapsedSections]);

  const value = useMemo(
    () => ({ collapsed, toggleCollapsed, isSectionOpen, toggleSection, openSection, sheetOpen, setSheetOpen }),
    [collapsed, toggleCollapsed, isSectionOpen, toggleSection, openSection, sheetOpen]
  );

  return <AdminNavContext.Provider value={value}>{children}</AdminNavContext.Provider>;
}

export function useAdminNav(): AdminNavApi {
  const context = useContext(AdminNavContext);
  if (!context) throw new Error("useAdminNav debe usarse dentro de AdminNavProvider");
  return context;
}
