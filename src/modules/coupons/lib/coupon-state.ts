import type { CouponState } from "./labels";

export interface CouponStateInput {
  isActive: boolean;
  maxUses: number | null;
  usedCount: number;
  startsAt: Date | null;
  endsAt: Date | null;
}

/** Mismo orden de comprobación que `validateCoupon` en orders/lib/coupon.ts,
 *  para que el chip del admin coincida con lo que vería el cliente. */
export function deriveCouponState(coupon: CouponStateInput, now: Date): CouponState {
  if (!coupon.isActive) return "inactive";
  if (coupon.endsAt && now > coupon.endsAt) return "expired";
  if (coupon.maxUses != null && coupon.usedCount >= coupon.maxUses) return "exhausted";
  if (coupon.startsAt && now < coupon.startsAt) return "scheduled";
  return "active";
}
