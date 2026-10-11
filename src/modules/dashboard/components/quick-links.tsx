import Link from "next/link";
import { Compass } from "lucide-react";
import { ADMIN_NAV_SECTIONS } from "@/lib/nav-registry";
import { DashboardCard } from "./dashboard-card";

/** Accesos rápidos a todas las secciones del panel, agrupadas como la navegación. */
export function QuickLinks() {
  const sections = ADMIN_NAV_SECTIONS.map((section) => ({
    ...section,
    items: section.items.filter((item) => item.id !== "home"),
  })).filter((section) => section.items.length > 0);

  return (
    <DashboardCard icon={Compass} title="Accesos rápidos" description="Todas las secciones del panel">
      <div className="flex flex-col gap-5">
        {sections.map((section) => (
          <div key={section.id}>
            {section.label && <p className="eyebrow mb-2.5">{section.label}</p>}
            <ul className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-4">
              {section.items.map((item) => {
                const Icon = item.icon;
                return (
                  <li key={item.id}>
                    <Link
                      href={item.href}
                      className="group flex h-full items-start gap-3 rounded-field border border-line-soft bg-cream-50 p-3 transition-colors hover:border-tint-strong hover:bg-tint"
                    >
                      <span className="flex h-9 w-9 flex-none items-center justify-center rounded-chip bg-tint text-navy-700 transition-colors group-hover:bg-canvas">
                        <Icon className="h-4 w-4" strokeWidth={1.9} />
                      </span>
                      <span className="min-w-0">
                        <span className="block text-[13.5px] font-semibold text-ink">{item.label}</span>
                        {item.description && (
                          <span className="mt-0.5 block text-[12px] leading-[1.45] text-slate-500">{item.description}</span>
                        )}
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </div>
    </DashboardCard>
  );
}
