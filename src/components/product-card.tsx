"use client";

import Link from "next/link";
import { useMemo, useState, type MouseEvent } from "react";
import { toast } from "@heroui/react";
import { Plus } from "lucide-react";
import { Badge } from "@/components/badge";
import {
  CARD_BODY,
  CARD_FOOT,
  CARD_MEDIA,
  CARD_MEDIA_ZOOM,
  CARD_SHELL,
  CARD_TITLE,
  CardPrice,
  cardCtaClasses,
} from "@/components/card-parts";
import { PRODUCT_GRID_IMAGE_SIZES } from "@/components/product-grid";
import { ProductImage } from "@/components/product-image";
import { StockLabel } from "@/components/stock-label";
import { discountPct } from "@/lib/format";
import { useCartActions } from "@/modules/cart/store";
import { useProductDrawer } from "@/modules/products/components/product-drawer-provider";
import { cartLineFor } from "@/modules/products/lib/cart-line";
import { perUnitSuffix } from "@/modules/products/lib/units";
import type { CatalogProduct } from "@/modules/products/queries/catalog-queries";

interface ProductCardProps {
  product: CatalogProduct;
  /** true solo para cards above-the-fold: precarga la imagen (LCP). */
  priority?: boolean;
}

export function ProductCard({ product, priority = false }: ProductCardProps) {
  const { addToCart } = useCartActions();
  const { openProduct } = useProductDrawer();
  const variant = product.defaultVariant;
  const soldOut = product.totalStock <= 0;
  const hasVariants = product.variants.length > 1;
  const pct = useMemo(() => discountPct(variant.price, variant.compareAtPrice), [variant]);
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
    <article className={CARD_SHELL}>
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

      <div className={CARD_MEDIA}>
        <span className={CARD_MEDIA_ZOOM}>
          <ProductImage
            src={product.imageUrl}
            alt=""
            sizes={PRODUCT_GRID_IMAGE_SIZES}
            priority={priority}
          />
        </span>
        {product.featured && !soldOut && (
          <Badge variant="featured" className="absolute top-2.5 left-2.5">
            Destacado
          </Badge>
        )}
        {soldOut && (
          <Badge variant="soldout" className="absolute top-2.5 left-2.5">
            Agotado
          </Badge>
        )}
        {!soldOut && pct > 0 && (
          <Badge variant="discount" className="absolute top-2.5 right-2.5">
            −{pct}%
          </Badge>
        )}
      </div>

      <div className={CARD_BODY}>
        {product.categoryName && <span className="eyebrow truncate">{product.categoryName}</span>}
        <h3 className={CARD_TITLE}>{product.name}</h3>
        {hasVariants && <span className="type-caption text-ink-subtle">{product.variants.length} variantes</span>}
        <StockLabel quiet stock={product.totalStock} unit={hasVariants ? "unit" : variant.unit} />
      </div>

      <div className={CARD_FOOT}>
        <CardPrice
          price={variant.price}
          compareAt={variant.compareAtPrice}
          prefix={hasVariants ? "desde" : undefined}
          suffix={perUnitSuffix(variant.unit)}
        />
        {hasVariants ? (
          <Link href={href} prefetch={false} onClick={handleOpen} className={cardCtaClasses("soft")}>
            Elegir opciones
          </Link>
        ) : (
          <button
            type="button"
            onClick={handleAdd}
            aria-disabled={soldOut}
            className={cardCtaClasses(soldOut ? "disabled" : "solid", adding)}
          >
            {!soldOut && <Plus className="h-4 w-4" strokeWidth={2.4} aria-hidden />}
            {soldOut ? "Agotado" : "Añadir"}
          </button>
        )}
      </div>
    </article>
  );
}
