"use client";

import Link from "next/link";
import { unstable_ViewTransition as ViewTransition, useMemo, useState, type MouseEvent } from "react";
import { toast } from "@heroui/react";
import { Plus } from "lucide-react";
import { Badge } from "@/components/badge";
import { Money } from "@/components/money";
import { PRODUCT_IMAGE_TRANSITION, ProductImage } from "@/components/product-image";
import { StockLabel } from "@/components/stock-label";
import { discountPct } from "@/lib/format";
import { useCart } from "@/modules/cart/store";
import type { CatalogProduct, CatalogVariant } from "@/modules/products/queries/catalog-queries";
import { cn } from "@/lib/utils";

interface ProductCardProps {
  product: CatalogProduct;
  /** true solo para cards above-the-fold: precarga la imagen (LCP). */
  priority?: boolean;
}

export function cartLineFor(product: CatalogProduct, variant: CatalogVariant) {
  return {
    variantId: variant.variantId,
    productId: product.productId,
    slug: product.slug,
    name: product.name,
    variantName: variant.name,
    sku: variant.sku,
    imageUrl: variant.imageUrl ?? product.imageUrl,
    unitPrice: variant.price,
    compareAtPrice: variant.compareAtPrice,
    stock: variant.stock,
  };
}

export function ProductCard({ product, priority = false }: ProductCardProps) {
  const { addToCart } = useCart();
  const variant = product.defaultVariant;
  const soldOut = product.totalStock <= 0;
  const hasVariants = product.variants.length > 1;
  const pct = useMemo(() => discountPct(variant.price, variant.compareAtPrice), [variant]);
  const [adding, setAdding] = useState(false);
  // Solo la card pulsada toma el nombre compartido: la foto viaja a la ficha.
  const [leaving, setLeaving] = useState(false);
  const markLeaving = () => setLeaving(true);
  const href = `/producto/${encodeURIComponent(product.slug)}`;

  // Con varias variantes el cliente elige en el detalle; la card no debe meter
  // una línea de la variante por defecto que quizá no quiere.
  const handleAdd = (e: MouseEvent) => {
    e.preventDefault();
    if (soldOut || variant.stock <= 0) {
      toast.warning("Producto agotado");
      return;
    }
    setAdding(true);
    addToCart(cartLineFor(product, variant), 1);
    toast.success(`${product.name} añadido a la bolsa`);
    window.setTimeout(() => setAdding(false), 300);
  };

  return (
    <article
      className={cn(
        "group relative flex h-full flex-col gap-3.5 rounded-card bg-canvas p-3 pb-4 shadow-card transition-[box-shadow,transform] duration-200 hover:shadow-float motion-safe:hover:-translate-y-0.5 sm:p-4 sm:pb-5"
      )}
    >
      {/* El enlace cubre la celda entera para que toda la card navegue; va por
          encima de foto y texto (z-[1]) y debajo de los controles (z-10). */}
      <Link href={href} onClick={markLeaving} className="absolute inset-0 z-[1] rounded-card" aria-label={product.name} />

      <div className="relative aspect-square w-full overflow-hidden rounded-field bg-cream">
        <ViewTransition
          name={leaving ? PRODUCT_IMAGE_TRANSITION : undefined}
          enter="none"
          exit="none"
          default="none"
          share="product-image"
        >
          <span className="absolute inset-0 flex items-center justify-center">
            <ProductImage
              src={product.imageUrl}
              alt=""
              sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 280px"
              priority={priority}
            />
          </span>
        </ViewTransition>
        {product.featured && !soldOut && (
          <Badge variant="featured" className="absolute top-2 left-2">
            Destacado
          </Badge>
        )}
        {soldOut && (
          <Badge variant="soldout" className="absolute top-2 left-2">
            Agotado
          </Badge>
        )}
        {!soldOut && pct > 0 && (
          <Badge variant="discount" className="absolute top-2 right-2">
            −{pct}%
          </Badge>
        )}
      </div>

      <div className="flex min-w-0 flex-col gap-1.5">
        {product.categoryName && <span className="eyebrow truncate">{product.categoryName}</span>}
        <h3 className="line-clamp-2 text-[14.5px] leading-[1.35] font-semibold text-ink sm:text-[15px]">
          {product.name}
        </h3>
        {hasVariants && (
          <span className="text-[12px] text-slate-400">{product.variants.length} variantes</span>
        )}
        <StockLabel stock={product.totalStock} />
      </div>

      <div className="mt-auto flex items-end justify-between gap-2.5 border-t border-line pt-3">
        <div className="min-w-0">
          <div className="text-[15px] leading-tight font-bold text-navy-900 sm:text-[16px]">
            {hasVariants && <span className="mr-1 text-[11px] font-medium text-slate-400">desde</span>}
            <Money value={variant.price} />
          </div>
          {variant.compareAtPrice != null && variant.compareAtPrice > variant.price && (
            <div className="mt-0.5 text-[11px] font-medium text-slate-400 line-through">
              <Money value={variant.compareAtPrice} />
            </div>
          )}
        </div>
        {hasVariants ? (
          <Link
            href={href}
            onClick={markLeaving}
            className="relative z-10 flex h-9 flex-none items-center justify-center rounded-full bg-tint px-4 text-[12.5px] font-semibold text-navy-900 transition-colors duration-150 hover:bg-tint-strong"
          >
            Elegir
          </Link>
        ) : (
          <button
            type="button"
            onClick={handleAdd}
            aria-disabled={soldOut}
            className={cn(
              "relative z-10 flex h-9 w-9 flex-none items-center justify-center rounded-full font-semibold transition-[background-color,transform] duration-150 motion-safe:active:scale-95 sm:h-auto sm:w-auto sm:px-4 sm:py-[9px] sm:text-[12.5px]",
              soldOut
                ? "cursor-not-allowed bg-cream text-disabled"
                : "bg-navy-700 text-on-brand hover:bg-navy-600",
              adding && "scale-95"
            )}
          >
            <Plus className="h-4 w-4 sm:hidden" strokeWidth={2.4} aria-hidden />
            <span className="hidden sm:inline">{soldOut ? "Agotado" : "Añadir"}</span>
            <span className="sr-only sm:hidden">{soldOut ? "Agotado" : "Añadir a la bolsa"}</span>
          </button>
        )}
      </div>
    </article>
  );
}
