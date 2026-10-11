"use client";

import { Check } from "lucide-react";
import { PAYMENT_KIND_LABELS } from "../lib/labels";
import type { PaymentMethodRow } from "../queries/payment-queries";
import { cn } from "@/lib/utils";

interface PaymentMethodPickerProps {
  methods: PaymentMethodRow[];
  value: number | null;
  onChange: (paymentMethodId: number) => void;
  labelledBy: string;
}

/** Cards radio: nombre, tipo, moneda e instrucciones del método elegido. */
export function PaymentMethodPicker({ methods, value, onChange, labelledBy }: PaymentMethodPickerProps) {
  return (
    <div role="radiogroup" aria-labelledby={labelledBy} className="grid gap-2.5 sm:grid-cols-2">
      {methods.map((method) => {
        const checked = method.paymentMethodId === value;
        return (
          <button
            key={method.paymentMethodId}
            type="button"
            role="radio"
            aria-checked={checked}
            onClick={() => onChange(method.paymentMethodId)}
            className={cn(
              "flex items-start gap-3 rounded-field border-[1.5px] p-3.5 text-left transition-colors duration-150",
              checked ? "border-navy-700 bg-tint" : "border-line bg-canvas hover:border-navy-700"
            )}
          >
            <span
              className={cn(
                "mt-0.5 flex h-5 w-5 flex-none items-center justify-center rounded-full border-[1.5px]",
                checked ? "border-navy-700 bg-navy-700 text-on-brand" : "border-line"
              )}
            >
              {checked && <Check className="h-3 w-3" strokeWidth={3} />}
            </span>
            <span className="min-w-0">
              <span className="block text-[14px] font-semibold text-ink">{method.name}</span>
              <span className="mt-0.5 block text-[12.5px] text-slate-500">
                {PAYMENT_KIND_LABELS[method.kind]} · pagas en{" "}
                <span className="tabular font-semibold">{method.currency.code}</span>
                {method.surchargePercent != null && method.surchargePercent > 0 && (
                  <> · recargo {method.surchargePercent} %</>
                )}
              </span>
              {checked && method.instructions && (
                <span className="mt-2 block rounded-chip bg-canvas px-3 py-2 text-[12.5px] leading-[1.6] text-slate-500">
                  {method.instructions}
                </span>
              )}
            </span>
          </button>
        );
      })}
    </div>
  );
}
