"use client";

import Link from "next/link";
import { History } from "lucide-react";
import { EmptyState } from "@/components/empty-state";
import { ListCard, ResponsiveList, type ListColumn } from "@/components/responsive-list";
import { StatusChip, type StatusTone } from "@/components/status-chip";
import { fmtDateTime } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { AdminStockMovementType } from "../queries/product-queries";
import type { StockMovementRow } from "../queries/inventory-queries";
import { STOCK_MOVEMENT_TYPE_LABELS } from "./stock-adjust-form";

interface StockMovementListProps {
  rows: StockMovementRow[];
  /** Variante filtrada (?variantId=); null = todas. */
  variantId: number | null;
}

const TYPE_TONE: Record<AdminStockMovementType, StatusTone> = {
  entry: "success",
  exit: "danger",
  adjustment: "info",
};

/** Signo visual: el recuento no tiene signo, es el stock final. */
function movementDelta(type: AdminStockMovementType, quantity: number): string {
  if (type === "entry") return `+${quantity}`;
  if (type === "exit") return `−${quantity}`;
  return `= ${quantity}`;
}

function referenceLabel(r: StockMovementRow): string | null {
  if (r.referenceType === "order") return r.orderNo ? `Pedido ${r.orderNo}` : `Pedido #${r.referenceId ?? "?"}`;
  if (r.referenceType === "manual") return "Manual";
  if (r.referenceType) return r.referenceId != null ? `${r.referenceType} #${r.referenceId}` : r.referenceType;
  return null;
}

function ReferenceCell({ row }: { row: StockMovementRow }) {
  const label = referenceLabel(row);
  if (!label) return <span className="text-slate-400">—</span>;
  if (row.referenceType === "order" && row.referenceId != null) {
    return (
      <Link href={`/admin/pedidos/${row.referenceId}`} className="font-medium text-navy-700 hover:underline">
        {label}
      </Link>
    );
  }
  return <span className="text-slate-500">{label}</span>;
}

function DeltaCell({ row }: { row: StockMovementRow }) {
  return (
    <div className="tabular text-right">
      <p className={cn("font-semibold", row.type === "exit" ? "text-danger" : "text-ink")}>
        {movementDelta(row.type, row.quantity)}
      </p>
      <p className="text-[11.5px] text-slate-400">quedan {row.stockAfter}</p>
    </div>
  );
}

export function StockMovementList({ rows, variantId }: StockMovementListProps) {
  const filtered = variantId != null ? rows[0] ?? null : null;

  const columns: ListColumn<StockMovementRow>[] = [
    {
      id: "date",
      header: "Fecha",
      isRowHeader: true,
      cell: (r) => <span className="tabular text-slate-500">{fmtDateTime(r.createdAt)}</span>,
    },
    {
      id: "variant",
      header: "Producto / variante",
      cell: (r) => (
        <div className="min-w-0">
          <Link href={`/admin/productos/${r.productId}`} className="font-semibold text-navy-700 hover:underline">
            {r.productName}
          </Link>
          <p className="text-[12px] text-slate-400">
            {r.variantName ? `${r.variantName} · ` : ""}
            <span className="tabular">{r.sku}</span>
          </p>
        </div>
      ),
    },
    {
      id: "type",
      header: "Tipo",
      cell: (r) => <StatusChip label={STOCK_MOVEMENT_TYPE_LABELS[r.type]} tone={TYPE_TONE[r.type]} />,
    },
    { id: "delta", header: "Cantidad", align: "right", cell: (r) => <DeltaCell row={r} /> },
    { id: "reference", header: "Referencia", cell: (r) => <ReferenceCell row={r} /> },
    {
      id: "notes",
      header: "Notas / usuario",
      cell: (r) => (
        <div className="min-w-0 max-w-[260px]">
          {r.notes && <p className="truncate text-ink">{r.notes}</p>}
          <p className="truncate text-[12px] text-slate-400">{r.createdBy ?? "Sistema"}</p>
        </div>
      ),
    },
  ];

  return (
    <>
      {variantId != null && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-field bg-tint px-4 py-3 text-[13px]">
          <p className="text-navy-900">
            Mostrando solo{" "}
            {filtered ? (
              <>
                <span className="font-semibold">{filtered.productName}</span>
                {filtered.variantName ? ` · ${filtered.variantName}` : ""} ·{" "}
                <span className="tabular">{filtered.sku}</span>
              </>
            ) : (
              <span className="font-semibold">la variante #{variantId}</span>
            )}
          </p>
          <Link href="/admin/inventario/movimientos" className="font-semibold text-navy-700 hover:underline">
            Ver todos
          </Link>
        </div>
      )}

      <ResponsiveList
        rows={rows}
        rowKey={(r) => r.movementId}
        columns={columns}
        ariaLabel="Movimientos de stock"
        empty={
          <div className="rounded-card bg-canvas shadow-card">
            <EmptyState
              icon={History}
              title="Sin movimientos"
              description="Las entradas, salidas y recuentos de stock aparecerán aquí."
              size="compact"
            />
          </div>
        }
        renderCard={(r) => (
          <ListCard
            title={`${r.productName}${r.variantName ? ` · ${r.variantName}` : ""}`}
            subtitle={`${fmtDateTime(r.createdAt)} · ${r.sku}`}
            badge={<StatusChip label={STOCK_MOVEMENT_TYPE_LABELS[r.type]} tone={TYPE_TONE[r.type]} />}
            rows={[
              { label: "Cantidad", value: <DeltaCell row={r} /> },
              { label: "Referencia", value: <ReferenceCell row={r} /> },
              ...(r.notes ? [{ label: "Notas", value: r.notes }] : []),
              { label: "Usuario", value: r.createdBy ?? "Sistema" },
            ]}
          />
        )}
      />
    </>
  );
}
