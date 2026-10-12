"use client";

import Link from "next/link";
import { useState } from "react";
import { Button } from "@heroui/react";
import { HandCoins } from "lucide-react";
import { CHIP_BASE, CHIP_OFF, CHIP_ON } from "@/components/choice-chips";
import { EmptyState } from "@/components/empty-state";
import { lazyDialog } from "@/components/lazy-dialog";
import { Money } from "@/components/money";
import { LinkPending } from "@/components/nav-icon";
import { ListCard, ResponsiveList, type ListColumn } from "@/components/responsive-list";
import { StatusChip } from "@/components/status-chip";
import { fmtDate, fmtDateTime } from "@/lib/format";
import { cn } from "@/lib/utils";
import { PAYMENT_RANGE_LABELS, PAYMENT_RANGES, type PaymentRange } from "@/modules/payments/lib/payment-ranges";
import type { CourierBalanceRow, CourierPaymentRow, CourierPaymentsResult } from "../queries/courier-payment-queries";

const CourierPaymentForm = lazyDialog(() => import("./courier-payment-form").then((m) => m.CourierPaymentForm));

interface CourierPaymentListProps {
  balances: CourierBalanceRow[];
  result: CourierPaymentsResult;
  activeRange: PaymentRange;
}

function Balances({ balances, onPay }: { balances: CourierBalanceRow[]; onPay: (courierId: number) => void }) {
  if (balances.length === 0) return null;
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {balances.map((b) => (
        <div key={b.courierId} className="flex flex-col gap-3 rounded-card bg-canvas p-4 shadow-card">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="truncate text-[14.5px] font-semibold text-ink">{b.fullName}</p>
              <p className="text-[12px] text-slate-400">
                Tarifa <Money value={b.deliveryFee} /> por entrega
              </p>
            </div>
            {!b.active && <StatusChip label="Inactivo" tone="neutral" />}
          </div>
          <div>
            <p className="eyebrow">Por pagar</p>
            <p className={cn("tabular font-display mt-1 text-[24px] leading-none", b.pendingFees > 0 ? "text-navy-900" : "text-slate-400")}>
              <Money value={b.pendingFees} />
            </p>
            <p className="mt-1 text-[12px] text-slate-500">
              {b.pendingCount} {b.pendingCount === 1 ? "entrega completada" : "entregas completadas"} sin liquidar
            </p>
          </div>
          <div className="flex items-end justify-between gap-3 border-t border-line pt-3">
            <p className="text-[12px] text-slate-400">
              Pagado <Money value={b.paidTotal} className="font-medium text-slate-500" />
              {b.lastPaidAt && <span className="block">Último pago {fmtDate(b.lastPaidAt)}</span>}
            </p>
            <Button
              variant="primary"
              size="sm"
              className="rounded-full"
              isDisabled={b.pendingCount === 0}
              onPress={() => onPay(b.courierId)}
            >
              <HandCoins className="h-4 w-4" strokeWidth={2} />
              Pagar
            </Button>
          </div>
        </div>
      ))}
    </div>
  );
}

function AmountCell({ row }: { row: CourierPaymentRow }) {
  const differs = Math.abs(row.amountBase - row.feesBase) > 0.000001;
  return (
    <div className="flex flex-col items-end">
      <Money value={row.amountBase} className="font-semibold text-ink" />
      {differs && (
        <span className="text-[11.5px] text-slate-400">
          tarifas <Money value={row.feesBase} />
        </span>
      )}
    </div>
  );
}

export function CourierPaymentList({ balances, result, activeRange }: CourierPaymentListProps) {
  const [open, setOpen] = useState(false);
  const [courierId, setCourierId] = useState<number | null>(null);

  const openPay = (id: number) => {
    setCourierId(id);
    setOpen(true);
  };

  const columns: ListColumn<CourierPaymentRow>[] = [
    { id: "date", header: "Fecha", isRowHeader: true, cell: (r) => <span className="tabular text-slate-500">{fmtDateTime(r.paidAt)}</span> },
    { id: "courier", header: "Mensajero", cell: (r) => <span className="font-semibold text-ink">{r.courierName}</span> },
    { id: "count", header: "Entregas", align: "right", cell: (r) => <span className="tabular">{r.deliveryCount}</span> },
    { id: "amount", header: "Monto", align: "right", cell: (r) => <AmountCell row={r} /> },
    { id: "notes", header: "Notas", cell: (r) => <span className="text-slate-500">{r.notes ?? "—"}</span> },
    { id: "paidBy", header: "Registrado por", cell: (r) => <span className="text-slate-500">{r.paidBy ?? "—"}</span> },
  ];

  return (
    <>
      <Balances balances={balances} onPay={openPay} />

      <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
        <p className="eyebrow px-0.5">Pagos registrados</p>
        <div className="no-scrollbar -mx-1 flex snap-x gap-2 overflow-x-auto px-1 py-1">
          {PAYMENT_RANGES.map((range) => (
            <Link
              key={range}
              href={`/admin/mensajeros/pagos?range=${range}`}
              scroll={false}
              className={cn(CHIP_BASE, activeRange === range ? CHIP_ON : CHIP_OFF)}
            >
              {PAYMENT_RANGE_LABELS[range]}
              <LinkPending />
            </Link>
          ))}
        </div>
      </div>

      <div className="rounded-card bg-canvas p-4 shadow-card sm:max-w-xs">
        <p className="eyebrow">Total pagado</p>
        <p className="tabular font-display mt-2 text-[24px] leading-none text-navy-900">
          <Money value={result.totalBase} />
        </p>
        <p className="mt-1.5 text-[12px] text-slate-500">
          {result.rows.length} {result.rows.length === 1 ? "pago" : "pagos"} en el periodo
        </p>
      </div>

      <ResponsiveList
        rows={result.rows}
        rowKey={(r) => r.courierPaymentId}
        columns={columns}
        ariaLabel="Pagos a mensajeros"
        empty={
          <div className="rounded-card bg-canvas shadow-card">
            <EmptyState
              icon={HandCoins}
              title="Sin pagos en el periodo"
              description="Cuando liquides a un mensajero el pago quedará registrado aquí."
              size="compact"
            />
          </div>
        }
        renderCard={(r) => (
          <ListCard
            title={r.courierName}
            subtitle={fmtDateTime(r.paidAt)}
            rows={[
              { label: "Entregas", value: r.deliveryCount },
              { label: "Monto", value: <AmountCell row={r} /> },
              ...(r.notes ? [{ label: "Notas", value: r.notes }] : []),
              { label: "Registrado por", value: r.paidBy ?? "—" },
            ]}
          />
        )}
      />

      <CourierPaymentForm key={`${courierId ?? "none"}-${open}`} open={open} onOpenChange={setOpen} balances={balances} courierId={courierId} />
    </>
  );
}
