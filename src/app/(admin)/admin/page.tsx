import type { Metadata } from "next";
import { Inbox, LayoutDashboard, Package, PackageCheck, Truck } from "lucide-react";
import { PageHeader } from "@/components/page-header";

export const metadata: Metadata = { title: "Panel" };
export const dynamic = "force-dynamic";

const TILES = [
  { label: "Pedidos pendientes", value: 0, icon: Inbox, href: "/admin/pedidos" },
  { label: "Listos para entregar", value: 0, icon: PackageCheck, href: "/admin/pedidos" },
  { label: "Entregas en curso", value: 0, icon: Truck, href: "/admin/entregas" },
  { label: "Stock bajo", value: 0, icon: Package, href: "/admin/productos" },
];

export default function AdminHomePage() {
  return (
    <>
      <PageHeader
        icon={LayoutDashboard}
        title="Panel"
        description="Resumen del día: pedidos, entregas y stock."
      />
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4 md:gap-4">
        {TILES.map((tile) => {
          const Icon = tile.icon;
          return (
            <a
              key={tile.label}
              href={tile.href}
              className="flex min-h-[104px] flex-col justify-between rounded-card bg-canvas p-4 shadow-card transition-shadow duration-200 hover:shadow-float"
            >
              <span className="flex h-8 w-8 items-center justify-center rounded-chip bg-tint text-navy-700">
                <Icon className="h-4 w-4" strokeWidth={1.9} />
              </span>
              <div>
                <p className="tabular font-display text-[26px] leading-none text-navy-900">
                  {tile.value}
                </p>
                <p className="mt-1.5 text-[12px] font-medium text-slate-500">{tile.label}</p>
              </div>
            </a>
          );
        })}
      </div>
    </>
  );
}
