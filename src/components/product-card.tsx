"use client";

import Link from "next/link";
import { useMemo, useState, type MouseEvent } from "react";
import { toast } from "@heroui/react";
import { Plus } from "lucide-react";
import { Badge } from "@/components/badge";
import { Money } from "@/components/money";
import { ProductImage } from "@/components/product-image";
import { StockLabel } from "@/components/stock-label";
import { discountPct } from "@/lib/format";
import { useCartActions } from "@/modules/cart/store";
import { useCurrency } from "@/modules/currency/store/currency-provider";
import { useProductDrawer } from "@/modules/products/components/product-drawer-provider";
import { cartLineFor } from "@/modules/products/lib/cart-line";
import { perUnitSuffix } from "@/modules/products/lib/units";
import type { CatalogProduct } from "@/modules/products/queries/catalog-queries";
import { cn } from "@/lib/utils";

interface ProductCardProps {
  product: CatalogProduct;
  /** true solo para cards above-the-fold: precarga la imagen (LCP). */
  priority?: boolean;
}

export function ProductCard({ product, priority = false }: ProductCardProps) {
  const { addToCart } = useCartActions();
  const { openProduct } = useProductDrawer();
  const { formatBase } = useCurrency();
  const variant = product.defaultVariant;
  const soldOut = product.totalStock <= 0;
  const hasVariants = product.variants.length > 1;
  const pct = useMemo(() => discountPct(variant.price, variant.compareAtPrice), [variant]);
  const priceText = formatBase(variant.price);
  const [adding, setAdding] = useState(false);
  const href = `/producto/${encodeURIComponent(product.slug)}`;

  // La ficha se abre en el drawer sin salir de la retícula; el enlace real
  // queda para abrir en pestaña nueva (clic con modificador o botón central),
  // los rastreadores y quien navega sin JavaScript.
  const handleOpen = (e: MouseEvent<HTMLAnchorElement>) => {
    if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    e.preventDefault();
    openProduct(product);
  };

  // Con varias variantes el cliente elige en el detalle; la card no debe meter
  // una línea de la variante por defecto que quizá no quiere.
  const handleAdd = (e: MouseEvent) => {
    e.preventDefault();
    if (soldOut || variant.stock <= 0) {
      toast.warning("Producto agotado");
      return;
    }
    setAdding(true);
    addToCart(cartLineFor(product, variant), variant.qtyStep);
    toast.success(`${product.name} añadido al carrito`);
    window.setTimeout(() => setAdding(false), 300);
  };

  return (
    <article
      className={cn(
        "group relative flex h-full flex-col gap-3.5 rounded-card bg-canvas p-3 pb-4 shadow-card transition-[box-shadow,transform] duration-200 hover:shadow-float motion-safe:hover:-translate-y-0.5 sm:p-4 sm:pb-5"
      )}
    >
      {/* El enlace cubre la celda entera para que toda la card abra la ficha;
          va por encima de foto y texto (z-[1]) y debajo de los controles
          (z-10). Sin prefetch: la ficha completa solo se visita desde el
          drawer, y las cards de una retícula precargaban su loading en bloque. */}
      <Link
        href={href}
        prefetch={false}
        onClick={handleOpen}
        className="absolute inset-0 z-[1] rounded-card"
        aria-label={product.name}
      />

      <div className="relative aspect-square w-full overflow-hidden rounded-field bg-cream">
        <span className="absolute inset-0 flex items-center justify-center">
          <ProductImage
            src={product.imageUrl}
            alt=""
            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 280px"
            priority={priority}
          />
        </span>
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
        <StockLabel stock={product.totalStock} unit={hasVariants ? "unit" : variant.unit} />
      </div>

      {/* Pie estable: en la card de dos columnas (<sm) no caben precio y botón
          en la misma fila con importes largos («≈ 12 345,00 CUP»), así que el
          precio va en su línea y el botón a todo el ancho debajo; el alto de
          la card no depende del importe. Desde sm van lado a lado y el precio
          ocupa solo el sobrante (basis-0 + min-w-0), bajando un punto de
          cuerpo con importes largos para no partir las cifras. */}
      <div className="mt-auto flex flex-col gap-2.5 border-t border-line pt-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0 sm:flex-1 sm:basis-0">
          <div
            className={cn(
              "flex flex-wrap items-baseline gap-x-1 leading-tight font-bold text-navy-900",
              priceSizeClass(priceText)
            )}
          >
            {hasVariants && <span className="text-[11px] font-medium text-slate-400">desde</span>}
            <Money value={variant.price} className="whitespace-normal break-words" />
            {perUnitSuffix(variant.unit) && (
              <span className="text-[11px] font-medium text-slate-400">{perUnitSuffix(variant.unit)}</span>
            )}
          </div>
          {variant.compareAtPrice != null && variant.compareAtPrice > variant.price && (
            <div className="mt-0.5 text-[11px] font-medium text-slate-400 line-through">
              <Money value={variant.compareAtPrice} className="whitespace-normal break-words" />
            </div>
          )}
        </div>
        {hasVariants ? (
          <Link
            href={href}
            prefetch={false}
            onClick={handleOpen}
            className="relative z-10 flex h-9 flex-none items-center justify-center rounded-full bg-tint px-4 text-[12.5px] font-semibold text-navy-900 transition-colors duration-150 hover:bg-tint-strong sm:w-auto"
          >
            Elegir
          </Link>
        ) : (
          <button
            type="button"
            onClick={handleAdd}
            aria-disabled={soldOut}
            className={cn(
              "relative z-10 flex h-9 flex-none items-center justify-center gap-1.5 rounded-full px-4 text-[12.5px] font-semibold transition-[background-color,transform] duration-150 motion-safe:active:scale-95 sm:w-auto",
              soldOut
                ? "cursor-not-allowed bg-cream text-disabled"
                : "bg-navy-700 text-on-brand hover:bg-navy-600",
              adding && "scale-95"
            )}
          >
            <Plus className="h-4 w-4" strokeWidth={2.4} aria-hidden />
            {soldOut ? "Agotado" : "Añadir"}
          </button>
        )}
      </div>
    </article>
  );
}

/** Cuerpo del precio según lo largo del importe formateado: junto al botón
 *  (≥sm) un «≈ 12 345,00 CUP» a 16px no cabe y partiría las cifras; a 13px
 *  cabe en una línea, y en móvil evita que «CUP» salte de línea. */
function priceSizeClass(text: string): string {
  if (text.length <= 10) return "text-[15px] sm:text-[16px]";
  if (text.length <= 14) return "text-[13px] sm:text-[14px]";
  return "text-[12px] sm:text-[13px]";
}
