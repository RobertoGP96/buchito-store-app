"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronsLeft, ChevronsRight, Store } from "lucide-react";
import { BrandLogo } from "@/components/brand-logo";
import { NavIcon } from "@/components/nav-icon";
import { ADMIN_NAV_SECTIONS, isNavActive, type NavEntry } from "@/lib/nav-registry";
import { useAdminNav } from "@/components/layout/admin/admin-nav-context";
import { cn } from "@/lib/utils";

function SidebarLink({ entry, collapsed }: { entry: NavEntry; collapsed: boolean }) {
  const pathname = usePathname();
  const active = isNavActive(entry, pathname);
  const Icon = entry.icon;
  return (
    <li>
      <Link
        href={entry.href}
        aria-current={active ? "page" : undefined}
        title={collapsed ? entry.label : undefined}
        aria-label={collapsed ? entry.label : undefined}
        className={cn(
          "flex items-center gap-3 rounded-chip text-[13px] font-medium transition-colors duration-150",
          collapsed ? "h-10 w-10 justify-center" : "px-3 py-2",
          active
            ? "bg-white/10 font-semibold text-white"
            : "text-footer-muted hover:bg-white/5 hover:text-white"
        )}
      >
        <NavIcon icon={Icon} className="h-4 w-4 flex-none" strokeWidth={active ? 2.1 : 1.9} />
        {!collapsed && <span className="truncate">{entry.label}</span>}
      </Link>
    </li>
  );
}

/** Sidebar de desktop en navy pleno, colapsable a solo iconos. El estado se
 *  recuerda entre sesiones (AdminNavProvider). */
export function AdminSidebar() {
  const { collapsed, toggleCollapsed } = useAdminNav();

  return (
    <aside
      className={cn(
        "sticky top-0 hidden h-dvh flex-none flex-col bg-footer text-footer-fg transition-[width] duration-200 md:flex",
        collapsed ? "w-[68px]" : "w-[240px]"
      )}
    >
      <div className={cn("flex items-center pt-5 pb-4", collapsed ? "justify-center px-0" : "justify-between px-5")}>
        {collapsed ? (
          <Link href="/admin" aria-label="Ir al panel" className="flex h-9 w-9 items-center justify-center rounded-[10px] bg-brand-tile text-brand-tile-fg shadow-card">
            <Store className="h-[18px] w-[18px]" strokeWidth={2} />
          </Link>
        ) : (
          <BrandLogo tone="inverse" href="/admin" />
        )}
      </div>

      <nav
        aria-label="Secciones del panel"
        className={cn("no-scrollbar min-h-0 flex-1 overflow-y-auto pb-3", collapsed ? "px-3.5" : "px-3")}
      >
        {ADMIN_NAV_SECTIONS.map((section) => (
          <div key={section.id} className={cn(section.label && (collapsed ? "mt-3 border-t border-footer-line pt-3" : "mt-4"))}>
            {section.label && !collapsed && (
              <p className="eyebrow mb-1.5 px-3 text-gold-500">{section.label}</p>
            )}
            <ul className={cn("flex flex-col gap-0.5", collapsed && "items-center")}>
              {section.items.map((entry) => (
                <SidebarLink key={entry.id} entry={entry} collapsed={collapsed} />
              ))}
            </ul>
          </div>
        ))}
      </nav>

      <div className={cn("border-t border-footer-line py-3", collapsed ? "flex flex-col items-center gap-1 px-0" : "px-3")}>
        {!collapsed && (
          <Link
            href="/"
            className="flex items-center gap-3 rounded-chip px-3 py-2 text-[13px] font-medium text-footer-muted transition-colors duration-150 hover:bg-white/5 hover:text-white"
          >
            <Store className="h-4 w-4 flex-none" strokeWidth={1.9} />
            Ver la tienda
          </Link>
        )}
        <div className={cn("flex items-center", collapsed ? "justify-center" : "justify-end px-3 pt-1")}>
          <button
            type="button"
            onClick={toggleCollapsed}
            aria-label={collapsed ? "Expandir menú" : "Contraer menú"}
            title={collapsed ? "Expandir menú" : "Contraer menú"}
            className="flex h-9 w-9 items-center justify-center rounded-full text-footer-muted transition-colors duration-150 hover:bg-white/10 hover:text-white"
          >
            {collapsed ? (
              <ChevronsRight className="h-4 w-4" strokeWidth={2} />
            ) : (
              <ChevronsLeft className="h-4 w-4" strokeWidth={2} />
            )}
          </button>
        </div>
      </div>
    </aside>
  );
}
