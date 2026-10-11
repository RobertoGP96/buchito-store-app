"use client";

import Link from "next/link";
import { ShoppingBag, Trash2 } from "lucide-react";
import { ButtonLink } from "@/components/button-link";
import { EmptyState } from "@/components/empty-state";
import { Money } from "@/components/money";
import { ProductImage } from "@/components/product-image";
import { QtyStepper } from "@/components/qty-stepper";
import { useCurrency } from "@/modules/currency/store/currency-provider";
import { computeCartTotals } from "../cart-totals";
import { useCart } from "../store";
import { CartSummary } from "./cart-summary";

interface CartViewProps {
  defaultShippingFee: number;
  freeShippingThreshold: number | null;
}

export function CartView({ defaultShippingFee, freeShippingThreshold }: CartViewProps) {
  const { state, setQty, removeLine } = useCart();
  const { base } = useCurrency();

  if (!state.hydrated) return null;

  if (state.lines.length === 0) {
    return (
      <EmptyState
        icon={ShoppingBag}
        title="Tu bolsa está vacía"
        description="Añade productos desde el catálogo para verlos aquí."
        ctaLabel="Ir al catálogo"
        ctaHref="/catalogo"
      />
    );
  }

  // Sin zona elegida todavía: el envío es el de la tienda por defecto. El
  // checkout lo ajusta por zona.
  const totals = computeCartTotals({
    lines: state.lines,
    baseDecimals: base.decimalPlaces,
    fulfillment: "delivery",
    shipping: { fee: defaultShippingFee, freeThreshold: freeShippingThreshold },
  });

  return (
    <div className="grid gap-6 md:grid-cols-[minmax(0,1fr)_340px] md:items-start">
      <ul className="flex flex-col gap-3">
        {state.lines.map((line) => (
          <li key={line.variantId} className="flex gap-4 rounded-card bg-canvas p-3.5 shadow-card sm:p-4">
            <Link
              href={`/producto/${encodeURIComponent(line.slug)}`}
              className="relative h-[84px] w-[84px] flex-none overflow-hidden rounded-field bg-cream"
            >
              <span className="absolute inset-0 flex items-center justify-center">
                <ProductImage src={line.imageUrl} alt="" sizes="84px" />
              </span>
            </Link>
            <div className="flex min-w-0 flex-1 flex-col">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <Link href={`/producto/${encodeURIComponent(line.slug)}`} className="line-clamp-2 text-[14px] font-semibold text-ink hover:text-navy-700">
                    {line.name}
                  </Link>
                  {line.variantName && <p className="mt-0.5 text-[12.5px] text-slate-400">{line.variantName}</p>}
                </div>
                <button
                  type="button"
                  onClick={() => removeLine(line.variantId)}
                  aria-label={`Quitar ${line.name}`}
                  className="-mt-1 -mr-1 flex h-8 w-8 flex-none items-center justify-center rounded-full text-slate-400 transition-colors duration-150 hover:bg-danger-soft hover:text-danger"
                >
                  <Trash2 className="h-4 w-4" strokeWidth={1.9} />
                </button>
              </div>
              <div className="mt-auto flex items-end justify-between gap-3 pt-3">
                <QtyStepper
                  qty={line.qty}
                  onInc={() => setQty(line.variantId, line.qty + 1)}
                  onDec={() => setQty(line.variantId, line.qty - 1)}
                  max={line.stock}
                />
                <div className="text-right">
                  <p className="text-[14.5px] font-bold text-navy-900">
                    <Money value={line.unitPrice * line.qty} />
                  </p>
                  {line.qty > 1 && (
                    <p className="text-[11.5px] text-slate-400">
                      <Money value={line.unitPrice} /> c/u
                    </p>
                  )}
                </div>
              </div>
            </div>
          </li>
        ))}
      </ul>

      <CartSummary totals={totals}>
        <ButtonLink href="/checkout" variant="solid" size="lg" className="w-full">
          Finalizar compra
        </ButtonLink>
        <ButtonLink href="/catalogo" variant="ghost" size="sm" className="mt-3 w-full">
          Seguir comprando
        </ButtonLink>
      </CartSummary>
    </div>
  );
}
