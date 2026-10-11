import Link from "next/link";
import {
  Banknote,
  CalendarRange,
  Inbox,
  Package,
  PackageCheck,
  Truck,
  UserX,
  Wallet,
  type LucideIcon,
} from "lucide-react";
import { Money } from "@/components/money";
import { cn } from "@/lib/utils";
import type { DashboardKpis } from "../queries/dashboard-queries";

interface Tile {
  label: string;
  value: React.ReactNode;
  hint: string;
  icon: LucideIcon;
  href: string;
  tone?: "warn";
}

function plural(n: number, singular: string, pluralForm: string): string {
  return `${n} ${n === 1 ? singular : pluralForm}`;
}

/** Fila de KPIs: 2 columnas en móvil, 4 en desktop. Cada tesela navega a su módulo. */
export function KpiTiles({ kpis }: { kpis: DashboardKpis }) {
  const tiles: Tile[] = [
    {
      label: "Ventas de hoy",
      value: <Money value={kpis.salesToday} />,
      hint: plural(kpis.ordersToday, "pedido", "pedidos"),
      icon: Banknote,
      href: "/admin/pedidos",
    },
    {
      label: "Ventas últimos 7 días",
      value: <Money value={kpis.salesLast7Days} />,
      hint: plural(kpis.ordersLast7Days, "pedido", "pedidos"),
      icon: CalendarRange,
      href: "/admin/pedidos",
    },
    {
      label: "Por cobrar",
      value: <Money value={kpis.receivable} />,
      hint: plural(kpis.receivableOrders, "pedido sin pagar", "pedidos sin pagar"),
      icon: Wallet,
      href: "/admin/cobros",
      tone: kpis.receivable > 0 ? "warn" : undefined,
    },
    {
      label: "Pedidos pendientes",
      value: kpis.pendingOrders,
      hint: "Esperan confirmación",
      icon: Inbox,
      href: "/admin/pedidos?status=pending",
      tone: kpis.pendingOrders > 0 ? "warn" : undefined,
    },
    {
      label: "Listos para entregar",
      value: kpis.readyOrders,
      hint: "Preparados en tienda",
      icon: PackageCheck,
      href: "/admin/pedidos?status=ready",
    },
    {
      label: "Entregas en curso",
      value: kpis.deliveriesInProgress,
      hint: "Asignadas o en camino",
      icon: Truck,
      href: "/admin/entregas",
    },
    {
      label: "Entregas sin asignar",
      value: kpis.deliveriesUnassigned,
      hint: "Sin mensajero",
      icon: UserX,
      href: "/admin/entregas?status=pending",
      tone: kpis.deliveriesUnassigned > 0 ? "warn" : undefined,
    },
    {
      label: "Variantes con stock bajo",
      value: kpis.lowStockVariants,
      hint: `Stock ≤ ${kpis.lowStockThreshold}`,
      icon: Package,
      href: "/admin/inventario",
      tone: kpis.lowStockVariants > 0 ? "warn" : undefined,
    },
  ];

  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-4 md:gap-4">
      {tiles.map((tile) => {
        const Icon = tile.icon;
        return (
          <Link
            key={tile.label}
            href={tile.href}
            className="flex min-h-[116px] flex-col justify-between rounded-card bg-canvas p-4 shadow-card transition-shadow duration-200 hover:shadow-float"
          >
            <span className="flex h-8 w-8 items-center justify-center rounded-chip bg-tint text-navy-700">
              <Icon className="h-4 w-4" strokeWidth={1.9} />
            </span>
            <div className="min-w-0">
              <p
                className={cn(
                  "tabular font-display truncate text-[22px] leading-none md:text-[26px]",
                  tile.tone === "warn" ? "text-warn" : "text-navy-900"
                )}
              >
                {tile.value}
              </p>
              <p className="mt-1.5 text-[12px] font-medium text-slate-500">{tile.label}</p>
              <p className="tabular mt-0.5 text-[11.5px] text-slate-400">{tile.hint}</p>
            </div>
          </Link>
        );
      })}
    </div>
  );
}
