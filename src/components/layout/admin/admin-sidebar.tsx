"use client";

import { useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronDown, ChevronsLeft, ChevronsRight, Store } from "lucide-react";
import { BrandLogo, BrandMark } from "@/components/brand-logo";
import {
  ADMIN_NAV_SECTIONS,
  findNavEntry,
  findNavSection,
  isNavActive,
  type NavEntry,
  type NavSection,
} from "@/lib/nav-registry";
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
          "type-meta relative flex items-center gap-3 rounded-chip font-medium transition-colors duration-150",
          collapsed ? "h-10 w-10 justify-center" : "px-3 py-2",
          active
            ? "bg-footer-active font-semibold text-footer-strong"
            : "text-footer-muted hover:bg-footer-hover hover:text-footer-fg"
        )}
      >
        {/* El activo se reconoce por tres señales, no solo por un velo: barra
            caramelo, icono caramelo y texto en blanco pleno. */}
        {active && (
          <span aria-hidden className="absolute top-2 bottom-2 left-0 w-[3px] rounded-full bg-caramelo-500" />
        )}
        <Icon className={cn("h-4 w-4 flex-none", active && "text-caramelo-500")} strokeWidth={active ? 2.1 : 1.9} />
        {!collapsed && <span className="truncate">{entry.label}</span>}
      </Link>
    </li>
  );
}

function SidebarSection({ section, collapsed }: { section: NavSection; collapsed: boolean }) {
  const { isSectionOpen, toggleSection } = useAdminNav();
  const bodyId = `admin-nav-${section.id}`;
  // Con el sidebar a solo iconos no hay cabeceras: se muestran todos los
  // enlaces aunque la sección esté plegada.
  const open = collapsed || !section.label || isSectionOpen(section.id);

  return (
    <div className={cn(section.label && (collapsed ? "mt-3 border-t border-footer-line pt-3" : "mt-3"))}>
      {section.label && !collapsed && (
        <button
          type="button"
          onClick={() => toggleSection(section.id)}
          aria-expanded={open}
          aria-controls={bodyId}
          className="eyebrow flex w-full items-center justify-between rounded-chip px-3 py-2 text-caramelo-500 transition-colors duration-150 hover:bg-footer-hover"
        >
          <span>{section.label}</span>
          <ChevronDown
            className={cn("h-3.5 w-3.5 transition-transform duration-200", !open && "-rotate-90")}
            strokeWidth={2.2}
            aria-hidden
          />
        </button>
      )}
      <div id={bodyId} className="nav-section-body" data-open={open}>
        <div inert={!open}>
          <ul
            className={cn(
              "flex flex-col gap-0.5",
              collapsed && "items-center",
              section.label && !collapsed && "pb-1"
            )}
          >
            {section.items.map((entry) => (
              <SidebarLink key={entry.id} entry={entry} collapsed={collapsed} />
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}

/** Sidebar de desktop en café pleno, colapsable a solo iconos y con las
 *  secciones plegables. Ambos estados se recuerdan entre sesiones
 *  (AdminNavProvider, cookies). */
export function AdminSidebar() {
  const pathname = usePathname();
  const { collapsed, toggleCollapsed, openSection } = useAdminNav();

  // Al llegar a una ruta (buscador, enlace profundo) su sección se despliega
  // para que el enlace activo se vea; después el usuario puede volver a plegarla.
  useEffect(() => {
    const entry = findNavEntry(pathname);
    const section = entry ? findNavSection(entry.id) : undefined;
    if (section) openSection(section.id);
  }, [pathname, openSection]);

  return (
    <aside
      className={cn(
        // `on-brand`: sobre el café el anillo de foco café no se ve; aquí es claro.
        "on-brand sticky top-0 hidden h-dvh flex-none flex-col bg-footer text-footer-fg transition-[width] duration-200 md:flex",
        collapsed ? "w-[68px]" : "w-[240px]"
      )}
    >
      <div className={cn("flex items-center pt-5 pb-4", collapsed ? "justify-center px-0" : "justify-between px-5")}>
        {collapsed ? (
          <Link href="/admin" aria-label="Ir al panel" className="transition-opacity duration-150 hover:opacity-85">
            <BrandMark tone="inverse" />
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
          <SidebarSection key={section.id} section={section} collapsed={collapsed} />
        ))}
      </nav>

      <div className={cn("border-t border-footer-line py-3", collapsed ? "flex flex-col items-center gap-1 px-0" : "px-3")}>
        {!collapsed && (
          <Link
            href="/"
            className="flex items-center gap-3 rounded-chip px-3 py-2 type-meta font-medium text-footer-muted transition-colors duration-150 hover:bg-footer-hover hover:text-footer-fg"
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
            className="flex h-9 w-9 items-center justify-center rounded-full text-footer-muted transition-colors duration-150 hover:bg-footer-active hover:text-footer-fg"
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
