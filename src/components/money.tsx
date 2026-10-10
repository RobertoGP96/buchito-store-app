"use client";

import { useCurrency } from "@/modules/currency/store/currency-provider";
import type { CurrencyInfo } from "@/lib/format";
import { cn } from "@/lib/utils";

interface MoneyProps {
  /** Monto en moneda BASE. Se muestra en la moneda de display del usuario. */
  value: number;
  /** Si se indica, `value` ya está en esta moneda y no se convierte. */
  currency?: CurrencyInfo;
  className?: string;
}

/** Montos monetarios siempre en `tabular-nums`; negativos con "−" tipográfico. */
export function Money({ value, currency, className }: MoneyProps) {
  const { formatBase, formatIn } = useCurrency();
  return (
    <span className={cn("tabular whitespace-nowrap", className)}>
      {currency ? formatIn(value, currency) : formatBase(value)}
    </span>
  );
}
