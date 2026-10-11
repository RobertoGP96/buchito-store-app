import Link from "next/link";
import { StatusChip } from "@/components/status-chip";
import { cn } from "@/lib/utils";
import { ORDER_STATUS_META, type OrderStatus } from "@/modules/orders/lib/labels";
import type { OrderStatusCount } from "../queries/dashboard-queries";
import { DashboardCard } from "./dashboard-card";

/** Color de cada tramo de la barra; distinto por estado aunque compartan tono. */
const BAR_COLOR: Record<OrderStatus, string> = {
  pending: "bg-warn",
  confirmed: "bg-navy-700",
  ready: "bg-navy-600",
  out_for_delivery: "bg-tint-strong",
  delivered: "bg-ok",
  cancelled: "bg-danger",
};

interface OrdersByStatusProps {
  rows: OrderStatusCount[];
  total: number;
}

export function OrdersByStatus({ rows, total }: OrdersByStatusProps) {
  const pct = (count: number) => (total > 0 ? (count / total) * 100 : 0);

  return (
    <DashboardCard title="Pedidos por estado" href="/admin/pedidos">
      {total > 0 ? (
        <div className="flex h-2.5 w-full overflow-hidden rounded-full bg-tint" aria-hidden>
          {rows
            .filter((r) => r.count > 0)
            .map((r) => (
              <span
                key={r.status}
                className={cn("h-full", BAR_COLOR[r.status])}
                style={{ width: `${pct(r.count)}%` }}
                title={`${ORDER_STATUS_META[r.status].label}: ${r.count}`}
              />
            ))}
        </div>
      ) : (
        <p className="text-[13px] text-slate-500">Todavía no hay pedidos.</p>
      )}
      <ul className="mt-3 divide-y divide-line-soft">
        {rows.map((r) => (
          <li key={r.status}>
            <Link
              href={`/admin/pedidos?status=${r.status}`}
              className="-mx-2 flex items-center justify-between gap-3 rounded-chip px-2 py-2 transition-colors hover:bg-tint"
            >
              <span className="flex items-center gap-2.5">
                <span className={cn("h-2.5 w-2.5 flex-none rounded-full", BAR_COLOR[r.status])} aria-hidden />
                <StatusChip {...ORDER_STATUS_META[r.status]} />
              </span>
              <span className="flex items-baseline gap-2">
                <span className="tabular text-[11.5px] text-slate-400">{Math.round(pct(r.count))}%</span>
                <span className="tabular min-w-[2ch] text-right text-[15px] font-semibold text-ink">{r.count}</span>
              </span>
            </Link>
          </li>
        ))}
      </ul>
      <p className="tabular mt-3 border-t border-line pt-3 text-[12.5px] text-slate-500">
        {total} {total === 1 ? "pedido en total" : "pedidos en total"}
      </p>
    </DashboardCard>
  );
}
