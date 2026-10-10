import type { PaymentStatus } from "./labels";

/** Estado de pago derivado de lo cobrado (en base) frente al total. Un
 *  pedido reembolsado se marca a mano: aquí nunca se devuelve `refunded`. */
export function derivePaymentStatus(
  paidBase: number,
  total: number,
  current: PaymentStatus = "unpaid"
): PaymentStatus {
  if (current === "refunded") return "refunded";
  if (paidBase <= 0) return "unpaid";
  // Medio céntimo de tolerancia: redondeos de conversión no deben dejar un
  // pedido "parcial" por 0.004.
  if (paidBase + 0.005 >= total) return "paid";
  return "partial";
}

export function outstandingBase(paidBase: number, total: number): number {
  return Math.max(0, total - paidBase);
}
