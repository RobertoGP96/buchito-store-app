"use client";

import { lazyDialog } from "@/components/lazy-dialog";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@heroui/react";
import { Boxes, History, Search, X } from "lucide-react";
import { CHIP_BASE, CHIP_OFF, CHIP_ON } from "@/components/choice-chips";
import { EmptyState } from "@/components/empty-state";
import { Money } from "@/components/money";
import { LinkPending } from "@/components/nav-icon";
import { ListCard, ResponsiveList, type ListColumn } from "@/components/responsive-list";
import { StatusChip } from "@/components/status-chip";
import { cn } from "@/lib/utils";
import { PRODUCT_STATUS_META } from "../lib/labels";
import { fmtQty } from "../lib/units";
import type { AdminVariantRow } from "../queries/product-queries";
import type { InventoryRow } from "../queries/inventory-queries";

const StockAdjustForm = lazyDialog(() => import("./stock-adjust-form").then((m) => m.StockAdjustForm));

interface InventoryListProps {
  rows: InventoryRow[];
  query: string;
  lowOnly: boolean;
}

function inventoryHref(q: string, low: boolean): string {
  const params = new URLSearchParams();
  if (q) params.set("q", q);
  if (low) params.set("low", "1");
  const qs = params.toString();
  return qs ? `/admin/inventario?${qs}` : "/admin/inventario";
}

/** El formulario de stock trabaja con la fila de variante del producto; aquí
 *  se construye el mínimo que necesita (sin historial: el kardex está al lado). */
function toAdjustVariant(row: InventoryRow): AdminVariantRow {
  return {
    variantId: row.variantId,
    version: 0,
    sku: row.sku,
    name: row.variantName,
    attributes: {},
    price: row.price,
    compareAtPrice: null,
    priceCurrency: row.priceCurrency,
    priceBase: null,
    cost: null,
    costCurrency: null,
    costBase: null,
    marginPct: null,
    unit: row.unit,
    qtyStep: row.qtyStep,
    stock: row.stock,
    imageUrl: null,
    isDefault: false,
    isActive: true,
    sortOrder: 0,
    recentMovements: [],
  };
}

function StockCell({ row }: { row: InventoryRow }) {
  const out = row.stock <= 0;
  const low = !out && row.isLow;
  return (
    <span className={cn("tabular font-semibold", out ? "text-danger" : low ? "text-warn" : "text-ink")}>
      {fmtQty(row.stock, row.unit)}
      {out && <span className="ml-1.5 text-[11px] font-medium">Agotado</span>}
      {low && <span className="ml-1.5 text-[11px] font-medium">Bajo</span>}
    </span>
  );
}

