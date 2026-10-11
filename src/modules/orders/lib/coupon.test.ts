import { describe, expect, it } from "vitest";
import { validateCoupon, type CouponLike } from "./coupon";

const now = new Date("2026-06-15T12:00:00Z");

const coupon: CouponLike = {
  code: "HOLA10",
  kind: "percent",
  value: 10,
  minSubtotal: null,
  maxUses: null,
  usedCount: 0,
  startsAt: null,
  endsAt: null,
  isActive: true,
};

describe("validateCoupon", () => {
  it("acepta un cupón activo sin restricciones y devuelve el descuento", () => {
    const result = validateCoupon({ coupon, subtotal: 1000, now });
    expect(result).toEqual({
      ok: true,
      discountKindValue: { kind: "percent", value: 10, minSubtotal: null },
    });
  });

  it("rechaza cupón inexistente o inactivo", () => {
    expect(validateCoupon({ coupon: null, subtotal: 1000, now }).ok).toBe(false);
    expect(validateCoupon({ coupon: { ...coupon, isActive: false }, subtotal: 1000, now }).ok).toBe(false);
  });

  it("respeta la ventana startsAt / endsAt", () => {
    const future = { ...coupon, startsAt: new Date("2026-07-01T00:00:00Z") };
    const expired = { ...coupon, endsAt: new Date("2026-06-01T00:00:00Z") };
    const inWindow = {
      ...coupon,
      startsAt: new Date("2026-06-01T00:00:00Z"),
      endsAt: new Date("2026-06-30T00:00:00Z"),
    };
    expect(validateCoupon({ coupon: future, subtotal: 1000, now }).ok).toBe(false);
    expect(validateCoupon({ coupon: expired, subtotal: 1000, now }).ok).toBe(false);
    expect(validateCoupon({ coupon: inWindow, subtotal: 1000, now }).ok).toBe(true);
  });

  it("bloquea al alcanzar maxUses", () => {
    expect(validateCoupon({ coupon: { ...coupon, maxUses: 5, usedCount: 5 }, subtotal: 1000, now }).ok).toBe(false);
    expect(validateCoupon({ coupon: { ...coupon, maxUses: 5, usedCount: 4 }, subtotal: 1000, now }).ok).toBe(true);
  });

  it("exige el subtotal mínimo y lo propaga al descuento", () => {
    const withMin = { ...coupon, minSubtotal: 5000 };
    expect(validateCoupon({ coupon: withMin, subtotal: 4999, now }).ok).toBe(false);
    const ok = validateCoupon({ coupon: withMin, subtotal: 5000, now });
    expect(ok.ok).toBe(true);
    if (ok.ok) expect(ok.discountKindValue.minSubtotal).toBe(5000);
  });

  it("rechaza un valor de descuento no positivo", () => {
    expect(validateCoupon({ coupon: { ...coupon, value: 0 }, subtotal: 1000, now }).ok).toBe(false);
  });

  it("rechaza un porcentaje mayor que 100 pero acepta un fijo mayor que el subtotal", () => {
    expect(validateCoupon({ coupon: { ...coupon, value: 150 }, subtotal: 1000, now }).ok).toBe(false);
    expect(validateCoupon({ coupon: { ...coupon, value: 100 }, subtotal: 1000, now }).ok).toBe(true);
    expect(validateCoupon({ coupon: { ...coupon, kind: "fixed", value: 5000 }, subtotal: 1000, now }).ok).toBe(true);
  });

  it("los mensajes de rechazo van en español", () => {
    const result = validateCoupon({ coupon: { ...coupon, endsAt: new Date("2026-01-01") }, subtotal: 1, now });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toMatch(/venció/);
  });
});
