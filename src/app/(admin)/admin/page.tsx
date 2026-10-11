import type { Metadata } from "next";
import Link from "next/link";
import { Inbox, LayoutDashboard, Package, PackageCheck, Truck, type LucideIcon } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { getDeliveryCounts } from "@/modules/deliveries/queries/delivery-queries";
import { getOrderCounts } from "@/modules/orders/queries/order-queries";
import { getLowStockCount } from "@/modules/products/queries/product-queries";
import { getStoreSettings } from "@/modules/settings/queries/settings-queries";

export const metadata: Metadata = { title: "Panel" };
export const dynamic = "force-dynamic";

interface Tile {
  label: string;
  value: number;
  icon: LucideIcon;
  href: string;
  tone?: "warn";
}

export default async function AdminHomePage() {
  const settings = await getStoreSettings();
  const [orders, deliveries, lowStock] = await Promise.all([
    getOrderCounts(),
    getDeliveryCounts(),
    getLowStockCount(settings.lowStockThreshold),
  ]);

  const tiles: Tile[] = [
    { label: "Pedidos pendientes", value: orders.pending, icon: Inbox, href: "/admin/pedidos?status=pending", tone: orders.pending > 0 ? "warn" : undefined },
    { label: "Listos para entregar", value: orders.ready, icon: PackageCheck, href: "/admin/pedidos?status=ready" },
    { label: "Entregas en curso", value: deliveries.inTransit, icon: Truck, href: "/admin/entregas" },
    { label: "Variantes con stock bajo", value: lowStock, icon: Package, href: "/admin/productos", tone: lowStock > 0 ? "warn" : undefined },
  ];

  return (
    <>
      <PageHeader icon={LayoutDashboard} title="Panel" description="Resumen del día: pedidos, entregas y stock." />
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4 md:gap-4">
        {tiles.map((tile) => {
          const Icon = tile.icon;
          return (
            <Link
              key={tile.label}
              href={tile.href}
              className="flex min-h-[104px] flex-col justify-between rounded-card bg-canvas p-4 shadow-card transition-shadow duration-200 hover:shadow-float"
            >
              <span className="flex h-8 w-8 items-center justify-center rounded-chip bg-tint text-navy-700">
                <Icon className="h-4 w-4" strokeWidth={1.9} />
              </span>
              <div>
                <p className={`tabular font-display text-[26px] leading-none ${tile.tone === "warn" ? "text-warn" : "text-navy-900"}`}>
                  {tile.value}
                </p>
                <p className="mt-1.5 text-[12px] font-medium text-slate-500">{tile.label}</p>
              </div>
            </Link>
          );
        })}
      </div>
    </>
  );
}
