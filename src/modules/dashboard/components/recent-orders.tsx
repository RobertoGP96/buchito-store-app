import { Inbox, ReceiptText } from "lucide-react";
import { EmptyState } from "@/components/empty-state";
import { Money } from "@/components/money";
import { StatusChip } from "@/components/status-chip";
import { fmtDateTime, initials } from "@/lib/format";
import { ORDER_STATUS_META } from "@/modules/orders/lib/labels";
import { PAYMENT_STATUS_META } from "@/modules/payments/lib/labels";
import type { RecentOrderRow } from "../queries/dashboard-queries";
import { DashboardCard, DashboardRow } from "./dashboard-card";

export function RecentOrders({ rows }: { rows: RecentOrderRow[] }) {
  return (
    <DashboardCard
      icon={ReceiptText}
      title="Últimos pedidos"
      description="Los más recientes primero"
      href="/admin/pedidos"
    >
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
              <DashboardRow href={`/admin/pedidos/${o.orderId}`}>
                <span className="flex h-9 w-9 flex-none items-center justify-center rounded-full bg-crema-100 type-caption font-semibold text-tostado-700">
                  {initials(o.customerName)}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                    <span className="tabular type-body font-semibold text-ink">{o.orderNo}</span>
                    <StatusChip {...ORDER_STATUS_META[o.status]} />
                    <StatusChip {...PAYMENT_STATUS_META[o.paymentStatus]} />
                  </div>
                  <p className="mt-1 truncate type-meta text-ink-muted">{o.customerName}</p>
                </div>
                <div className="flex-none text-right">
                  <Money value={o.total} className="block type-body font-semibold text-ink" />
                  <span className="tabular mt-0.5 block type-caption text-ink-subtle">{fmtDateTime(o.createdAt)}</span>
                </div>
              </DashboardRow>
            </li>
          ))}
        </ul>
      )}
    </DashboardCard>
  );
}
