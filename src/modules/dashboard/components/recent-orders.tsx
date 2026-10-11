import Link from "next/link";
import { Inbox } from "lucide-react";
import { EmptyState } from "@/components/empty-state";
import { Money } from "@/components/money";
import { StatusChip } from "@/components/status-chip";
import { fmtDateTime } from "@/lib/format";
import { ORDER_STATUS_META } from "@/modules/orders/lib/labels";
import { PAYMENT_STATUS_META } from "@/modules/payments/lib/labels";
import type { RecentOrderRow } from "../queries/dashboard-queries";
import { DashboardCard } from "./dashboard-card";

export function RecentOrders({ rows }: { rows: RecentOrderRow[] }) {
  return (
    <DashboardCard title="Últimos pedidos" href="/admin/pedidos">
      {rows.length === 0 ? (
        <EmptyState
          icon={Inbox}
          title="Sin pedidos todavía"
          description="Los pedidos de la tienda aparecerán aquí en cuanto lleguen."
          size="compact"
        />
      ) : (
        <ul className="divide-y divide-line-soft">
          {rows.map((o) => (
            <li key={o.orderId}>
              <Link
                href={`/admin/pedidos/${o.orderId}`}
                className="-mx-2 flex items-center gap-3 rounded-chip px-2 py-2.5 transition-colors hover:bg-tint"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                    <span className="tabular text-[13.5px] font-semibold text-ink">{o.orderNo}</span>
                    <StatusChip {...ORDER_STATUS_META[o.status]} />
                    <StatusChip {...PAYMENT_STATUS_META[o.paymentStatus]} />
                  </div>
                  <p className="mt-1 truncate text-[13px] text-slate-500">
                    {o.customerName}
                    <span className="text-slate-400"> · </span>
                    <span className="tabular text-slate-400">{fmtDateTime(o.createdAt)}</span>
                  </p>
                </div>
                <Money value={o.total} className="flex-none text-[14px] font-semibold text-ink" />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </DashboardCard>
  );
}
