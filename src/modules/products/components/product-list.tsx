"use client";

import { Button, toast } from "@heroui/react";
import { AlertTriangle, Package, Plus } from "lucide-react";
import { EmptyState } from "@/components/empty-state";
import { Money } from "@/components/money";
import { ListCard, ResponsiveList, type ListColumn } from "@/components/responsive-list";
import { StatusChip } from "@/components/status-chip";
import { PRODUCT_STATUS_META } from "../lib/labels";
import type { AdminProductRow } from "../queries/product-queries";

interface ProductListProps {
  rows: AdminProductRow[];
  lowStockThreshold: number;
}

function StockCell({ row, threshold }: { row: AdminProductRow; threshold: number }) {
  const low = row.totalStock <= threshold;
  return (
    <span className={low ? "tabular font-semibold text-warn" : "tabular"}>
      {row.totalStock}
    </span>
  );
}

function PriceCell({ row }: { row: AdminProductRow }) {
  if (row.hasMissingRate && row.minPrice == null) {
    return (
      <span className="inline-flex items-center gap-1 text-[12.5px] font-medium text-warn">
        <AlertTriangle className="h-3.5 w-3.5" strokeWidth={2} />
        Sin tasa
      </span>
    );
  }
  if (row.minPrice == null) return <span className="text-slate-400">—</span>;
  return (
    <span>
      {row.variantCount > 1 && <span className="mr-1 text-[11px] text-slate-400">desde</span>}
      <Money value={row.minPrice} />
    </span>
  );
}

export function ProductList({ rows, lowStockThreshold }: ProductListProps) {
  const pending = () => toast.info("El alta de productos con variantes llega en la siguiente fase");

  const columns: ListColumn<AdminProductRow>[] = [
    {
      id: "name",
      header: "Producto",
      isRowHeader: true,
      cell: (r) => (
        <div className="min-w-0">
          <p className="font-semibold text-ink">{r.name}</p>
          <p className="text-[12px] text-slate-400">
            {r.typeName}
            {r.categoryName ? ` · ${r.categoryName}` : ""}
          </p>
        </div>
      ),
    },
    { id: "variants", header: "Variantes", align: "right", cell: (r) => <span className="tabular">{r.variantCount}</span> },
    { id: "stock", header: "Stock", align: "right", cell: (r) => <StockCell row={r} threshold={lowStockThreshold} /> },
    { id: "price", header: "Precio", align: "right", cell: (r) => <PriceCell row={r} /> },
    {
      id: "status",
      header: "Estado",
      cell: (r) => (
        <div className="flex flex-wrap gap-1.5">
          <StatusChip {...PRODUCT_STATUS_META[r.status]} />
          {r.featured && <StatusChip label="Destacado" tone="info" />}
        </div>
      ),
    },
  ];

  return (
    <>
      <div className="flex justify-end">
        <Button variant="primary" className="rounded-full" onPress={pending}>
          <Plus className="h-4 w-4" strokeWidth={2.2} />
          Nuevo producto
        </Button>
      </div>

      <ResponsiveList
        rows={rows}
        rowKey={(r) => r.productId}
        columns={columns}
        ariaLabel="Productos"
        empty={
          <div className="rounded-card bg-canvas shadow-card">
            <EmptyState
              icon={Package}
              title="Sin productos"
              description="Crea primero un tipo de producto y una categoría; después podrás dar de alta productos."
              size="compact"
            />
          </div>
        }
        renderCard={(r) => (
          <ListCard
            title={r.name}
            subtitle={`${r.typeName}${r.categoryName ? ` · ${r.categoryName}` : ""}`}
            badge={<StatusChip {...PRODUCT_STATUS_META[r.status]} />}
            rows={[
              { label: "Variantes", value: r.variantCount },
              { label: "Stock", value: <StockCell row={r} threshold={lowStockThreshold} /> },
              { label: "Precio", value: <PriceCell row={r} /> },
            ]}
          />
        )}
      />
    </>
  );
}
