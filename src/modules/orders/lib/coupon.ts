/** Validación pura de un cupón contra un subtotal en moneda base. Sin DB:
 *  la action lee la fila y la pasa ya convertida (Decimal → number). */
export interface CouponLike {
  code: string;
  kind: "percent" | "fixed";
  /** `fixed` en moneda base. */
  value: number;
  minSubtotal: number | null;
  maxUses: number | null;
  usedCount: number;
  startsAt: Date | null;
  endsAt: Date | null;
  isActive: boolean;
}

/** Lo que `computeCartTotals` necesita del cupón. */
export interface CouponDiscount {
  kind: "percent" | "fixed";
  value: number;
  minSubtotal: number | null;
}

export type CouponValidation =
  | { ok: true; discountKindValue: CouponDiscount }
  | { ok: false; reason: string };

export interface ValidateCouponInput {
  /** null cuando el código no existe. */
  coupon: CouponLike | null;
  /** Subtotal de líneas en base (antes de envío y recargos). */
  subtotal: number;
  now: Date;
}

export function validateCoupon({ coupon, subtotal, now }: ValidateCouponInput): CouponValidation {
  if (!coupon || !coupon.isActive) {
    return { ok: false, reason: "El cupón no existe o ya no está activo" };
  }
  if (coupon.startsAt && now < coupon.startsAt) {
    return { ok: false, reason: "Este cupón todavía no está vigente" };
  }
  if (coupon.endsAt && now > coupon.endsAt) {
    return { ok: false, reason: "Este cupón ya venció" };
  }
  if (coupon.maxUses != null && coupon.usedCount >= coupon.maxUses) {
    return { ok: false, reason: "Este cupón ya alcanzó su límite de usos" };
  }
  if (coupon.minSubtotal != null && subtotal < coupon.minSubtotal) {
    return { ok: false, reason: "Tu compra no alcanza el mínimo para usar este cupón" };
  }
  // Un porcentaje > 100 descontaría más que el subtotal; el CHECK de la DB
  // solo exige value > 0.
  if (!(coupon.value > 0) || (coupon.kind === "percent" && coupon.value > 100)) {
    return { ok: false, reason: "El cupón no tiene un descuento válido" };
  }
  return {
    ok: true,
    discountKindValue: { kind: coupon.kind, value: coupon.value, minSubtotal: coupon.minSubtotal },
  };
}
