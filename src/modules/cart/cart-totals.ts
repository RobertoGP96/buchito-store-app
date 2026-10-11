import { fromBaseAmount, roundToCurrency } from "@/lib/currency-math";

/** Todo en moneda BASE salvo `totalInPaymentCurrency`. Es la misma fórmula
 *  que usa `createOrder` en el servidor: el cliente solo la muestra. */
export interface CartTotalsInput {
  lines: { unitPrice: number; qty: number }[];
  baseDecimals: number;
  fulfillment: "delivery" | "pickup";
  shipping: {
    /** Tarifa de la zona elegida o la de la tienda por defecto. */
    fee: number;
    /** Umbral de envío gratis (de la zona o de la tienda); null = nunca. */
    freeThreshold: number | null;
  };
  coupon?: { kind: "percent" | "fixed"; value: number; minSubtotal: number | null } | null;
  payment?: {
    surchargePercent: number | null;
    /** Base por 1 unidad de la moneda de pago. */
    exchangeRate: number;
    decimals: number;
  } | null;
}

export interface CartTotals {
  subtotal: number;
  shippingFee: number;
  discount: number;
  paymentSurcharge: number;
  total: number;
  totalInPaymentCurrency: number | null;
  freeShippingRemaining: number | null;
}

export function computeCartTotals(input: CartTotalsInput): CartTotals {
  const round = (n: number) => roundToCurrency(n, input.baseDecimals);

  const subtotal = round(input.lines.reduce((sum, l) => sum + l.unitPrice * l.qty, 0));

  let discount = 0;
  if (input.coupon && (input.coupon.minSubtotal == null || subtotal >= input.coupon.minSubtotal)) {
    discount =
      input.coupon.kind === "percent"
        ? round((subtotal * input.coupon.value) / 100)
        : round(Math.min(input.coupon.value, subtotal));
  }

  const afterDiscount = subtotal - discount;
  const freeThreshold = input.shipping.freeThreshold;
  const qualifiesFree = freeThreshold != null && afterDiscount >= freeThreshold;
  const shippingFee =
    input.fulfillment === "pickup" || subtotal === 0 || qualifiesFree ? 0 : round(input.shipping.fee);

  const paymentSurcharge =
    input.payment?.surchargePercent != null && input.payment.surchargePercent > 0
      ? round(((afterDiscount + shippingFee) * input.payment.surchargePercent) / 100)
      : 0;

  const total = round(afterDiscount + shippingFee + paymentSurcharge);

  const totalInPaymentCurrency = input.payment
    ? fromBaseAmount(total, input.payment.exchangeRate, input.payment.decimals)
    : null;

  const freeShippingRemaining =
    input.fulfillment === "delivery" && freeThreshold != null && !qualifiesFree
      ? round(freeThreshold - afterDiscount)
      : null;

  return { subtotal, shippingFee, discount, paymentSurcharge, total, totalInPaymentCurrency, freeShippingRemaining };
}
