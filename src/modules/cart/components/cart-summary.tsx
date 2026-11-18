"use client";

import { Money } from "@/components/money";
import { ProductImage } from "@/components/product-image";
import type { CurrencyInfo } from "@/lib/format";
import { fmtQty } from "@/modules/products/lib/units";
import type { CartTotals } from "../cart-totals";
import type { CartCombo, CartLine } from "../store";

interface CartSummaryProps {
  totals: CartTotals;
  /** Moneda del método de pago elegido; pinta el total convertido. */
  paymentCurrency?: CurrencyInfo | null;
  /** Lo que se está comprando, sobre los importes (`CartSummaryItems`). */
  items?: React.ReactNode;
  children?: React.ReactNode;
}

function Row({ label, value, muted }: { label: string; value: React.ReactNode; muted?: boolean }) {
  return (
    <div className="type-body flex items-center justify-between gap-4">
      <dt className={muted ? "text-ink-subtle" : "text-ink-muted"}>{label}</dt>
      <dd className={muted ? "font-medium text-ink-subtle" : "font-medium text-ink"}>{value}</dd>
    </div>
  );
}

function SummaryItem({ imageUrl, name, detail, total }: { imageUrl: string | null; name: string; detail: string; total: number }) {
  return (
    <li className="flex items-center gap-3">
      <span className="relative h-11 w-11 flex-none overflow-hidden rounded-chip bg-cream">
        <span className="absolute inset-0 flex items-center justify-center">
          <ProductImage src={imageUrl} alt="" sizes="44px" />
        </span>
      </span>
      <span className="min-w-0 flex-1">
        <span className="type-meta block truncate font-medium text-ink">{name}</span>
        <span className="tabular type-caption block truncate text-ink-subtle">{detail}</span>
      </span>
      <Money value={total} className="type-meta font-semibold text-ink" />
    </li>
  );
}

/** Líneas del pedido en miniatura para el resumen del checkout: quien confirma
 *  ve qué está comprando sin volver al carrito. */
export function CartSummaryItems({ lines, combos }: { lines: CartLine[]; combos: CartCombo[] }) {
  return (
    <ul className="flex max-h-[232px] flex-col gap-3 overflow-y-auto pr-1">
      {combos.map((combo) => (
        <SummaryItem
          key={`c-${combo.comboId}`}
          imageUrl={combo.imageUrl}
          name={combo.name}
          detail={`Combo · ${combo.qty} ×`}
          total={combo.unitPrice * combo.qty}
        />
      ))}
      {lines.map((line) => (
        <SummaryItem
          key={line.variantId}
          imageUrl={line.imageUrl}
          name={line.name}
          detail={`${line.variantName ? `${line.variantName} · ` : ""}${fmtQty(line.qty, line.unit)}`}
          total={line.unitPrice * line.qty}
        />
      ))}
    </ul>
  );
}

export function CartSummary({ totals, paymentCurrency, items, children }: CartSummaryProps) {
  return (
    // Fijo en desktop: el total y el botón siguen a la vista mientras se
    // recorre un carrito o un formulario largo.
    <div className="rounded-card bg-canvas p-5 shadow-card md:sticky md:top-24">
      <h2 className="font-display type-subheading text-espresso-900">Resumen</h2>
      {items && <div className="mt-4 border-b border-line pb-4">{items}</div>}
      <dl className="mt-4 flex flex-col gap-2.5">
        <Row label="Subtotal" value={<Money value={totals.subtotal} />} />
        {totals.discount > 0 && <Row label="Descuento" value={<>−<Money value={totals.discount} /></>} />}
        <Row
          label="Envío"
          value={totals.shippingFee === 0 ? <span className="text-ok">Gratis</span> : <Money value={totals.shippingFee} />}
        />
        {totals.paymentSurcharge > 0 && (
          <Row label="Recargo del método de pago" value={<Money value={totals.paymentSurcharge} />} />
        )}
      </dl>
      {totals.freeShippingRemaining != null && totals.freeShippingRemaining > 0 && (
        <p className="type-meta mt-3 rounded-field bg-crema-100 px-3 py-2 text-espresso-900">
          Te faltan <Money value={totals.freeShippingRemaining} className="font-semibold" /> para envío gratis.
        </p>
      )}
      <div className="mt-4 flex items-end justify-between gap-4 border-t border-line pt-4">
        <span className="type-body font-semibold text-ink">Total</span>
        <div className="text-right">
          <p className="num-display text-[24px] text-espresso-900">
            <Money value={totals.total} />
          </p>
          {paymentCurrency && totals.totalInPaymentCurrency != null && (
            <p className="type-meta mt-1.5 text-ink-muted">
              A pagar: <Money value={totals.totalInPaymentCurrency} currency={paymentCurrency} className="font-semibold text-ink" />
            </p>
          )}
        </div>
      </div>
      {children && <div className="mt-5">{children}</div>}
    </div>
  );
}
