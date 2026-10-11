import Link from "next/link";
import {
  ArrowUpRight,
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
  /** `warn`: el valor pide atención. `featured`: la tesela principal, en navy. */
  tone?: "warn" | "featured";
}

interface TileGroup {
  label: string;
  tiles: Tile[];
}

function plural(n: number, singular: string, pluralForm: string): string {
  return `${n} ${n === 1 ? singular : pluralForm}`;
}

/** KPIs en dos filas con cabecera (ventas y operaciones), 2 columnas en móvil
 *  y 4 en desktop. Cada tesela navega a su módulo; la primera va destacada. */
export function KpiTiles({ kpis }: { kpis: DashboardKpis }) {
  const groups: TileGroup[] = [
    {
      label: "Ventas",
      tiles: [
        {
          label: "Ventas de hoy",
          value: <Money value={kpis.salesToday} />,
          hint: plural(kpis.ordersToday, "pedido", "pedidos"),
          icon: Banknote,
          href: "/admin/pedidos",
          tone: "featured",
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
      ],
    },
    {
      label: "Operaciones",
      tiles: [
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
          hint: `Stock máximo ${kpis.lowStockThreshold}`,
          icon: Package,
          href: "/admin/inventario",
          tone: kpis.lowStockVariants > 0 ? "warn" : undefined,
        },
      ],
    },
  ];

  return (
    <div className="flex flex-col gap-5">
      {groups.map((group) => (
        <div key={group.label}>
          <p className="eyebrow mb-2.5 px-0.5">{group.label}</p>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4 md:gap-4">
            {group.tiles.map((tile) => (
              <KpiTile key={tile.label} tile={tile} />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function KpiTile({ tile }: { tile: Tile }) {
  const Icon = tile.icon;
  const featured = tile.tone === "featured";
  const warn = tile.tone === "warn";

  return (
    <Link
      href={tile.href}
      className={cn(
        "group relative flex min-h-[128px] flex-col justify-between overflow-hidden rounded-card p-4 shadow-card transition-[transform,box-shadow] duration-200 hover:shadow-float motion-safe:hover:-translate-y-0.5",
        featured ? "bg-brand-tile text-brand-tile-fg" : "bg-canvas"
      )}
    >
      {featured && (
        <span
          aria-hidden
          className="pointer-events-none absolute -top-10 -right-10 h-32 w-32 rounded-full bg-white/8"
        />
      )}
      <div className="relative flex items-start justify-between">
        <span
          className={cn(
            "flex h-9 w-9 items-center justify-center rounded-chip",
            featured ? "bg-white/12 text-brand-tile-fg" : warn ? "bg-gold-100 text-gold-600" : "bg-tint text-navy-700"
          )}
        >
          <Icon className="h-[18px] w-[18px]" strokeWidth={1.9} />
        </span>
        <ArrowUpRight
          aria-hidden
          className={cn(
            "h-4 w-4 opacity-0 transition-opacity group-hover:opacity-100",
            featured ? "text-brand-tile-fg" : "text-slate-400"
          )}
          strokeWidth={2}
        />
      </div>
      <div className="relative min-w-0">
        <p
          className={cn(
            "tabular font-display truncate text-[24px] leading-none md:text-[28px]",
            featured ? "text-white" : warn ? "text-warn" : "text-navy-900"
          )}
        >
          {tile.value}
        </p>
        <p className={cn("mt-2 text-[12.5px] font-medium", featured ? "text-brand-tile-fg/90" : "text-slate-500")}>
          {tile.label}
        </p>
        <p
          className={cn(
            "tabular mt-0.5 flex items-center gap-1.5 text-[11.5px]",
            featured ? "text-footer-muted/80" : "text-slate-400"
          )}
        >
          {warn && <span aria-hidden className="h-1.5 w-1.5 flex-none rounded-full bg-warn" />}
          {tile.hint}
        </p>
      </div>
    </Link>
  );
}
