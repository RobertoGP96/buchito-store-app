"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ADMIN_NAV_SECTIONS, findNavEntry, type NavSection } from "@/lib/nav-registry";
import { cn } from "@/lib/utils";

interface AdminNavListProps {
  /** Ids a excluir (p. ej. los que ya están en las tabs inferiores). */
  exclude?: readonly string[];
  /** Cada ítem en una card de dos columnas (hoja "Más") o en lista (panel lateral). */
  layout?: "grid" | "list";
  onNavigate?: () => void;
}

/** Secciones completas del panel en fondo claro: la usan la hoja "Más" de las
 *  tabs inferiores y el panel lateral móvil. */
export function AdminNavList({ exclude = [], layout = "list", onNavigate }: AdminNavListProps) {
  const pathname = usePathname();
  const current = findNavEntry(pathname);
  const excluded = new Set(exclude);
  const sections: NavSection[] = ADMIN_NAV_SECTIONS.map((section) => ({
    ...section,
    items: section.items.filter((entry) => !excluded.has(entry.id)),
  })).filter((section) => section.items.length > 0);

  return (
    <div className="flex flex-col gap-5">
      {sections.map((section) => (
        <div key={section.id}>
          {section.label && <p className="eyebrow mb-2">{section.label}</p>}
          <ul className={cn(layout === "grid" ? "grid grid-cols-2 gap-2" : "flex flex-col gap-1")}>
            {section.items.map((entry) => {
              const Icon = entry.icon;
              const active = current?.id === entry.id;
              return (
                <li key={entry.id}>
                  <Link
                    href={entry.href}
                    onClick={onNavigate}
                    aria-current={active ? "page" : undefined}
                    className={cn(
                      "flex items-center gap-3 rounded-field border-[1.5px] px-3.5 py-3 text-[13px] font-semibold transition-colors duration-150",
                      layout === "list" && "border-transparent py-2.5",
                      active
                        ? "border-navy-700 bg-tint text-navy-700"
                        : layout === "grid"
                          ? "border-line text-slate-500 hover:border-navy-700 hover:text-navy-700"
                          : "text-slate-500 hover:bg-hover hover:text-navy-700"
                    )}
                  >
                    <Icon className="h-4 w-4 flex-none" strokeWidth={1.9} />
                    <span className="truncate">{entry.label}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </div>
  );
}