export function InventoryList({ rows, query, lowOnly }: InventoryListProps) {
  const router = useRouter();
  const [value, setValue] = useState(query);
  const [stockTarget, setStockTarget] = useState<InventoryRow | null>(null);
  const [stockOpen, setStockOpen] = useState(false);

  const openStock = (row: InventoryRow) => {
    setStockTarget(row);
    setStockOpen(true);
  };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    router.push(inventoryHref(value.trim(), lowOnly));
  };

  const columns: ListColumn<InventoryRow>[] = [
    {
      id: "product",
      header: "Producto / variante",
      isRowHeader: true,
      cell: (r) => (
        <div className="min-w-0">
          <Link href={`/admin/productos/${r.productId}`} className="font-semibold text-navy-700 hover:underline">
            {r.productName}
          </Link>
          <div className="flex flex-wrap items-center gap-1.5 text-[12px] text-slate-400">
            <span>{r.variantName ?? "Variante única"}</span>
            {r.productStatus !== "active" && <StatusChip {...PRODUCT_STATUS_META[r.productStatus]} />}
          </div>
        </div>
      ),
    },
    { id: "sku", header: "SKU", cell: (r) => <span className="tabular text-slate-500">{r.sku}</span> },
    {
      id: "price",
      header: "Precio",
      align: "right",
      cell: (r) => <Money value={r.price} currency={r.priceCurrency} className="font-medium" />,
    },
    { id: "stock", header: "Stock", align: "right", cell: (r) => <StockCell row={r} /> },
    {
      id: "actions",
      header: "",
      align: "right",
      cell: (r) => (
        <div className="flex justify-end gap-1">
          <Button variant="ghost" size="sm" className="rounded-full" onPress={() => openStock(r)}>
            <Boxes className="h-4 w-4" strokeWidth={1.9} />
            Stock
          </Button>
          <Link
            href={`/admin/inventario/movimientos?variantId=${r.variantId}`}
            aria-label={`Movimientos de ${r.sku}`}
            className="flex h-8 w-8 items-center justify-center rounded-full text-slate-500 hover:bg-hover hover:text-navy-700"
          >
            <History className="h-4 w-4" strokeWidth={1.9} />
          </Link>
        </div>
      ),
    },
  ];

  return (
    <>
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="no-scrollbar -mx-1 flex snap-x gap-2 overflow-x-auto px-1 py-1">
          <Link href={inventoryHref(query, false)} scroll={false} className={cn(CHIP_BASE, !lowOnly ? CHIP_ON : CHIP_OFF)}>
            Todo
            <LinkPending />
          </Link>
          <Link href={inventoryHref(query, true)} scroll={false} className={cn(CHIP_BASE, lowOnly ? CHIP_ON : CHIP_OFF)}>
            Solo stock bajo
            <LinkPending />
          </Link>
          <Link href="/admin/inventario/movimientos" className={cn(CHIP_BASE, CHIP_OFF)}>
            <History className="mr-1.5 h-3.5 w-3.5" strokeWidth={2} />
            Movimientos
            <LinkPending />
          </Link>
        </div>

        <form
          onSubmit={submit}
          role="search"
          className="field-shell flex h-10 items-center gap-2 rounded-full border-[1.5px] border-line bg-canvas pr-1.5 pl-4 md:w-[280px]"
        >
          <Search className="h-4 w-4 flex-none text-slate-400" strokeWidth={1.9} />
          <input
            type="search"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder="SKU o nombre"
            aria-label="Buscar por SKU o nombre"
            className="min-w-0 flex-1 bg-transparent text-[13.5px] text-ink outline-none placeholder:text-slate-400"
          />
          {value && (
            <button
              type="button"
              onClick={() => {
                setValue("");
                router.push(inventoryHref("", lowOnly));
              }}
              aria-label="Limpiar búsqueda"
              className="flex h-7 w-7 items-center justify-center rounded-full text-slate-400 hover:bg-hover hover:text-navy-700"
            >
              <X className="h-3.5 w-3.5" strokeWidth={2} />
            </button>
          )}
        </form>
      </div>

      <ResponsiveList
        rows={rows}
        rowKey={(r) => r.variantId}
        columns={columns}
        ariaLabel="Inventario"
        empty={
          <div className="rounded-card bg-canvas shadow-card">
            <EmptyState
              icon={Boxes}
              title={query || lowOnly ? "Sin resultados" : "Sin variantes activas"}
              description={
                query || lowOnly
                  ? "Ninguna variante activa coincide con el filtro."
                  : "El inventario muestra las variantes activas de los productos."
              }
              size="compact"
            />
          </div>
        }
        renderCard={(r) => (
          <ListCard
            title={
              <Link href={`/admin/productos/${r.productId}`} className="hover:underline">
                {r.productName}
              </Link>
            }
            subtitle={`${r.variantName ?? "Variante única"} · ${r.sku}`}
            badge={r.productStatus !== "active" ? <StatusChip {...PRODUCT_STATUS_META[r.productStatus]} /> : undefined}
            rows={[
              { label: "Precio", value: <Money value={r.price} currency={r.priceCurrency} /> },
              { label: "Stock", value: <StockCell row={r} /> },
            ]}
            actions={
              <>
                <Link
                  href={`/admin/inventario/movimientos?variantId=${r.variantId}`}
                  className="inline-flex items-center gap-1.5 rounded-full border-[1.5px] border-line px-3 py-1.5 text-[13px] font-semibold text-navy-700 hover:bg-tint"
                >
                  <History className="h-3.5 w-3.5" strokeWidth={1.9} />
                  Movimientos
                </Link>
                <Button variant="outline" size="sm" className="rounded-full" onPress={() => openStock(r)}>
                  <Boxes className="h-3.5 w-3.5" strokeWidth={1.9} />
                  Stock
                </Button>
              </>
            }
          />
        )}
      />

      {/* key: el formulario se remonta por variante (y stock) para resetear los valores. */}
      <StockAdjustForm
        key={stockTarget ? `${stockTarget.variantId}-${stockTarget.stock}` : "none"}
        open={stockOpen}
        onOpenChange={setStockOpen}
        variant={stockTarget ? toAdjustVariant(stockTarget) : null}
      />
    </>
  );
}
