"use client";

import { useId, useMemo, useState } from "react";
import { Button, toast } from "@heroui/react";
import { ShoppingCart } from "lucide-react";
import { Badge } from "@/components/badge";
import { ChoiceChips } from "@/components/choice-chips";
import { Money } from "@/components/money";
import { QtyStepper } from "@/components/qty-stepper";
import { StockLabel } from "@/components/stock-label";
import { discountPct } from "@/lib/format";
import { cn } from "@/lib/utils";
import { useCartActions } from "@/modules/cart/store";
import { useCurrency } from "@/modules/currency/store/currency-provider";
import { cartLineFor } from "../lib/cart-line";
import { buildProductGallery, slideIndexForVariant } from "../lib/product-gallery";
import { fmtQty, maxSellable, perUnitSuffix, roundQty } from "../lib/units";
import type { CatalogProduct, CatalogVariant } from "../queries/catalog-queries";

/* Piezas de la ficha de producto compartidas por la página completa
   (`/producto/[slug]`) y el drawer que abren las cards: misma selección de
   variante, cantidad y foto, distinta disposición. */

/** Estado de la ficha: variante elegida, cantidad, foto activa del carrusel y
 *  alta en el carrito. Montar con `key` por producto para reiniciarlo. */
export function useProductSelection(product: CatalogProduct) {
  const { addToCart } = useCartActions();
  const slides = useMemo(() => buildProductGallery(product), [product]);
  const [variantId, setVariantId] = useState(product.defaultVariant.variantId);
  const [qty, setQty] = useState(product.defaultVariant.qtyStep);
  const [slide, setSlide] = useState(() =>
    Math.max(0, slideIndexForVariant(slides, product.defaultVariant.variantId))
  );
  const variant = product.variants.find((v) => v.variantId === variantId) ?? product.defaultVariant;
  const maxQty = maxSellable(variant.stock, variant.qtyStep);
  const soldOut = maxQty <= 0;

  const selectVariant = (id: number) => {
    const next = product.variants.find((v) => v.variantId === id);
    if (!next) return;
    setVariantId(id);
    setQty(next.qtyStep);
    // Si la variante tiene foto propia el carrusel la enseña.
    const i = slideIndexForVariant(slides, id);
    if (i >= 0) setSlide(i);
  };

  const inc = () =>
    setQty((q) => Math.min(roundQty(q + variant.qtyStep), Math.max(variant.qtyStep, maxQty)));
  const dec = () => setQty((q) => Math.max(variant.qtyStep, roundQty(q - variant.qtyStep)));

  /** Añade la selección al carrito; false si la variante está agotada. */
  const addSelection = (): boolean => {
    if (soldOut) {
      toast.warning("Esta variante está agotada");
      return false;
    }
    addToCart(cartLineFor(product, variant), qty);
    toast.success(
      `${fmtQty(qty, variant.unit)} de ${product.name}${variant.name ? ` · ${variant.name}` : ""} en el carrito`
    );
    setQty(variant.qtyStep);
    return true;
  };

  return { variant, qty, maxQty, soldOut, slides, slide, setSlide, selectVariant, inc, dec, addSelection };
}

export type ProductSelection = ReturnType<typeof useProductSelection>;

/** Etiquetas sobre la foto, en fila arriba a la izquierda (arriba a la
 *  derecha va el botón de cerrar del drawer). */
export function ProductBadges({
  product,
  variant,
  soldOut,
}: {
  product: CatalogProduct;
  variant: CatalogVariant;
  soldOut: boolean;
}) {
  const pct = discountPct(variant.price, variant.compareAtPrice);
  if (soldOut || (!product.featured && pct <= 0)) return null;
  return (
    <div className="pointer-events-none absolute top-3 left-3 flex flex-wrap gap-1.5">
      {product.featured && <Badge variant="featured">Destacado</Badge>}
      {pct > 0 && <Badge variant="discount">−{pct}%</Badge>}
    </div>
  );
}

