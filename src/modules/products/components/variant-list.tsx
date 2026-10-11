"use client";

import { lazyDialog } from "@/components/lazy-dialog";
import { useState } from "react";
import { Button } from "@heroui/react";
import { AlertTriangle, Boxes, Layers, Pencil, Plus } from "lucide-react";
import { EmptyState } from "@/components/empty-state";
import { Money } from "@/components/money";
import { ListCard, ResponsiveList, type ListColumn } from "@/components/responsive-list";
import { StatusChip } from "@/components/status-chip";
import type { CurrencyInfo } from "@/lib/format";
import { cn } from "@/lib/utils";
import { useCurrency } from "@/modules/currency/store/currency-provider";
import { variantLabel, type AttributeDef } from "../lib/attribute-schema";
import type { AdminVariantRow } from "../queries/product-queries";

const StockAdjustForm = lazyDialog(() => import("./stock-adjust-form").then((m) => m.StockAdjustForm));
const VariantForm = lazyDialog(() => import("./variant-form").then((m) => m.VariantForm));

interface VariantListProps {
  productId: number;
  variants: AdminVariantRow[];
  attributeSchema: AttributeDef[];
  currencies: CurrencyInfo[];
  lowStockThreshold: number;
}

function displayName(variant: AdminVariantRow, schema: AttributeDef[]): string {
  if (variant.name) return variant.name;
  const derived = variantLabel(schema, variant.attributes);
  return derived || variant.sku;
}

function PriceCell({ variant }: { variant: AdminVariantRow }) {
  const { base } = useCurrency();
  const foreign = variant.priceCurrency.currencyId !== base.currencyId;
  return (
    <div className="flex flex-col items-end">
      <span className="font-semibold text-ink">
        <Money value={variant.price} currency={variant.priceCurrency} />
      </span>
      {variant.compareAtPrice != null && variant.compareAtPrice > variant.price && (
        <span className="text-[11.5px] text-slate-400 line-through">
          <Money value={variant.compareAtPrice} currency={variant.priceCurrency} />
        </span>
      )}
      {foreign &&
        (variant.priceBase != null ? (
          <span className="text-[11.5px] text-slate-400">
            ≈ <Money value={variant.priceBase} />
          </span>
        ) : (
          <span className="inline-flex items-center gap-1 text-[11.5px] font-medium text-warn">
            <AlertTriangle className="h-3 w-3" strokeWidth={2} />
            Sin tasa
          </span>
        ))}
    </div>
  );
}

function StockCell({ variant, threshold }: { variant: AdminVariantRow; threshold: number }) {
  const out = variant.stock <= 0;
  const low = !out && variant.stock <= threshold;
  return (
    <span className={cn("tabular font-semibold", out ? "text-danger" : low ? "text-warn" : "text-ink")}>
      {variant.stock}
      {out && <span className="ml-1.5 text-[11px] font-medium">Agotado</span>}
      {low && <span className="ml-1.5 text-[11px] font-medium">Bajo</span>}
    </span>
  );
}

function VariantChips({ variant }: { variant: AdminVariantRow }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {variant.isDefault && <StatusChip label="Por defecto" tone="info" />}
      <StatusChip label={variant.isActive ? "Activa" : "Inactiva"} tone={variant.isActive ? "success" : "neutral"} />
    </div>
  );
}

export function VariantList({ productId, variants, attributeSchema, currencies, lowStockThreshold }: VariantListProps) {
  const [editing, setEditing] = useState<AdminVariantRow | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [stockTarget, setStockTarget] = useState<AdminVariantRow | null>(null);
  const [stockOpen, setStockOpen] = useState(false);

  const openNew = () => {
    setEditing(null);
    setFormOpen(true);
  };
  const openEdit = (variant: AdminVariantRow) => {
    setEditing(variant);
    setFormOpen(true);
  };
  const openStock = (variant: AdminVariantRow) => {
    setStockTarget(variant);
    setStockOpen(true);
  };

  const columns: ListColumn<AdminVariantRow>[] = [
    {
      id: "name",
      header: "Variante",
      isRowHeader: true,
      cell: (v) => (
        <div className="min-w-0">
          <p className="font-semibold text-ink">{displayName(v, attributeSchema)}</p>
          <p className="tabular text-[12px] text-slate-400">{v.sku}</p>
        </div>
      ),
    },
    { id: "price", header: "Precio", align: "right", cell: (v) => <PriceCell variant={v} /> },
    { id: "stock", header: "Stock", align: "right", cell: (v) => <StockCell variant={v} threshold={lowStockThreshold} /> },
    { id: "status", header: "Estado", cell: (v) => <VariantChips variant={v} /> },
    {
      id: "actions",
      header: "",
      align: "right",
      cell: (v) => (
        <div className="flex justify-end gap-1">
          <Button variant="ghost" size="sm" className="rounded-full" onPress={() => openStock(v)}>
            <Boxes className="h-4 w-4" strokeWidth={1.9} />
            Stock
          </Button>
          <Button variant="ghost" size="sm" isIconOnly aria-label={`Editar ${v.sku}`} onPress={() => openEdit(v)}>
            <Pencil className="h-4 w-4" strokeWidth={1.9} />
          </Button>
        </div>
      ),
    },
  ];

  const newButton = (
    <Button variant="primary" size="sm" className="rounded-full" onPress={openNew}>
      <Plus className="h-4 w-4" strokeWidth={2.2} />
      Nueva variante
    </Button>
  );

  return (
    <section className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-3">
        <p className="eyebrow">Variantes</p>
        {variants.length > 0 && newButton}
      </div>

      <ResponsiveList
        rows={variants}
        rowKey={(v) => v.variantId}
        columns={columns}
        ariaLabel="Variantes"
        empty={
          <div className="rounded-card bg-canvas shadow-card">
            <EmptyState
              icon={Layers}
              title="Sin variantes"
              description="Cada variante tiene su SKU, precio y stock. Crea al menos una para poder vender el producto."
              size="compact"
              action={newButton}
            />
          </div>
        }
        renderCard={(v) => (
          <ListCard
            title={displayName(v, attributeSchema)}
            subtitle={<span className="tabular">{v.sku}</span>}
            badge={<VariantChips variant={v} />}
            rows={[
              { label: "Precio", value: <PriceCell variant={v} /> },
              { label: "Stock", value: <StockCell variant={v} threshold={lowStockThreshold} /> },
            ]}
            actions={
              <>
                <Button variant="outline" size="sm" className="rounded-full" onPress={() => openStock(v)}>
                  <Boxes className="h-3.5 w-3.5" strokeWidth={1.9} />
                  Stock
                </Button>
                <Button variant="outline" size="sm" className="rounded-full" onPress={() => openEdit(v)}>
                  <Pencil className="h-3.5 w-3.5" strokeWidth={1.9} />
                  Editar
                </Button>
              </>
            }
          />
        )}
      />

      {/* key: el formulario se remonta por variante (y versión) para resetear los valores. */}
      <VariantForm
        key={editing ? `${editing.variantId}-${editing.version}` : "new"}
        open={formOpen}
        onOpenChange={setFormOpen}
        productId={productId}
        variant={editing}
        attributeSchema={attributeSchema}
        currencies={currencies}
      />
      <StockAdjustForm
        key={stockTarget ? `${stockTarget.variantId}-${stockTarget.stock}` : "none"}
        open={stockOpen}
        onOpenChange={setStockOpen}
        variant={stockTarget}
      />
    </section>
  );
}
