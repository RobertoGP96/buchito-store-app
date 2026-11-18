"use client";

import Link from "next/link";
import { Package } from "lucide-react";
import { EmptyState } from "@/components/empty-state";
import { Money } from "@/components/money";
import { ListCard, ResponsiveList, type ListColumn } from "@/components/responsive-list";
import { cn } from "@/lib/utils";
import { fmtQtyNumber } from "@/modules/products/lib/units";
import type { ProductProfitRow } from "../queries/finance-queries";

function ProfitCell({ row }: { row: ProductProfitRow }) {
  if (row.profit == null) return <span className="type-caption font-medium text-warn">Sin costo</span>;
  return (
    <span className={cn("tabular font-semibold", row.profit < 0 ? "text-danger" : "text-ink")}>
      <Money value={row.profit} />
    </span>
  );
}

function Margin({ row }: { row: ProductProfitRow }) {
  if (row.marginPct == null) return <span className="text-ink-subtle">—</span>;
  return <span className="tabular">{row.marginPct} %</span>;
}

function Units({ row }: { row: ProductProfitRow }) {
  return (
    <span className="tabular">
      {fmtQtyNumber(row.qty)}
      {row.inComboQty > 0 && <span className="type-caption text-ink-subtle"> · {fmtQtyNumber(row.inComboQty)} en combos</span>}
    </span>
  );
}

/** Ganancia por producto en el periodo, los más rentables primero. */
export function FinanceProducts({ rows }: { rows: ProductProfitRow[] }) {
  const columns: ListColumn<ProductProfitRow>[] = [
    {
      id: "product",
      header: "Producto",
      isRowHeader: true,
      cell: (r) => (
        <Link href={`/admin/productos/${r.productId}`} className="font-semibold text-ink hover:text-tostado-700">
          {r.productName}
        </Link>
      ),
    },
    { id: "qty", header: "Unidades", align: "right", cell: (r) => <Units row={r} /> },
    { id: "revenue", header: "Ingresos", align: "right", cell: (r) => <Money value={r.revenue} /> },
    {
      id: "cost",
      header: "Costo",
      align: "right",
      cell: (r) => (r.cost == null ? <span className="text-ink-subtle">—</span> : <Money value={r.cost} />),
    },
    { id: "profit", header: "Ganancia", align: "right", cell: (r) => <ProfitCell row={r} /> },
    { id: "margin", header: "Margen", align: "right", cell: (r) => <Margin row={r} /> },
  ];

  return (
    <section className="flex flex-col gap-3">
      <p className="eyebrow px-0.5">Ganancia por producto</p>
      <ResponsiveList
        rows={rows}
        rowKey={(r) => r.productId}
        columns={columns}
        ariaLabel="Ganancia por producto"
        empty={
          <div className="rounded-card bg-canvas shadow-card">
            <EmptyState
              icon={Package}
              title="Sin ventas en el periodo"
              description="Cuando haya pedidos aparecerá aquí qué productos dejan más ganancia."
              size="compact"
            />
          </div>
        }
        renderCard={(r) => (
          <Link href={`/admin/productos/${r.productId}`} className="block">
            <ListCard
              title={r.productName}
              subtitle={<Units row={r} />}
              rows={[
                { label: "Ingresos", value: <Money value={r.revenue} /> },
                { label: "Costo", value: r.cost == null ? "—" : <Money value={r.cost} /> },
                { label: "Ganancia", value: <ProfitCell row={r} /> },
                { label: "Margen", value: <Margin row={r} /> },
              ]}
            />
          </Link>
        )}
      />
    </section>
  );
}
