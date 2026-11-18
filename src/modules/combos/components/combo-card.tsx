"use client";

import Link from "next/link";
import { useState, type MouseEvent } from "react";
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
import { useCartActions, type CartCombo } from "@/modules/cart/store";
import { comboItemsSummary as summarize } from "../lib/labels";
import type { CatalogCombo } from "../queries/combo-catalog-queries";

export function cartComboFor(combo: CatalogCombo): Omit<CartCombo, "qty"> {
  return {
    comboId: combo.comboId,
    slug: combo.slug,
    name: combo.name,
    imageUrl: combo.imageUrl,
    unitPrice: combo.price,
    regularPrice: combo.regularPrice,
    available: combo.available,
    items: combo.items.map((i) => ({
      variantId: i.variantId,
      productName: i.productName,
      variantName: i.variantName,
      qty: i.qty,
      unit: i.unit,
    })),
  };
}

export function comboItemsSummary(combo: Pick<CatalogCombo, "items">): string {
  return summarize(combo.items);
}

interface ComboCardProps {
  combo: CatalogCombo;
  priority?: boolean;
}

/** Card de combo en la retícula: misma silueta que la de producto, con la
 *  etiqueta "Combo", lo que incluye y el ahorro frente a comprar por separado. */
export function ComboCard({ combo, priority = false }: ComboCardProps) {
  const { addCombo } = useCartActions();
  const soldOut = combo.available <= 0;
  const [adding, setAdding] = useState(false);
  const href = `/combos/${encodeURIComponent(combo.slug)}`;

  const handleAdd = (e: MouseEvent) => {
    e.preventDefault();
    if (soldOut) {
      toast.warning("Combo agotado");
      return;
    }
    setAdding(true);
    addCombo(cartComboFor(combo), 1);
    toast.success(`${combo.name} añadido al carrito`);
    window.setTimeout(() => setAdding(false), 300);
  };

  return (
    <article className={CARD_SHELL}>
      <Link href={href} className="absolute inset-0 z-[1] rounded-card" aria-label={combo.name} />

      <div className={CARD_MEDIA}>
        <span className={CARD_MEDIA_ZOOM}>
          <ProductImage src={combo.imageUrl} alt="" sizes={PRODUCT_GRID_IMAGE_SIZES} priority={priority} />
        </span>
        {soldOut ? (
          <Badge variant="soldout" className="absolute top-2.5 left-2.5">
            Agotado
          </Badge>
        ) : (
          <Badge variant="combo" className="absolute top-2.5 left-2.5">
            Combo
          </Badge>
        )}
        {!soldOut && combo.savingsPct > 0 && (
          <Badge variant="discount" className="absolute top-2.5 right-2.5">
            −{combo.savingsPct}%
          </Badge>
        )}
      </div>

      <div className={CARD_BODY}>
        <span className="eyebrow truncate">
          {combo.items.length} {combo.items.length === 1 ? "producto" : "productos"}
        </span>
        <h3 className={CARD_TITLE}>{combo.name}</h3>
        <p className="type-caption line-clamp-2 text-ink-subtle">{comboItemsSummary(combo)}</p>
        <StockLabel quiet stock={combo.available} />
      </div>

      <div className={CARD_FOOT}>
        <CardPrice price={combo.price} compareAt={combo.regularPrice} />
        <button
          type="button"
          onClick={handleAdd}
          aria-disabled={soldOut}
          className={cardCtaClasses(soldOut ? "disabled" : "solid", adding)}
        >
          {!soldOut && <Plus className="h-4 w-4" strokeWidth={2.4} aria-hidden />}
          {soldOut ? "Agotado" : "Añadir"}
        </button>
      </div>
    </article>
  );
}
