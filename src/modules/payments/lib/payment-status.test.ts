import { describe, expect, it } from "vitest";
import { derivePaymentStatus, outstandingBase } from "./payment-status";

describe("derivePaymentStatus", () => {
  it("sin cobros es unpaid", () => {
    expect(derivePaymentStatus(0, 1000)).toBe("unpaid");
  });

  it("cobro parcial es partial", () => {
    expect(derivePaymentStatus(400, 1000)).toBe("partial");
  });

  it("cobro completo (con tolerancia de redondeo) es paid", () => {
    expect(derivePaymentStatus(1000, 1000)).toBe("paid");
    expect(derivePaymentStatus(999.996, 1000)).toBe("paid");
    expect(derivePaymentStatus(1200, 1000)).toBe("paid");
  });

  it("refunded nunca se recalcula", () => {
    expect(derivePaymentStatus(1000, 1000, "refunded")).toBe("refunded");
  });
});

describe("outstandingBase", () => {
  it("nunca es negativo", () => {
    expect(outstandingBase(300, 1000)).toBe(700);
    expect(outstandingBase(1500, 1000)).toBe(0);
  });
});
