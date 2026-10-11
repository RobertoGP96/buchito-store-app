// Fuera del componente "use client": la página de servidor también lo lee y
// un export de un archivo cliente le llega como referencia, no como valor.
export type PaymentRange = "today" | "7d" | "30d" | "all";

export const PAYMENT_RANGES: readonly PaymentRange[] = ["today", "7d", "30d", "all"];

export const PAYMENT_RANGE_LABELS: Record<PaymentRange, string> = {
  today: "Hoy",
  "7d": "7 días",
  "30d": "30 días",
  all: "Todo",
};
