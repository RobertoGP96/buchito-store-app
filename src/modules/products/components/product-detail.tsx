"use client";

import Link from "next/link";
import { unstable_ViewTransition as ViewTransition, useMemo, useState } from "react";
import { Button, toast } from "@heroui/react";
import { ChevronLeft, ShoppingCart } from "lucide-react";
import { Badge } from "@/components/badge";
import { ChoiceChips } from "@/components/choice-chips";
import { Money } from "@/components/money";
import { PRODUCT_IMAGE_TRANSITION, ProductImage } from "@/components/product-image";
import { QtyStepper } from "@/components/qty-stepper";
import { StockLabel } from "@/components/stock-label";
import { cartLineFor } from "@/components/product-card";
import { discountPct } from "@/lib/format";
import { useCart } from "@/modules/cart/store";
import { useCurrency } from "@/modules/currency/store/currency-provider";
import type { CatalogProduct } from "../queries/catalog-queries";

export function ProductDetail({ product }: { product: CatalogProduct }) {
  const { addToCart } = useCart();
  const { base } = useCurrency();
  const [variantId, setVariantId] = useState(product.defaultVariant.variantId);
  const [qty, setQty] = useState(1);
  const variant = product.variants.find((v) => v.variantId === variantId) ?? product.defaultVariant;
  const soldOut = variant.stock <= 0;
  const pct = discountPct(variant.price, variant.compareAtPrice);
  const imageUrl = variant.imageUrl ?? product.imageUrl;

  const variantOptions = useMemo(
    () =>
      product.variants.map((v) => ({
        value: String(v.variantId),
        label: v.name ?? v.sku,
        disabled: v.stock <= 0,
      })),
    [product.variants]
  );

  const productAttributes = product.attributeSchema
    .filter((def) => def.scope === "product" && product.attributes[def.key] !== undefined)
    .map((def) => ({ label: def.label, value: String(product.attributes[def.key]) }));

  const handleAdd = () => {
    if (soldOut) {
      toast.warning("Esta variante está agotada");
      return;
    }
    addToCart(cartLineFor(product, variant), qty);
    toast.success(`${product.name}${variant.name ? ` · ${variant.name}` : ""} añadido a la bolsa`);
    setQty(1);
  };

  return (
    <div className="mx-auto w-full max-w-[1120px] px-5 pt-6 pb-12 md:px-6 md:pt-8">
      <Link
        href="/catalogo"
        className="nav-label -ml-1 inline-flex items-center gap-0.5 text-slate-500 transition-colors duration-150 hover:text-navy-700"
      >
        <ChevronLeft className="h-4 w-4" strokeWidth={2} />
        Catálogo
      </Link>

      <div className="mt-5 grid gap-8 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] md:gap-12">
        <div className="relative aspect-square w-full overflow-hidden rounded-card bg-cream shadow-card">
          <ViewTransition name={PRODUCT_IMAGE_TRANSITION} enter="none" exit="none" default="none" share="product-image">
            <span className="absolute inset-0 flex items-center justify-center">
              {/* key: ProductImage guarda `failed`; al cambiar de variante debe reintentar. */}
              <ProductImage key={imageUrl ?? "none"} src={imageUrl} alt={product.name} sizes="(max-width: 768px) 100vw, 560px" priority />
            </span>
          </ViewTransition>
          {product.featured && !soldOut && (
            <Badge variant="featured" className="absolute top-3 left-3">
              Destacado
            </Badge>
          )}
          {!soldOut && pct > 0 && (
            <Badge variant="discount" className="absolute top-3 right-3">
              −{pct}%
            </Badge>
          )}
        </div>

        <div className="flex flex-col">
          {product.categoryName && (
            <Link href={`/catalogo?cat=${product.categorySlug}`} className="eyebrow hover:text-navy-700">
              {product.categoryName}
            </Link>
          )}
          <h1 className="font-display mt-2 text-[26px] leading-[1.1] text-navy-900 md:text-[32px]">
            {product.name}
          </h1>

          <div className="mt-4 flex flex-wrap items-baseline gap-x-3 gap-y-1" aria-live="polite">
            <p className="font-display text-[26px] leading-none text-navy-900">
              <Money value={variant.price} />
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
          <div className="mt-2">
            <StockLabel stock={variant.stock} />
          </div>

          {product.variants.length > 1 && (
            <div className="mt-6">
              <p id="variant-label" className="eyebrow mb-2.5">
                Elige una opción
              </p>
              <ChoiceChips
                options={variantOptions}
                value={String(variant.variantId)}
                onChange={(value) => {
                  setVariantId(Number(value));
                  setQty(1);
                }}
                labelledBy="variant-label"
              />
            </div>
          )}

          <div className="mt-6 flex flex-wrap items-center gap-3">
            <QtyStepper
              qty={qty}
              onInc={() => setQty((q) => Math.min(q + 1, Math.max(1, variant.stock)))}
              onDec={() => setQty((q) => Math.max(1, q - 1))}
              max={variant.stock}
              size="lg"
            />
            <Button
              variant="primary"
              size="lg"
              className="rounded-full"
              isDisabled={soldOut}
              onPress={handleAdd}
            >
              <ShoppingCart className="h-4 w-4" strokeWidth={2} />
              {soldOut ? "Agotado" : "Añadir a la bolsa"}
            </Button>
          </div>

          {product.description && (
            <div className="mt-8 border-t border-line pt-6">
              <p className="eyebrow">Descripción</p>
              <p className="mt-2.5 text-[14px] leading-[1.7] text-pretty text-slate-500">{product.description}</p>
            </div>
          )}

          {(productAttributes.length > 0 || variant.sku) && (
            <dl className="mt-6 grid grid-cols-[auto_1fr] gap-x-6 gap-y-2 border-t border-line pt-6 text-[13.5px]">
              {productAttributes.map((attr) => (
                <div key={attr.label} className="contents">
                  <dt className="text-slate-400">{attr.label}</dt>
                  <dd className="font-medium text-ink">{attr.value}</dd>
                </div>
              ))}
              <div className="contents">
                <dt className="text-slate-400">SKU</dt>
                <dd className="tabular font-medium text-ink">{variant.sku}</dd>
              </div>
            </dl>
          )}
        </div>
      </div>
    </div>
  );
}
