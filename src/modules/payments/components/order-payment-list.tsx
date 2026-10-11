"use client";

import Link from "next/link";
import { Receipt } from "lucide-react";
import { CHIP_BASE, CHIP_OFF, CHIP_ON } from "@/components/choice-chips";
import { EmptyState } from "@/components/empty-state";
import { Money } from "@/components/money";
import { ListCard, ResponsiveList, type ListColumn } from "@/components/responsive-list";
import { fmtDateTime } from "@/lib/format";
import { cn } from "@/lib/utils";
import { useCurrency } from "@/modules/currency/store/currency-provider";
import { PAYMENT_RANGE_LABELS as RANGE_LABELS, PAYMENT_RANGES, type PaymentRange } from "../lib/payment-ranges";
import type { OrderPaymentRow, OrderPaymentsResult } from "../queries/order-payment-queries";

interface OrderPaymentListProps {
  result: OrderPaymentsResult;
  activeRange: PaymentRange;
}

function AmountCell({ row }: { row: OrderPaymentRow }) {
  const { base } = useCurrency();
  const foreign = row.currency.currencyId !== base.currencyId;
  return (
    <div className="flex flex-col items-end">
      <Money value={row.amountBase} className="font-semibold text-ink" />
      {foreign && (
        <span className="text-[11.5px] text-slate-400">
          <Money value={row.amountTendered} currency={row.currency} /> · tasa{" "}
          <span className="tabular">{row.exchangeRate}</span>
        </span>
      )}
    </div>
  );
}

function Totals({ result }: { result: OrderPaymentsResult }) {
  const { base } = useCurrency();
  const foreign = result.totalsByCurrency.filter((t) => t.currency.currencyId !== base.currencyId);
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      <div className="rounded-card bg-canvas p-4 shadow-card">
        <p className="eyebrow">Total cobrado</p>
        <p className="tabular font-display mt-2 text-[24px] leading-none text-navy-900">
          <Money value={result.totalBase} />
        </p>
        <p className="mt-1.5 text-[12px] text-slate-500">
          {result.rows.length} {result.rows.length === 1 ? "cobro" : "cobros"}
          {result.truncated ? " (listado recortado)" : ""}
        </p>
      </div>
      {foreign.map((t) => (
        <div key={t.currency.currencyId} className="rounded-card bg-canvas p-4 shadow-card">
          <p className="eyebrow">Recibido en {t.currency.code}</p>
          <p className="tabular font-display mt-2 text-[24px] leading-none text-navy-900">
            <Money value={t.amount} currency={t.currency} />
          </p>
          <p className="mt-1.5 text-[12px] text-slate-500">Suma de lo entregado en esa moneda.</p>
        </div>
      ))}
    </div>
  );
}

export function OrderPaymentList({ result, activeRange }: OrderPaymentListProps) {
  const columns: ListColumn<OrderPaymentRow>[] = [
    {
      id: "date",
      header: "Fecha",
      isRowHeader: true,
      cell: (r) => <span className="tabular text-slate-500">{fmtDateTime(r.paidAt)}</span>,
    },
    {
      id: "order",
      header: "Pedido",
      cell: (r) => (
        <div className="min-w-0">
          <Link href={`/admin/pedidos/${r.orderId}`} className="font-semibold text-navy-700 hover:underline">
            {r.orderNo}
          </Link>
          <p className="text-[12px] text-slate-400">{r.customerName}</p>
        </div>
      ),
    },
    {
      id: "method",
      header: "Método",
      cell: (r) => (
        <div className="min-w-0">
          <p className="text-ink">{r.methodName}</p>
          {r.reference && <p className="tabular text-[12px] text-slate-400">Ref. {r.reference}</p>}
        </div>
      ),
    },
    { id: "amount", header: "Monto", align: "right", cell: (r) => <AmountCell row={r} /> },
    { id: "receivedBy", header: "Recibido por", cell: (r) => <span className="text-slate-500">{r.receivedBy ?? "—"}</span> },
  ];

  return (
    <>
      <div className="no-scrollbar -mx-1 flex snap-x gap-2 overflow-x-auto px-1 py-1">
        {PAYMENT_RANGES.map((range) => (
          <Link
            key={range}
            href={`/admin/cobros?range=${range}`}
            className={cn(CHIP_BASE, activeRange === range ? CHIP_ON : CHIP_OFF)}
          >
            {RANGE_LABELS[range]}
          </Link>
        ))}
      </div>

      <Totals result={result} />

      <ResponsiveList
        rows={result.rows}
        rowKey={(r) => r.paymentId}
        columns={columns}
        ariaLabel="Cobros"
        empty={
          <div className="rounded-card bg-canvas shadow-card">
            <EmptyState
              icon={Receipt}
              title="Sin cobros"
              description="Los pagos registrados en los pedidos aparecerán aquí."
              size="compact"
            />
          </div>
        }
        renderCard={(r) => (
          <Link href={`/admin/pedidos/${r.orderId}`} className="block">
            <ListCard
              title={`${r.orderNo} · ${r.customerName}`}
              subtitle={`${fmtDateTime(r.paidAt)} · ${r.methodName}`}
              rows={[
                { label: "Monto", value: <AmountCell row={r} /> },
                ...(r.reference ? [{ label: "Referencia", value: <span className="tabular">{r.reference}</span> }] : []),
                { label: "Recibido por", value: r.receivedBy ?? "—" },
              ]}
            />
          </Link>
        )}
      />
    </>
  );
}
