import { fromBaseAmount } from "@/lib/currency-math";
import type { CurrencyInfo } from "@/lib/format";
import type { PaymentStatus } from "@/modules/payments/lib/labels";
import { outstandingBase } from "@/modules/payments/lib/payment-status";
import type { OrderStatus } from "./labels";

export interface PaymentContactSubject {
  status: OrderStatus;
  paymentStatus: PaymentStatus;
  /** En base. */
  total: number;
  paidBase: number;
}

/** El cliente aún debe coordinar el pago: el pedido sigue vivo y queda saldo.
 *  Es el mismo criterio con el que el admin ve «Registrar cobro», así cliente
 *  y empleado ven el mismo "falta cobrar"; un entregado sin cobro registrado
 *  (contra entrega que el mensajero no anotó) también cuenta. `paid` y
 *  `refunded` no piden nada; cancelado tampoco (ni admite cobros). Un total 0
 *  (cupón del 100 %) queda `unpaid` para siempre y no debe pedir contacto. */
export function needsPaymentContact(order: PaymentContactSubject): boolean {
  if (order.status === "cancelled") return false;
  if (order.paymentStatus !== "unpaid" && order.paymentStatus !== "partial") return false;
  return outstandingBase(order.paidBase, order.total) > 0;
}

/** Saldo pendiente en la moneda de pago, con la tasa que el pedido fijó al
 *  crearse: coincide con `totalInPaymentCurrency` si no hay cobros y con el
 *  «Pendiente» que ve el admin si los hay. */
export function outstandingInPaymentCurrency(order: {
  total: number;
  paidBase: number;
  paymentExchangeRate: number;
  paymentCurrency: Pick<CurrencyInfo, "decimalPlaces">;
}): number {
  return fromBaseAmount(
    outstandingBase(order.paidBase, order.total),
    order.paymentExchangeRate,
    order.paymentCurrency.decimalPlaces
  );
}

export interface PaymentContactMessageInput {
  storeName: string;
  orderNo: string;
  customerName: string;
  /** Ya formateado con `fmt`, p. ej. "1 250 CUP". */
  amountLabel: string;
  paymentMethodName: string;
  partial: boolean;
}

/** Texto prellenado del chat. Solo datos que el propio cliente ya conoce y
 *  que no identifican a terceros: sin teléfono, dirección, correo ni notas. */
export function buildPaymentContactMessage(input: PaymentContactMessageInput): string {
  return [
    `Hola, soy ${input.customerName}. Escribo por mi pedido ${input.orderNo} en ${input.storeName}.`,
    `${input.partial ? "Saldo pendiente" : "Total a pagar"}: ${input.amountLabel} (${input.paymentMethodName}).`,
    "Quiero coordinar el pago.",
  ].join("\n");
}
