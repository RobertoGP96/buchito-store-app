import { describe, expect, it } from "vitest";
import type { PaymentStatus } from "@/modules/payments/lib/labels";
import { ORDER_STATUSES } from "./labels";
import { buildPaymentContactMessage, needsPaymentContact, outstandingInPaymentCurrency } from "./payment-contact";

const PAYMENT_STATUSES: readonly PaymentStatus[] = ["unpaid", "partial", "paid", "refunded"];

describe("needsPaymentContact", () => {
  it("solo pide contacto con pedido vivo, saldo y pago sin completar", () => {
    for (const status of ORDER_STATUSES) {
      for (const paymentStatus of PAYMENT_STATUSES) {
        const paidBase = paymentStatus === "unpaid" ? 0 : paymentStatus === "partial" ? 400 : 1000;
        const expected = status !== "cancelled" && (paymentStatus === "unpaid" || paymentStatus === "partial");
        expect(needsPaymentContact({ status, paymentStatus, total: 1000, paidBase }), `${status}/${paymentStatus}`).toBe(
          expected
        );
      }
    }
  });

  it("un entregado sin cobro registrado sigue debiendo", () => {
    expect(needsPaymentContact({ status: "delivered", paymentStatus: "unpaid", total: 1000, paidBase: 0 })).toBe(true);
  });

  it("un total 0 nunca pide contacto", () => {
    expect(needsPaymentContact({ status: "pending", paymentStatus: "unpaid", total: 0, paidBase: 0 })).toBe(false);
  });

  it("un pedido pagado de más no pide contacto", () => {
    expect(needsPaymentContact({ status: "pending", paymentStatus: "paid", total: 1000, paidBase: 1200 })).toBe(false);
  });
});

describe("outstandingInPaymentCurrency", () => {
  const paymentCurrency = { decimalPlaces: 2 };

  it("convierte el saldo con la tasa del pedido", () => {
    expect(outstandingInPaymentCurrency({ total: 1000, paidBase: 0, paymentExchangeRate: 250, paymentCurrency })).toBe(4);
    expect(outstandingInPaymentCurrency({ total: 1000, paidBase: 400, paymentExchangeRate: 250, paymentCurrency })).toBe(2.4);
  });

  it("redondea a los decimales de la moneda de pago y nunca baja de 0", () => {
    expect(outstandingInPaymentCurrency({ total: 1000, paidBase: 0, paymentExchangeRate: 300, paymentCurrency })).toBe(3.33);
    expect(outstandingInPaymentCurrency({ total: 1000, paidBase: 1200, paymentExchangeRate: 300, paymentCurrency })).toBe(0);
  });
});

describe("buildPaymentContactMessage", () => {
  const base = {
    storeName: "Buchito",
    orderNo: "PED-00042",
    customerName: "Ana Pérez",
    amountLabel: "1 250 CUP",
    paymentMethodName: "Transferencia",
  };

  it("arma el texto con pedido, nombre, monto y método", () => {
    expect(buildPaymentContactMessage({ ...base, partial: false })).toBe(
      "Hola, soy Ana Pérez. Escribo por mi pedido PED-00042 en Buchito.\n" +
        "Total a pagar: 1 250 CUP (Transferencia).\n" +
        "Quiero coordinar el pago."
    );
  });

  it("habla de saldo pendiente en un pago parcial", () => {
    expect(buildPaymentContactMessage({ ...base, amountLabel: "750 CUP", partial: true })).toContain(
      "Saldo pendiente: 750 CUP (Transferencia)."
    );
  });
});
