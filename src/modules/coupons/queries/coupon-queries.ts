import "server-only";
import { db } from "@/lib/db";
import { decimalToNullableNumber, decimalToNumber } from "@/lib/money";
import { deriveCouponState } from "../lib/coupon-state";
import type { CouponKind, CouponState } from "../lib/labels";

export interface CouponRow {
  couponId: number;
  code: string;
  kind: CouponKind;
  /** `fixed` en moneda base; `percent` en %. */
  value: number;
  minSubtotal: number | null;
  maxUses: number | null;
  usedCount: number;
  startsAt: string | null;
  endsAt: string | null;
  isActive: boolean;
  state: CouponState;
  createdAt: string;
}

export async function getCoupons(): Promise<CouponRow[]> {
  const now = new Date();
  const rows = await db.coupon.findMany({ orderBy: [{ isActive: "desc" }, { createdAt: "desc" }] });
  return rows.map((row) => ({
    couponId: row.couponId,
    code: row.code,
    kind: row.kind,
    value: decimalToNumber(row.value),
    minSubtotal: decimalToNullableNumber(row.minSubtotal),
    maxUses: row.maxUses,
    usedCount: row.usedCount,
    startsAt: row.startsAt?.toISOString() ?? null,
    endsAt: row.endsAt?.toISOString() ?? null,
    isActive: row.isActive,
    state: deriveCouponState(row, now),
    createdAt: row.createdAt.toISOString(),
  }));
}
