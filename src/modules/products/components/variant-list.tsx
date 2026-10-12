"use client";

import { lazyDialog } from "@/components/lazy-dialog";
import { useState } from "react";
import { Button } from "@heroui/react";
import { AlertTriangle, Boxes, Layers, Pencil, Plus } from "lucide-react";
import { DeleteButton } from "@/components/delete-button";
import { EmptyState } from "@/components/empty-state";
import { Money } from "@/components/money";
import { ListCard, ResponsiveList, type ListColumn } from "@/components/responsive-list";
import { StatusChip } from "@/components/status-chip";
import type { CurrencyInfo } from "@/lib/format";
import { cn } from "@/lib/utils";
import { useCurrency } from "@/modules/currency/store/currency-provider";
import { deleteVariant } from "../actions/variant-actions";
import { variantDisplayName, type AttributeDef } from "../lib/attribute-schema";
import type { ProductStatus } from "../lib/labels";
import { fmtQty } from "../lib/units";
import type { AdminVariantRow, AdminVariantSummary } from "../queries/product-queries";

const StockAdjustForm = lazyDialog(() => import("./stock-adjust-form").then((m) => m.StockAdjustForm));
const VariantForm = lazyDialog(() => import("./variant-form").then((m) => m.VariantForm));

interface VariantListProps {
  productId: number;
  productStatus: ProductStatus;
  variants: AdminVariantRow[];
  attributeSchema: AttributeDef[];
  currencies: CurrencyInfo[];
  lowStockThreshold: number;
}

/** Celdas compartidas con la lista de productos (variantes desplegadas). */
export function VariantPriceCell({ variant }: { variant: AdminVariantSummary }) {
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
      <VariantCostLine variant={variant} />
    </div>
  );
}

/** Costo de compra y margen bajo el precio; "Sin costo" invita a registrarlo. */
export function VariantCostLine({ variant }: { variant: AdminVariantSummary }) {
  if (variant.cost == null || !variant.costCurrency) {
    return <span className="text-[11px] text-slate-400">Sin costo</span>;
  }
  return (
    <span className="text-[11px] text-slate-400">
      Costo <Money value={variant.cost} currency={variant.costCurrency} />
      {variant.marginPct != null && (
        <span className={cn("ml-1 font-semibold", variant.marginPct < 0 ? "text-danger" : "text-ok")}>
          · margen {variant.marginPct} %
        </span>
      )}
    </span>
  );
}

export function VariantStockCell({ variant, threshold }: { variant: AdminVariantSummary; threshold: number }) {
  const out = variant.stock <= 0;
  const low = !out && variant.stock <= threshold;
  return (
    <span className={cn("tabular font-semibold", out ? "text-danger" : low ? "text-warn" : "text-ink")}>
      {fmtQty(variant.stock, variant.unit)}
      {out && <span className="ml-1.5 text-[11px] font-medium">Agotado</span>}
      {low && <span className="ml-1.5 text-[11px] font-medium">Bajo</span>}
    </span>
  );
}

function deleteBlockedReason(variant: AdminVariantRow, all: AdminVariantRow[], productStatus: ProductStatus): string | null {
  if (variant.orderLineCount > 0) {
    return `Aparece en ${variant.orderLineCount} ${variant.orderLineCount === 1 ? "pedido" : "pedidos"}. Desactívala en su lugar.`;
  }
  const onlyActive =
    productStatus === "active" &&
    variant.isActive &&
    !all.some((v) => v.variantId !== variant.variantId && v.isActive);
  if (onlyActive) return "Es la única variante publicada: publica otra o archiva el producto antes.";
  return null;
}

function DeleteVariantButton({
  variant,
  all,
  productStatus,
  schema,
  appearance,
}: {
  variant: AdminVariantRow;
  all: AdminVariantRow[];
  productStatus: ProductStatus;
  schema: AttributeDef[];
  appearance: "icon" | "button";
}) {
  const label = variantDisplayName(variant, schema);
  return (
    <DeleteButton
      appearance={appearance}
      itemLabel={`la variante ${label}`}
      description={`Se eliminará la variante ${label} (${variant.sku}) con su stock y sus movimientos.`}
      blockedReason={deleteBlockedReason(variant, all, productStatus)}
      successMessage={`Variante ${label} eliminada`}
      onConfirm={() => deleteVariant(variant.variantId)}
    >
      {variant.stock > 0 && (
        <p className="font-medium text-warn">
          Tiene {fmtQty(variant.stock, variant.unit, true)} en stock que desaparecerán del inventario.
        </p>
      )}
      {variant.isDefault && all.length > 1 && <p>Otra variante pasará a ser la predeterminada.</p>}
    </DeleteButton>
  );
}

export function VariantChips({ variant }: { variant: AdminVariantSummary }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {variant.isDefault && <StatusChip label="Por defecto" tone="info" />}
      <StatusChip label={variant.isActive ? "Activa" : "Inactiva"} tone={variant.isActive ? "success" : "neutral"} />
    </div>
  );
}

export function VariantList({ productId, productStatus, variants, attributeSchema, currencies, lowStockThreshold }: VariantListProps) {
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
          <p className="font-semibold text-ink">{variantDisplayName(v, attributeSchema)}</p>
          <p className="tabular text-[12px] text-slate-400">{v.sku}</p>
        </div>
      ),
    },
    { id: "price", header: "Precio", align: "right", cell: (v) => <VariantPriceCell variant={v} /> },
    { id: "stock", header: "Stock", align: "right", cell: (v) => <VariantStockCell variant={v} threshold={lowStockThreshold} /> },
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
          <DeleteVariantButton variant={v} all={variants} productStatus={productStatus} schema={attributeSchema} appearance="icon" />
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
            title={variantDisplayName(v, attributeSchema)}
            subtitle={<span className="tabular">{v.sku}</span>}
            badge={<VariantChips variant={v} />}
            rows={[
              { label: "Precio", value: <VariantPriceCell variant={v} /> },
              { label: "Stock", value: <VariantStockCell variant={v} threshold={lowStockThreshold} /> },
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
                <DeleteVariantButton variant={v} all={variants} productStatus={productStatus} schema={attributeSchema} appearance="button" />
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
