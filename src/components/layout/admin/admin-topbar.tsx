"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect } from "react";
import { Drawer } from "@heroui/react";
import { ChevronRight, Menu, Store } from "lucide-react";
import { BrandLogo } from "@/components/brand-logo";
import { ThemeToggle } from "@/components/theme-toggle";
import { AdminNavList } from "@/components/layout/admin/admin-nav-list";
import { AdminSearch } from "@/components/layout/admin/admin-search";
import { useAdminNav } from "@/components/layout/admin/admin-nav-context";
import { AdminUserMenu } from "@/components/layout/admin/admin-user-menu";
import { findNavEntry, findNavSection } from "@/lib/nav-registry";
import { NotificationsBell } from "@/modules/notifications/components/notifications-bell";

interface AdminTopbarProps {
  userName: string;
  role: string;
}

/** Cabecera del panel: en móvil abre el panel lateral y muestra la marca; en
 *  desktop pinta la miga (sección › página). En todas las anchuras lleva el
 *  buscador global, el selector de tema y el menú de usuario. */
export function AdminTopbar({ userName, role }: AdminTopbarProps) {
  const pathname = usePathname();
  const { sheetOpen, setSheetOpen } = useAdminNav();
  // Salvavidas para navegaciones que no pasan por la lista (atrás del
  // navegador, buscador): el Drawer vive en el layout y no se desmonta.
  useEffect(() => setSheetOpen(false), [pathname, setSheetOpen]);
  const entry = findNavEntry(pathname);
  const section = entry ? findNavSection(entry.id) : undefined;

  return (
    <>
      <header className="sticky top-0 z-40 border-b border-line bg-canvas/95 md:bg-canvas/90 md:backdrop-blur-md">
        <div className="flex h-14 items-center gap-2 px-3 md:h-[60px] md:px-8">
          <button
            type="button"
            onClick={() => setSheetOpen(true)}
            aria-label="Abrir menú"
            aria-expanded={sheetOpen}
            className="flex h-9 w-9 items-center justify-center rounded-full text-slate-500 transition-colors duration-150 hover:bg-hover hover:text-navy-700 md:hidden"
          >
            <Menu className="h-5 w-5" strokeWidth={2} />
          </button>
          <BrandLogo size="sm" href="/admin" className="md:hidden" />

          <nav aria-label="Ubicación" className="hidden min-w-0 items-center gap-1.5 text-[13px] md:flex">
            <Link href="/admin" className="font-medium text-slate-400 hover:text-navy-700">
              Panel
            </Link>
            {section?.label && (
              <>
                <ChevronRight className="h-3.5 w-3.5 text-slate-300" strokeWidth={2} />
                <span className="text-slate-400">{section.label}</span>
              </>
            )}
            {entry && entry.href !== "/admin" && (
              <>
                <ChevronRight className="h-3.5 w-3.5 text-slate-300" strokeWidth={2} />
                <span className="truncate font-semibold text-ink">{entry.label}</span>
              </>
            )}
          </nav>

          <div className="ml-auto flex items-center gap-1 md:gap-2">
            <AdminSearch />
            <ThemeToggle className="flex h-9 w-9 items-center justify-center rounded-full hover:bg-hover hover:text-navy-700" />
            <NotificationsBell audience="admin" tone="light" inboxHref="/admin/notificaciones" />
            <AdminUserMenu userName={userName} role={role} />
          </div>
        </div>
      </header>

      <Drawer isOpen={sheetOpen} onOpenChange={setSheetOpen}>
        <Drawer.Backdrop>
          <Drawer.Content placement="left">
            <Drawer.Dialog className="w-[300px] max-w-[88vw] bg-canvas">
              <Drawer.CloseTrigger />
              <Drawer.Header>
                {/* Si ya se está en /admin el pathname no cambia: cierre explícito. */}
                <BrandLogo href="/admin" onClick={() => setSheetOpen(false)} />
              </Drawer.Header>
              <Drawer.Body className="pb-[max(16px,env(safe-area-inset-bottom))]">
                <AdminNavList layout="list" onNavigate={() => setSheetOpen(false)} />
                <Link
                  href="/"
                  onClick={() => setSheetOpen(false)}
                  className="mt-5 flex items-center gap-3 border-t border-line px-3.5 pt-4 text-[13px] font-semibold text-slate-500 hover:text-navy-700"
                >
                  <Store className="h-4 w-4" strokeWidth={1.9} />
                  Ver la tienda
                </Link>
              </Drawer.Body>
            </Drawer.Dialog>
          </Drawer.Content>
        </Drawer.Backdrop>
      </Drawer>
    </>
  );
}
