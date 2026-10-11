import type { StatusMeta } from "@/components/status-chip";

// Unión espejo del enum CouponKind de Prisma: los componentes cliente no
// pueden importar @/generated/prisma.
export type CouponKind = "percent" | "fixed";

export const COUPON_KINDS: readonly CouponKind[] = ["percent", "fixed"];

export const COUPON_KIND_LABELS: Record<CouponKind, string> = {
  percent: "Porcentaje",
  fixed: "Monto fijo",
};

/** Estado derivado (no se guarda): combina `isActive`, vigencia y usos. */
export type CouponState = "active" | "scheduled" | "inactive" | "expired" | "exhausted";

export const COUPON_STATE_META: Record<CouponState, StatusMeta> = {
  active: { label: "Activo", tone: "success" },
  scheduled: { label: "Programado", tone: "info" },
  inactive: { label: "Inactivo", tone: "neutral" },
  expired: { label: "Caducado", tone: "danger" },
  exhausted: { label: "Agotado", tone: "warning" },
};