export function ProductPrice({ variant, className }: { variant: CatalogVariant; className?: string }) {
  const { base } = useCurrency();
  const unitSuffix = perUnitSuffix(variant.unit);
  return (
    <div className={cn("flex flex-wrap items-baseline gap-x-3 gap-y-1", className)} aria-live="polite">
      <p className="font-display text-[26px] leading-none text-navy-900">
        <Money value={variant.price} />
        {unitSuffix && <span className="ml-1.5 text-[14px] font-medium text-slate-400">{unitSuffix}</span>}
      </p>
      {variant.compareAtPrice != null && variant.compareAtPrice > variant.price && (
        <p className="text-[14px] font-medium text-slate-400 line-through">
          <Money value={variant.compareAtPrice} />
        </p>
      )}
      {variant.origCurrency.currencyId !== base.currencyId && (
        <p className="text-[12px] text-slate-400">
          Precio en <Money value={variant.origPrice} currency={variant.origCurrency} /> a la tasa del día
        </p>
      )}
    </div>
  );
}

export function ProductAvailability({ variant, className }: { variant: CatalogVariant; className?: string }) {
  return (
    <div className={cn("flex flex-wrap items-center gap-x-3 gap-y-1", className)}>
      <StockLabel stock={variant.stock} unit={variant.unit} />
      {variant.unit !== "unit" && (
        <span className="text-[12px] leading-none text-slate-400">
          Se vende en pasos de {fmtQty(variant.qtyStep, variant.unit)}
        </span>
      )}
    </div>
  );
}

export function ProductVariantPicker({
  product,
  variant,
  onSelect,
  className,
}: {
  product: CatalogProduct;
  variant: CatalogVariant;
  onSelect: (variantId: number) => void;
  className?: string;
}) {
  const labelId = useId();
  const options = useMemo(
    () =>
      product.variants.map((v) => ({
        value: String(v.variantId),
        label: v.name ?? v.sku,
        disabled: v.stock <= 0,
      })),
    [product.variants]
  );
  if (product.variants.length < 2) return null;
  return (
    <div className={className}>
      <p id={labelId} className="eyebrow mb-2.5">
        Elige una opción
      </p>
      <ChoiceChips
        options={options}
        value={String(variant.variantId)}
        onChange={(value) => onSelect(Number(value))}
        labelledBy={labelId}
      />
    </div>
  );
}

export function ProductDescription({ product, className }: { product: CatalogProduct; className?: string }) {
  if (!product.description) return null;
  return (
    <div className={cn("border-t border-line pt-6", className)}>
      <p className="eyebrow">Descripción</p>
      <p className="mt-2.5 text-[14px] leading-[1.7] text-pretty text-slate-500">{product.description}</p>
    </div>
  );
}

/** Atributos de producto del tipo más el SKU de la variante elegida. */
export function ProductSpecs({
  product,
  variant,
  className,
}: {
  product: CatalogProduct;
  variant: CatalogVariant;
  className?: string;
}) {
  const attributes = product.attributeSchema
    .filter((def) => def.scope === "product" && product.attributes[def.key] !== undefined)
    .map((def) => ({ label: def.label, value: String(product.attributes[def.key]) }));
  return (
    <dl
      className={cn(
        "grid grid-cols-[auto_minmax(0,1fr)] gap-x-6 gap-y-2 border-t border-line pt-6 text-[13.5px]",
        className
      )}
    >
      {attributes.map((attr) => (
        <div key={attr.label} className="contents">
          <dt className="text-slate-400">{attr.label}</dt>
          <dd className="min-w-0 font-medium break-words text-ink">{attr.value}</dd>
        </div>
      ))}
      <div className="contents">
        <dt className="text-slate-400">SKU</dt>
        <dd className="tabular min-w-0 font-medium break-words text-ink">{variant.sku}</dd>
      </div>
    </dl>
  );
}

export function ProductAddControls({
  selection,
  onAdded,
  className,
  buttonClassName,
}: {
  selection: ProductSelection;
  /** Tras añadir con éxito (el drawer se cierra). */
  onAdded?: () => void;
  className?: string;
  buttonClassName?: string;
}) {
  const { variant, qty, maxQty, soldOut, inc, dec, addSelection } = selection;
  return (
    <div className={cn("flex items-center gap-3", className)}>
      <QtyStepper
        qty={qty}
        onInc={inc}
        onDec={dec}
        max={maxQty}
        step={variant.qtyStep}
        unit={variant.unit}
        size="lg"
      />
      <Button
        variant="primary"
        size="lg"
        className={cn("rounded-full", buttonClassName)}
        isDisabled={soldOut}
        onPress={() => {
          if (addSelection()) onAdded?.();
        }}
      >
        <ShoppingCart className="h-4 w-4" strokeWidth={2} />
        {soldOut ? "Agotado" : "Añadir al carrito"}
      </Button>
    </div>
  );
}
