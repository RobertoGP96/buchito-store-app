"use client";

import Link from "next/link";
import { useState } from "react";
import { Button, toast } from "@heroui/react";
import { ChevronLeft, ShoppingCart } from "lucide-react";
import { Badge } from "@/components/badge";
import { Money } from "@/components/money";
import { ProductImage } from "@/components/product-image";
import { QtyStepper } from "@/components/qty-stepper";
import { StockLabel } from "@/components/stock-label";
import { fmtDate } from "@/lib/format";
import { useCart } from "@/modules/cart/store";
import type { CatalogCombo } from "../queries/combo-catalog-queries";
import { cartComboFor } from "./combo-card";

export function ComboDetail({ combo }: { combo: CatalogCombo }) {
  const { addCombo } = useCart();
  const [qty, setQty] = useState(1);
  const soldOut = combo.available <= 0;
  const savings = combo.regularPrice - combo.price;

  const handleAdd = () => {
    if (soldOut) {
      toast.warning("Este combo está agotado");
      return;
    }
    addCombo(cartComboFor(combo), qty);
    toast.success(`${combo.name} añadido a la bolsa`);
    setQty(1);
  };

  return (
    <div className="mx-auto w-full max-w-[1120px] px-5 pt-6 pb-12 md:px-6 md:pt-8">
      <Link
        href="/combos"
        className="nav-label -ml-1 inline-flex items-center gap-0.5 text-slate-500 transition-colors duration-150 hover:text-navy-700"
      >
        <ChevronLeft className="h-4 w-4" strokeWidth={2} />
        Combos
      </Link>

      <div className="mt-5 grid gap-8 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] md:gap-12">
        <div className="relative aspect-square w-full overflow-hidden rounded-card bg-cream shadow-card">
          <span className="absolute inset-0 flex items-center justify-center">
            <ProductImage src={combo.imageUrl} alt={combo.name} sizes="(max-width: 768px) 100vw, 560px" priority />
          </span>
          <Badge variant="featured" className="absolute top-3 left-3">
            Combo
          </Badge>
          {!soldOut && combo.savingsPct > 0 && (
            <Badge variant="discount" className="absolute top-3 right-3">
              −{combo.savingsPct}%
            </Badge>
          )}
        </div>

        <div className="flex flex-col">
          <p className="eyebrow">
            {combo.items.length} {combo.items.length === 1 ? "producto" : "productos"} en un solo paquete
          </p>
          <h1 className="font-display mt-2 text-[26px] leading-[1.1] text-navy-900 md:text-[32px]">{combo.name}</h1>

          <div className="mt-4 flex flex-wrap items-baseline gap-x-3 gap-y-1">
            <p className="font-display text-[26px] leading-none text-navy-900">
              <Money value={combo.price} />
            </p>
            {combo.regularPrice > combo.price && (
              <p className="text-[14px] font-medium text-slate-400 line-through">
                <Money value={combo.regularPrice} />
              </p>
            )}
          </div>
          {savings > 0 && (
            <p className="mt-2 text-[13px] font-medium text-ok">
              Ahorras <Money value={savings} /> frente a comprar los productos por separado.
            </p>
          )}
          <div className="mt-2">
            <StockLabel stock={combo.available} />
          </div>

          <div className="mt-6">
            <p className="eyebrow mb-2.5">Qué incluye</p>
            <ul className="divide-y divide-line-soft rounded-card bg-canvas shadow-card">
              {combo.items.map((item) => (
                <li key={item.variantId} className="flex items-center gap-3 px-4 py-3">
                  <span className="relative h-12 w-12 flex-none overflow-hidden rounded-field bg-cream">
                    <span className="absolute inset-0 flex items-center justify-center">
                      <ProductImage src={item.imageUrl} alt="" sizes="48px" />
                    </span>
                  </span>
                  <div className="min-w-0 flex-1">
                    <Link
                      href={`/producto/${encodeURIComponent(item.productSlug)}`}
                      className="line-clamp-1 text-[14px] font-semibold text-ink hover:text-navy-700"
                    >
                      {item.productName}
                    </Link>
                    <p className="text-[12.5px] text-slate-400">
                      {item.variantName ? `${item.variantName} · ` : ""}
                      <Money value={item.unitPrice} /> c/u
                    </p>
                  </div>
                  <span className="tabular flex-none rounded-full bg-tint px-2.5 py-1 text-[12.5px] font-semibold text-navy-700">
                    × {item.qty}
                  </span>
                </li>
              ))}
            </ul>
          </div>

          <div className="mt-6 flex flex-wrap items-center gap-3">
            <QtyStepper
              qty={qty}
              onInc={() => setQty((q) => Math.min(q + 1, Math.max(1, combo.available)))}
              onDec={() => setQty((q) => Math.max(1, q - 1))}
              max={combo.available}
              size="lg"
            />
            <Button variant="primary" size="lg" className="rounded-full" isDisabled={soldOut} onPress={handleAdd}>
              <ShoppingCart className="h-4 w-4" strokeWidth={2} />
              {soldOut ? "Agotado" : "Añadir a la bolsa"}
            </Button>
          </div>

          {combo.description && (
            <div className="mt-8 border-t border-line pt-6">
              <p className="eyebrow">Descripción</p>
              <p className="mt-2.5 text-[14px] leading-[1.7] text-pretty text-slate-500">{combo.description}</p>
            </div>
          )}
          {combo.endsAt && (
            <p className="mt-6 text-[12.5px] text-slate-400">Oferta válida hasta el {fmtDate(combo.endsAt)}.</p>
          )}
        </div>
      </div>
    </div>
  );
}
