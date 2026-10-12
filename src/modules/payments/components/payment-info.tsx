"use client";

import { Banknote, Coins, CreditCard, Smartphone, Wallet, type LucideIcon } from "lucide-react";
import { Money } from "@/components/money";
import type { CurrencyInfo } from "@/lib/format";
import { useCurrency } from "@/modules/currency/store/currency-provider";
import { PAYMENT_KIND_LABELS, type PaymentKind } from "../lib/labels";
import type { PaymentMethodRow } from "../queries/payment-queries";

const KIND_ICONS: Record<PaymentKind, LucideIcon> = {
  cash_on_delivery: Banknote,
  transfer: Wallet,
  card: CreditCard,
  mobile_wallet: Smartphone,
  other: Coins,
};

interface PaymentInfoProps {
  methods: PaymentMethodRow[];
}

/** Vista pública de las formas de pago: cada método activo con su moneda,
 *  recargo e instrucciones, y las monedas aceptadas con su tasa a la base. */
export function PaymentInfo({ methods }: PaymentInfoProps) {
  const { base, currencies, rates } = useCurrency();
  const others = currencies.filter((c) => c.currencyId !== base.currencyId);

  return (
    <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_360px] lg:items-start">
      <section>
        <p className="eyebrow">Métodos de pago</p>
        <h2 className="font-display mt-2 text-[20px] leading-tight text-navy-900 md:text-[24px]">Cómo puedes pagar</h2>
        {methods.length === 0 ? (
          <p className="mt-4 text-[13.5px] text-slate-500">La tienda todavía no ha publicado sus formas de pago.</p>
        ) : (
          <ul className="mt-5 grid gap-3 sm:grid-cols-2">
            {methods.map((method) => {
              const Icon = KIND_ICONS[method.kind];
              return (
                <li key={method.paymentMethodId} className="flex gap-3.5 rounded-card bg-canvas p-4 shadow-card">
                  <span className="flex h-10 w-10 flex-none items-center justify-center rounded-chip bg-tint text-navy-700">
                    <Icon className="h-[18px] w-[18px]" strokeWidth={1.9} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-[14.5px] font-semibold text-ink">{method.name}</p>
                    <p className="mt-0.5 text-[12.5px] text-slate-500">
                      {PAYMENT_KIND_LABELS[method.kind]} · pagas en{" "}
                      <span className="tabular font-semibold text-ink">{method.currency.code}</span>
                      {method.surchargePercent != null && method.surchargePercent > 0 && (
                        <> · recargo <span className="tabular">{method.surchargePercent} %</span></>
                      )}
                    </p>
                    {method.instructions && (
                      <p className="mt-2 rounded-chip bg-page px-3 py-2 text-[12.5px] leading-[1.6] text-slate-500">
                        {method.instructions}
                      </p>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <section className="rounded-card bg-canvas p-5 shadow-card">
        <p className="eyebrow">Monedas</p>
        <h2 className="font-display mt-2 text-[18px] leading-tight text-navy-900">Precios y tasa del día</h2>
        <p className="mt-2.5 text-[13px] leading-[1.6] text-slate-500">
          Los precios de la tienda están en <span className="tabular font-semibold text-ink">{base.code}</span>
          {base.name ? ` (${base.name})` : ""}. Si pagas en otra moneda se convierte con la tasa vigente al hacer el
          pedido, y esa tasa queda fijada en tu pedido.
        </p>
        <dl className="mt-4 divide-y divide-line-soft border-t border-line">
          <CurrencyRow currency={base} label="Moneda base" />
          {others.map((c) => (
            <CurrencyRow key={c.currencyId} currency={c} label={c.name ?? c.code} rate={rates[c.currencyId]} base={base} />
          ))}
        </dl>
        {others.length === 0 && (
          <p className="mt-3 text-[12.5px] text-slate-400">Por ahora la tienda solo acepta su moneda base.</p>
        )}
      </section>
    </div>
  );
}

function CurrencyRow({
  currency,
  label,
  rate,
  base,
}: {
  currency: CurrencyInfo;
  label: string;
  /** Base por 1 unidad de `currency`; sin tasa no se muestra conversión. */
  rate?: number;
  base?: CurrencyInfo;
}) {
  return (
    <div className="flex items-center justify-between gap-4 py-2.5 text-[13.5px]">
      <dt className="min-w-0">
        <span className="tabular font-semibold text-ink">{currency.code}</span>
        <span className="ml-2 truncate text-slate-400">{label}</span>
      </dt>
      <dd className="tabular text-right font-medium text-ink">
        {rate != null && base ? (
          <>
            1 {currency.code} = <Money value={rate} currency={base} />
          </>
        ) : (
          <span className="text-slate-400">—</span>
        )}
      </dd>
    </div>
  );
}
