"use client";

import Link from "next/link";
import { Inbox } from "lucide-react";
import { EmptyState } from "@/components/empty-state";
import { CHIP_BASE, CHIP_OFF, CHIP_ON } from "@/components/choice-chips";
import { Money } from "@/components/money";
import { LinkPending } from "@/components/nav-icon";
import { ListCard, ResponsiveList, type ListColumn } from "@/components/responsive-list";
import { StatusChip } from "@/components/status-chip";
import { fmtDateTime } from "@/lib/format";
import { PAYMENT_STATUS_META } from "@/modules/payments/lib/labels";
import { FULFILLMENT_LABELS, ORDER_STATUS_META, ORDER_STATUSES, type OrderStatus } from "../lib/labels";
import type { OrderSummaryRow } from "../queries/order-queries";
import { cn } from "@/lib/utils";

interface OrderListProps {
  rows: OrderSummaryRow[];
  activeStatus: OrderStatus | null;
  counts: Record<OrderStatus, number>;
}

export function OrderList({ rows, activeStatus, counts }: OrderListProps) {
  const columns: ListColumn<OrderSummaryRow>[] = [
    {
      id: "orderNo",
      header: "Pedido",
      isRowHeader: true,
      cell: (r) => (
        <Link href={`/admin/pedidos/${r.orderId}`} className="font-semibold text-navy-700 hover:underline">
          {r.orderNo}
        </Link>
      ),
    },
    {
      id: "customer",
      header: "Cliente",
      cell: (r) => (
        <div className="min-w-0">
          <p className="font-medium text-ink">{r.customerName}</p>
          <p className="tabular text-[12px] text-slate-400">{r.customerPhone}</p>
        </div>
      ),
    },
    { id: "fulfillment", header: "Entrega", cell: (r) => FULFILLMENT_LABELS[r.fulfillment] },
    {
      id: "total",
      header: "Total",
      align: "right",
      cell: (r) => (
        <div>
          <Money value={r.total} className="font-semibold" />
          {r.paymentCurrency.code !== undefined && (
            <p className="text-[11.5px] text-slate-400">
              <Money value={r.totalInPaymentCurrency} currency={r.paymentCurrency} /> · {r.paymentMethodName}
            </p>
          )}
        </div>
      ),
    },
    {
      id: "status",
      header: "Estado",
      cell: (r) => (
        <div className="flex flex-wrap gap-1.5">
          <StatusChip {...ORDER_STATUS_META[r.status]} />
          <StatusChip {...PAYMENT_STATUS_META[r.paymentStatus]} />
        </div>
      ),
    },
    { id: "date", header: "Fecha", cell: (r) => <span className="tabular text-slate-500">{fmtDateTime(r.createdAt)}</span> },
  ];

  return (
    <>
      <div className="no-scrollbar -mx-1 flex snap-x gap-2 overflow-x-auto px-1 py-1">
        <Link href="/admin/pedidos" scroll={false} className={cn(CHIP_BASE, activeStatus === null ? CHIP_ON : CHIP_OFF)}>
          Todos
          <LinkPending />
        </Link>
        {ORDER_STATUSES.map((status) => (
          <Link
            key={status}
            href={`/admin/pedidos?status=${status}`}
            scroll={false}
            className={cn(CHIP_BASE, activeStatus === status ? CHIP_ON : CHIP_OFF)}
          >
            {ORDER_STATUS_META[status].label}
            {counts[status] > 0 && <span className="ml-1.5 text-[11px] opacity-70">{counts[status]}</span>}
            <LinkPending />
          </Link>
        ))}
      </div>

      <ResponsiveList
        rows={rows}
        rowKey={(r) => r.orderId}
        columns={columns}
        ariaLabel="Pedidos"
        empty={
          <div className="rounded-card bg-canvas shadow-card">
            <EmptyState icon={Inbox} title="Sin pedidos" description="Los pedidos de la tienda aparecerán aquí." size="compact" />
          </div>
        }
        renderCard={(r) => (
          <Link href={`/admin/pedidos/${r.orderId}`} className="block">
            <ListCard
              title={`${r.orderNo} · ${r.customerName}`}
              subtitle={`${fmtDateTime(r.createdAt)} · ${FULFILLMENT_LABELS[r.fulfillment]}`}
              badge={<StatusChip {...ORDER_STATUS_META[r.status]} />}
              rows={[
                { label: "Total", value: <Money value={r.total} /> },
                { label: "Pago", value: <StatusChip {...PAYMENT_STATUS_META[r.paymentStatus]} /> },
              ]}
            />
          </Link>
        )}
      />
    </>
  );
}
