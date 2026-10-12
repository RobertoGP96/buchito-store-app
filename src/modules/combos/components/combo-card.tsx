"use client";

import Link from "next/link";
import { useState, type MouseEvent } from "react";
import { toast } from "@heroui/react";
import { Plus } from "lucide-react";
import { Badge } from "@/components/badge";
import { Money } from "@/components/money";
import { ProductImage } from "@/components/product-image";
import { StockLabel } from "@/components/stock-label";
import { cn } from "@/lib/utils";
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
    <article className="group relative flex h-full flex-col gap-3.5 rounded-card bg-canvas p-3 pb-4 shadow-card transition-[box-shadow,transform] duration-200 hover:shadow-float motion-safe:hover:-translate-y-0.5 sm:p-4 sm:pb-5">
      <Link href={href} className="absolute inset-0 z-[1] rounded-card" aria-label={combo.name} />

      <div className="relative aspect-square w-full overflow-hidden rounded-field bg-cream">
        <span className="absolute inset-0 flex items-center justify-center">
          <ProductImage src={combo.imageUrl} alt="" sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 280px" priority={priority} />
        </span>
        {soldOut ? (
          <Badge variant="soldout" className="absolute top-2 left-2">
            Agotado
          </Badge>
        ) : (
          <Badge variant="featured" className="absolute top-2 left-2">
            Combo
          </Badge>
        )}
        {!soldOut && combo.savingsPct > 0 && (
          <Badge variant="discount" className="absolute top-2 right-2">
            −{combo.savingsPct}%
          </Badge>
        )}
      </div>

      <div className="flex min-w-0 flex-col gap-1.5">
        <span className="eyebrow truncate">
          {combo.items.length} {combo.items.length === 1 ? "producto" : "productos"}
        </span>
        <h3 className="line-clamp-2 text-[14.5px] leading-[1.35] font-semibold text-ink sm:text-[15px]">{combo.name}</h3>
        <p className="line-clamp-2 text-[12px] leading-[1.45] text-slate-400">{comboItemsSummary(combo)}</p>
        <StockLabel stock={combo.available} />
      </div>

      <div className="mt-auto flex items-end justify-between gap-2.5 border-t border-line pt-3">
        <div className="min-w-0">
          <div className="text-[15px] leading-tight font-bold text-navy-900 sm:text-[16px]">
            <Money value={combo.price} />
          </div>
          {combo.regularPrice > combo.price && (
            <div className="mt-0.5 text-[11px] font-medium text-slate-400 line-through">
              <Money value={combo.regularPrice} />
            </div>
          )}
        </div>
        <button
          type="button"
          onClick={handleAdd}
          aria-disabled={soldOut}
          className={cn(
            "relative z-10 flex h-9 w-9 flex-none items-center justify-center rounded-full font-semibold transition-[background-color,transform] duration-150 motion-safe:active:scale-95 sm:h-auto sm:w-auto sm:px-4 sm:py-[9px] sm:text-[12.5px]",
            soldOut ? "cursor-not-allowed bg-cream text-disabled" : "bg-navy-700 text-on-brand hover:bg-navy-600",
            adding && "scale-95"
          )}
        >
          <Plus className="h-4 w-4 sm:hidden" strokeWidth={2.4} aria-hidden />
          <span className="hidden sm:inline">{soldOut ? "Agotado" : "Añadir"}</span>
          <span className="sr-only sm:hidden">{soldOut ? "Agotado" : "Añadir al carrito"}</span>
        </button>
      </div>
    </article>
  );
}
