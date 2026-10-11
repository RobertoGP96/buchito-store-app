"use client";

import Link from "next/link";
import { useState } from "react";
import { Button } from "@heroui/react";
import { AlertTriangle, ChevronRight, CornerDownRight, Package, Pencil, Plus } from "lucide-react";
import { ButtonLink } from "@/components/button-link";
import { EmptyState } from "@/components/empty-state";
import { lazyDialog } from "@/components/lazy-dialog";
import { Money } from "@/components/money";
import { ListCard, ResponsiveList, type ListColumn } from "@/components/responsive-list";
import { StatusChip } from "@/components/status-chip";
import type { CurrencyInfo } from "@/lib/format";
import { cn } from "@/lib/utils";
import { variantDisplayName } from "../lib/attribute-schema";
import { PRODUCT_STATUS_META } from "../lib/labels";
import type { AdminProductRow, AdminVariantSummary } from "../queries/product-queries";
import { VariantChips, VariantPriceCell, VariantStockCell } from "./variant-list";

const VariantForm = lazyDialog(() => import("./variant-form").then((m) => m.VariantForm));

interface ProductListProps {
  rows: AdminProductRow[];
  currencies: CurrencyInfo[];
  lowStockThreshold: number;
}

/** La tabla mezcla filas de producto con las variantes de los desplegados;
 *  en móvil las variantes van dentro de la card, así que solo hay productos. */
type ListRow =
  | { kind: "product"; product: AdminProductRow }
  | { kind: "variant"; product: AdminProductRow; variant: AdminVariantSummary };

type EditingVariant = { product: AdminProductRow; variant: AdminVariantSummary };

function rowKey(row: ListRow): string {
  return row.kind === "product" ? `p-${row.product.productId}` : `v-${row.variant.variantId}`;
}

function productHref(product: AdminProductRow): string {
  return `/admin/productos/${product.productId}`;
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

function ProductChips({ row }: { row: AdminProductRow }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      <StatusChip {...PRODUCT_STATUS_META[row.status]} />
      {row.featured && <StatusChip label="Destacado" tone="info" />}
    </div>
  );
}

function ExpandToggle({
  product,
  expanded,
  onToggle,
  className,
}: {
  product: AdminProductRow;
  expanded: boolean;
  onToggle: () => void;
  className?: string;
}) {
  return (
    <Button
      variant="ghost"
      size="sm"
      isIconOnly
      aria-expanded={expanded}
      aria-label={`${expanded ? "Ocultar" : "Ver"} variantes de ${product.name}`}
      className={className}
      onPress={onToggle}
    >
      <ChevronRight
        className={cn("h-4 w-4 transition-transform duration-150", expanded && "rotate-90")}
        strokeWidth={2}
      />
    </Button>
  );
}

function EditProductLink({ product, label }: { product: AdminProductRow; label?: string }) {
  return (
    <ButtonLink
      href={productHref(product)}
      variant={label ? "outline" : "ghost"}
      size="sm"
      aria-label={label ? undefined : `Editar ${product.name}`}
      className={label ? undefined : "h-8 w-8 px-0"}
    >
      <Pencil className={label ? "h-3.5 w-3.5" : "h-4 w-4"} strokeWidth={1.9} />
      {label}
    </ButtonLink>
  );
}

