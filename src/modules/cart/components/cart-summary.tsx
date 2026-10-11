"use client";

import { Money } from "@/components/money";
import type { CurrencyInfo } from "@/lib/format";
import type { CartTotals } from "../cart-totals";

interface CartSummaryProps {
  totals: CartTotals;
  /** Moneda del método de pago elegido; pinta el total convertido. */
  paymentCurrency?: CurrencyInfo | null;
  children?: React.ReactNode;
}

function Row({ label, value, muted }: { label: string; value: React.ReactNode; muted?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-4 text-[13.5px]">
      <dt className={muted ? "text-slate-400" : "text-slate-500"}>{label}</dt>
      <dd className={muted ? "font-medium text-slate-400" : "font-medium text-ink"}>{value}</dd>
    </div>
  );
}

export function CartSummary({ totals, paymentCurrency, children }: CartSummaryProps) {
  return (
    <div className="rounded-card bg-canvas p-5 shadow-card">
      <p className="eyebrow">Resumen</p>
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
        <p className="mt-3 rounded-field bg-tint px-3 py-2 text-[12.5px] text-navy-900">
          Te faltan <Money value={totals.freeShippingRemaining} className="font-semibold" /> para envío gratis.
        </p>
      )}
      <div className="mt-4 flex items-end justify-between gap-4 border-t border-line pt-4">
        <span className="text-[14px] font-semibold text-ink">Total</span>
        <div className="text-right">
          <p className="font-display text-[22px] leading-none text-navy-900">
            <Money value={totals.total} />
          </p>
          {paymentCurrency && totals.totalInPaymentCurrency != null && (
            <p className="mt-1 text-[12.5px] text-slate-500">
              A pagar: <Money value={totals.totalInPaymentCurrency} currency={paymentCurrency} className="font-semibold text-ink" />
            </p>
          )}
        </div>
      </div>
      {children && <div className="mt-5">{children}</div>}
    </div>
  );
}
