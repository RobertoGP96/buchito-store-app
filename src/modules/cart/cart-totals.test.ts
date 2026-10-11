import { describe, expect, it } from "vitest";
import { computeCartTotals } from "./cart-totals";

const base = {
  baseDecimals: 0,
  fulfillment: "delivery" as const,
  shipping: { fee: 500, freeThreshold: 20000 },
};

describe("computeCartTotals", () => {
  it("suma líneas y cobra envío por debajo del umbral", () => {
    const t = computeCartTotals({ ...base, lines: [{ unitPrice: 850, qty: 2 }] });
    expect(t.subtotal).toBe(1700);
    expect(t.shippingFee).toBe(500);
    expect(t.total).toBe(2200);
    expect(t.freeShippingRemaining).toBe(18300);
  });

  it("envío gratis al alcanzar el umbral y nunca en recogida", () => {
    expect(computeCartTotals({ ...base, lines: [{ unitPrice: 20000, qty: 1 }] }).shippingFee).toBe(0);
    expect(
      computeCartTotals({ ...base, fulfillment: "pickup", lines: [{ unitPrice: 100, qty: 1 }] }).shippingFee
    ).toBe(0);
  });

  it("aplica cupón porcentual y fijo (sin superar el subtotal)", () => {
    const pct = computeCartTotals({
      ...base,
      lines: [{ unitPrice: 1000, qty: 1 }],
      coupon: { kind: "percent", value: 10, minSubtotal: null },
    });
    expect(pct.discount).toBe(100);
    const fixed = computeCartTotals({
      ...base,
      lines: [{ unitPrice: 1000, qty: 1 }],
      coupon: { kind: "fixed", value: 5000, minSubtotal: null },
    });
    expect(fixed.discount).toBe(1000);
    const belowMin = computeCartTotals({
      ...base,
      lines: [{ unitPrice: 1000, qty: 1 }],
      coupon: { kind: "percent", value: 10, minSubtotal: 5000 },
    });
    expect(belowMin.discount).toBe(0);
    const over100 = computeCartTotals({
      ...base,
      lines: [{ unitPrice: 1000, qty: 1 }],
      coupon: { kind: "percent", value: 150, minSubtotal: null },
    });
    expect(over100.discount).toBe(1000);
    expect(over100.total).toBe(500);
  });

  it("recargo del método de pago y total en la moneda de pago", () => {
    const t = computeCartTotals({
      ...base,
      lines: [{ unitPrice: 5000, qty: 1 }],
      payment: { surchargePercent: 5, exchangeRate: 400, decimals: 2 },
    });
    expect(t.paymentSurcharge).toBe(275); // 5 % de 5500
    expect(t.total).toBe(5775);
    expect(t.totalInPaymentCurrency).toBe(14.44);
  });

  it("carrito vacío no cobra envío", () => {
    const t = computeCartTotals({ ...base, lines: [] });
    expect(t.total).toBe(0);
    expect(t.shippingFee).toBe(0);
  });
});