export function ProductList({ rows, currencies, lowStockThreshold }: ProductListProps) {
  const [expanded, setExpanded] = useState<ReadonlySet<number>>(() => new Set());
  const [editing, setEditing] = useState<EditingVariant | null>(null);
  const [formOpen, setFormOpen] = useState(false);

  const isExpanded = (product: AdminProductRow) => expanded.has(product.productId);
  const toggle = (product: AdminProductRow) =>
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(product.productId)) next.delete(product.productId);
      else next.add(product.productId);
      return next;
    });
  const openEdit = (product: AdminProductRow, variant: AdminVariantSummary) => {
    setEditing({ product, variant });
    setFormOpen(true);
  };

  const productRows: ListRow[] = rows.map((product) => ({ kind: "product", product }));
  const tableRows: ListRow[] = rows.flatMap((product): ListRow[] => {
    const own: ListRow = { kind: "product", product };
    if (!isExpanded(product)) return [own];
    return [own, ...product.variants.map((variant): ListRow => ({ kind: "variant", product, variant }))];
  });

  const columns: ListColumn<ListRow>[] = [
    {
      id: "name",
      header: "Producto",
      isRowHeader: true,
      cell: (r) =>
        r.kind === "product" ? (
          <div className="flex min-w-0 items-center gap-1.5">
            {r.product.variants.length > 0 ? (
              <ExpandToggle
                product={r.product}
                expanded={isExpanded(r.product)}
                onToggle={() => toggle(r.product)}
                className="-ml-2 flex-none"
              />
            ) : (
              <span aria-hidden className="-ml-2 h-8 w-8 flex-none" />
            )}
            <div className="min-w-0">
              <Link href={productHref(r.product)} className="font-semibold text-navy-700 hover:underline">
                {r.product.name}
              </Link>
              <p className="text-[12px] text-slate-400">
                {r.product.typeName}
                {r.product.categoryName ? ` · ${r.product.categoryName}` : ""}
              </p>
            </div>
          </div>
        ) : (
          <div className="flex min-w-0 items-center gap-2 pl-7">
            <CornerDownRight className="h-3.5 w-3.5 flex-none text-slate-400" strokeWidth={2} />
            <div className="min-w-0">
              <p className="font-medium text-ink">{variantDisplayName(r.variant, r.product.attributeSchema)}</p>
              <p className="tabular text-[12px] text-slate-400">{r.variant.sku}</p>
            </div>
          </div>
        ),
    },
    {
      id: "variants",
      header: "Variantes",
      align: "right",
      cell: (r) => (r.kind === "product" ? <span className="tabular">{r.product.variantCount}</span> : null),
    },
    {
      id: "stock",
      header: "Stock",
      align: "right",
      cell: (r) =>
        r.kind === "product" ? (
          <StockCell row={r.product} threshold={lowStockThreshold} />
        ) : (
          <VariantStockCell variant={r.variant} threshold={lowStockThreshold} />
        ),
    },
    {
      id: "price",
      header: "Precio",
      align: "right",
      cell: (r) => (r.kind === "product" ? <PriceCell row={r.product} /> : <VariantPriceCell variant={r.variant} />),
    },
    {
      id: "status",
      header: "Estado",
      cell: (r) => (r.kind === "product" ? <ProductChips row={r.product} /> : <VariantChips variant={r.variant} />),
    },
    {
      id: "actions",
      header: "",
      align: "right",
      cell: (r) => (
        <div className="flex justify-end gap-1">
          {r.kind === "product" ? (
            <EditProductLink product={r.product} />
          ) : (
            <Button
              variant="ghost"
              size="sm"
              isIconOnly
              aria-label={`Editar variante ${r.variant.sku}`}
              onPress={() => openEdit(r.product, r.variant)}
            >
              <Pencil className="h-4 w-4" strokeWidth={1.9} />
            </Button>
          )}
        </div>
      ),
    },
  ];

  return (
    <>
      <div className="flex justify-end">
        <ButtonLink href="/admin/productos/nuevo" variant="solid">
          <Plus className="h-4 w-4" strokeWidth={2.2} />
          Nuevo producto
        </ButtonLink>
      </div>

      <ResponsiveList
        rows={productRows}
        tableRows={tableRows}
        rowKey={rowKey}
        rowClassName={(r) => (r.kind === "variant" ? "bg-tint/40" : undefined)}
        columns={columns}
        ariaLabel="Productos"
        empty={
          <div className="rounded-card bg-canvas shadow-card">
            <EmptyState
              icon={Package}
              title="Sin productos"
              description="Crea primero un tipo de producto y una categoría; después da de alta el primer producto."
              size="compact"
              ctaLabel="Nuevo producto"
              ctaHref="/admin/productos/nuevo"
            />
          </div>
        }
        renderCard={(r) => {
          if (r.kind !== "product") return null;
          const product = r.product;
          const open = isExpanded(product);
          return (
            <ListCard
              title={
                <Link href={productHref(product)} className="text-navy-700 hover:underline">
                  {product.name}
                </Link>
              }
              subtitle={`${product.typeName}${product.categoryName ? ` · ${product.categoryName}` : ""}`}
              badge={<ProductChips row={product} />}
              rows={[
                { label: "Variantes", value: product.variantCount },
                { label: "Stock", value: <StockCell row={product} threshold={lowStockThreshold} /> },
                { label: "Precio", value: <PriceCell row={product} /> },
              ]}
              actions={<EditProductLink product={product} label="Editar producto" />}
            >
              {product.variants.length > 0 && (
                <div className="mt-3 border-t border-line pt-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="-ml-2 rounded-full"
                    aria-expanded={open}
                    onPress={() => toggle(product)}
                  >
                    <ChevronRight
                      className={cn("h-4 w-4 transition-transform duration-150", open && "rotate-90")}
                      strokeWidth={2}
                    />
                    {open ? "Ocultar variantes" : `Ver variantes (${product.variants.length})`}
                  </Button>
                  {open && (
                    <ul className="mt-2 flex flex-col divide-y divide-line rounded-field bg-tint/40">
                      {product.variants.map((variant) => (
                        <li key={variant.variantId} className="flex items-start justify-between gap-3 px-3 py-2.5">
                          <div className="min-w-0 text-[13px]">
                            <p className="font-medium text-ink">
                              {variantDisplayName(variant, product.attributeSchema)}
                            </p>
                            <p className="tabular text-[12px] text-slate-400">{variant.sku}</p>
                            <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1">
                              <VariantPriceCell variant={variant} />
                              <span className="text-[12.5px]">
                                <span className="text-slate-400">Stock </span>
                                <VariantStockCell variant={variant} threshold={lowStockThreshold} />
                              </span>
                              <VariantChips variant={variant} />
                            </div>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            isIconOnly
                            className="flex-none"
                            aria-label={`Editar variante ${variant.sku}`}
                            onPress={() => openEdit(product, variant)}
                          >
                            <Pencil className="h-4 w-4" strokeWidth={1.9} />
                          </Button>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )}
            </ListCard>
          );
        }}
      />

      {/* key: el formulario se remonta por variante (y versión) para resetear los valores. */}
      {editing && (
        <VariantForm
          key={`${editing.variant.variantId}-${editing.variant.version}`}
          open={formOpen}
          onOpenChange={setFormOpen}
          productId={editing.product.productId}
          variant={editing.variant}
          attributeSchema={editing.product.attributeSchema}
          currencies={currencies}
        />
      )}
    </>
  );
}
