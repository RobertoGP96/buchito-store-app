"use client";

import Link from "next/link";
import { ShoppingCart, Trash2 } from "lucide-react";
import { ButtonLink } from "@/components/button-link";
import { EmptyState } from "@/components/empty-state";
import { Money } from "@/components/money";
import { ProductImage } from "@/components/product-image";
import { QtyStepper } from "@/components/qty-stepper";
import { comboItemsSummary } from "@/modules/combos/lib/labels";
import { useCurrency } from "@/modules/currency/store/currency-provider";
import { maxSellable, perUnitSuffix, roundQty } from "@/modules/products/lib/units";
import { computeCartTotals } from "../cart-totals";
import { cartIsEmpty, cartPriceLines, useCart, type CartCombo, type CartLine } from "../store";
import { CartSummary } from "./cart-summary";

interface CartViewProps {
  defaultShippingFee: number;
  freeShippingThreshold: number | null;
}

const REMOVE_BUTTON =
  "-mt-1 -mr-1 flex h-8 w-8 flex-none items-center justify-center rounded-full text-slate-400 transition-colors duration-150 hover:bg-danger-soft hover:text-danger";

function LineItem({ line }: { line: CartLine }) {
  const { setQty, removeLine } = useCart();
  const href = `/producto/${encodeURIComponent(line.slug)}`;
  return (
    <li className="flex gap-4 rounded-card bg-canvas p-3.5 shadow-card sm:p-4">
      <Link href={href} className="relative h-[84px] w-[84px] flex-none overflow-hidden rounded-field bg-cream">
        <span className="absolute inset-0 flex items-center justify-center">
          <ProductImage src={line.imageUrl} alt="" sizes="84px" />
        </span>
      </Link>
      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <Link href={href} className="line-clamp-2 text-[14px] font-semibold text-ink hover:text-navy-700">
              {line.name}
            </Link>
            {line.variantName && <p className="mt-0.5 text-[12.5px] text-slate-400">{line.variantName}</p>}
          </div>
          <button type="button" onClick={() => removeLine(line.variantId)} aria-label={`Quitar ${line.name}`} className={REMOVE_BUTTON}>
            <Trash2 className="h-4 w-4" strokeWidth={1.9} />
          </button>
        </div>
        <div className="mt-auto flex items-end justify-between gap-3 pt-3">
          <QtyStepper
            qty={line.qty}
            onInc={() => setQty(line.variantId, roundQty(line.qty + line.qtyStep))}
            onDec={() => setQty(line.variantId, roundQty(line.qty - line.qtyStep))}
            max={maxSellable(line.stock, line.qtyStep)}
            step={line.qtyStep}
            unit={line.unit}
          />
          <div className="text-right">
            <p className="text-[14.5px] font-bold text-navy-900">
              <Money value={line.unitPrice * line.qty} />
            </p>
            {(line.qty !== 1 || line.unit !== "unit") && (
              <p className="text-[11.5px] text-slate-400">
                <Money value={line.unitPrice} /> {perUnitSuffix(line.unit) ?? "c/u"}
              </p>
            )}
          </div>
        </div>
      </div>
    </li>
  );
}

function ComboItem({ combo }: { combo: CartCombo }) {
  const { setComboQty, removeCombo } = useCart();
  const href = `/combos/${encodeURIComponent(combo.slug)}`;
  const savings = combo.regularPrice - combo.unitPrice;
  return (
    <li className="flex gap-4 rounded-card bg-canvas p-3.5 shadow-card sm:p-4">
      <Link href={href} className="relative h-[84px] w-[84px] flex-none overflow-hidden rounded-field bg-cream">
        <span className="absolute inset-0 flex items-center justify-center">
          <ProductImage src={combo.imageUrl} alt="" sizes="84px" />
        </span>
      </Link>
      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <Link href={href} className="line-clamp-2 text-[14px] font-semibold text-ink hover:text-navy-700">
              <span className="mr-1.5 rounded-full bg-tint px-2 py-0.5 text-[10.5px] font-semibold tracking-[.02em] text-navy-700 uppercase">
                Combo
              </span>
              {combo.name}
            </Link>
            <p className="mt-0.5 line-clamp-2 text-[12.5px] text-slate-400">
              {comboItemsSummary(combo.items)}
            </p>
          </div>
          <button type="button" onClick={() => removeCombo(combo.comboId)} aria-label={`Quitar ${combo.name}`} className={REMOVE_BUTTON}>
            <Trash2 className="h-4 w-4" strokeWidth={1.9} />
          </button>
        </div>
        <div className="mt-auto flex items-end justify-between gap-3 pt-3">
          <QtyStepper
            qty={combo.qty}
            onInc={() => setComboQty(combo.comboId, combo.qty + 1)}
            onDec={() => setComboQty(combo.comboId, combo.qty - 1)}
            max={combo.available}
          />
          <div className="text-right">
            <p className="text-[14.5px] font-bold text-navy-900">
              <Money value={combo.unitPrice * combo.qty} />
            </p>
            <p className="text-[11.5px] text-slate-400">
              {combo.qty > 1 && (
                <>
                  <Money value={combo.unitPrice} /> c/u
                </>
              )}
              {savings > 0 && (
                <span className="ml-1 font-medium text-ok">
                  ahorras <Money value={savings * combo.qty} />
                </span>
              )}
            </p>
          </div>
        </div>
      </div>
    </li>
  );
}

export function CartView({ defaultShippingFee, freeShippingThreshold }: CartViewProps) {
  const { state } = useCart();
  const { base } = useCurrency();

  if (!state.hydrated) return null;

  if (cartIsEmpty(state)) {
    return (
      <EmptyState
        icon={ShoppingCart}
        title="Tu carrito está vacío"
        description="Añade productos o combos desde el catálogo para verlos aquí."
        ctaLabel="Ir al catálogo"
        ctaHref="/catalogo"
      />
    );
  }

  // Sin zona elegida todavía: el envío es el de la tienda por defecto. El
  // checkout lo ajusta por zona.
  const totals = computeCartTotals({
    lines: cartPriceLines(state),
    baseDecimals: base.decimalPlaces,
    fulfillment: "delivery",
    shipping: { fee: defaultShippingFee, freeThreshold: freeShippingThreshold },
  });

  return (
    <div className="grid gap-6 md:grid-cols-[minmax(0,1fr)_340px] md:items-start">
      <ul className="flex flex-col gap-3">
        {state.combos.map((combo) => (
          <ComboItem key={`c-${combo.comboId}`} combo={combo} />
        ))}
        {state.lines.map((line) => (
          <LineItem key={line.variantId} line={line} />
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
