import type { StatusMeta } from "@/components/status-chip";

// Uniones espejo de los enums de Prisma: los componentes cliente no pueden
// importar @/generated/prisma.
export type PaymentKind = "cash_on_delivery" | "transfer" | "card" | "mobile_wallet" | "other";
export type PaymentStatus = "unpaid" | "partial" | "paid" | "refunded";

export const PAYMENT_KINDS: readonly PaymentKind[] = [
  "cash_on_delivery",
  "transfer",
  "card",
  "mobile_wallet",
  "other",
];

export const PAYMENT_KIND_LABELS: Record<PaymentKind, string> = {
  cash_on_delivery: "Efectivo contra entrega",
  transfer: "Transferencia",
  card: "Tarjeta",
  mobile_wallet: "Billetera móvil",
  other: "Otro",
};

export const PAYMENT_STATUS_META: Record<PaymentStatus, StatusMeta> = {
  unpaid: { label: "Sin pagar", tone: "warning" },
  partial: { label: "Pago parcial", tone: "info" },
  paid: { label: "Pagado", tone: "success" },
  refunded: { label: "Reembolsado", tone: "neutral" },
};
