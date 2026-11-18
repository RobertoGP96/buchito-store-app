import {
  Banknote,
  CalendarRange,
  Inbox,
  Package,
  PackageCheck,
  Truck,
  UserX,
  Wallet,
} from "lucide-react";
import { Money } from "@/components/money";
import { StatGroup, StatTile, type StatTileProps } from "@/components/stat-tile";
import type { DashboardKpis } from "../queries/dashboard-queries";

type Tile = StatTileProps & { href: string };

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
          delta: kpis.salesTodayDelta,
        },
        {
          label: "Ventas últimos 7 días",
          value: <Money value={kpis.salesLast7Days} />,
          hint: plural(kpis.ordersLast7Days, "pedido", "pedidos"),
          icon: CalendarRange,
          href: "/admin/pedidos",
          delta: kpis.salesLast7DaysDelta,
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
        <StatGroup key={group.label} label={group.label}>
          {group.tiles.map((tile) => (
            <StatTile key={tile.label} {...tile} />
          ))}
        </StatGroup>
      ))}
    </div>
  );
}
