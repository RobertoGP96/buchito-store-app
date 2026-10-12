import type { StatusMeta } from "@/components/status-chip";
import type { ProductStatus } from "@/modules/products/lib/labels";

/** Estado derivado del combo: el guardado (`status`) más la vigencia. */
export type ComboState = ProductStatus | "scheduled" | "expired";

export const COMBO_STATE_META: Record<ComboState, StatusMeta> = {
  draft: { label: "Borrador", tone: "neutral" },
  active: { label: "Publicado", tone: "success" },
  archived: { label: "Archivado", tone: "warning" },
  scheduled: { label: "Programado", tone: "info" },
  expired: { label: "Vencido", tone: "danger" },
};

export interface ComboStateInput {
  status: ProductStatus;
  startsAt: Date | null;
  endsAt: Date | null;
}

/** Mismo criterio que usa la tienda para mostrar un combo: publicado y
 *  dentro de sus fechas. El chip del admin coincide así con lo que ve el cliente. */
export function deriveComboState(combo: ComboStateInput, now: Date): ComboState {
  if (combo.status !== "active") return combo.status;
  if (combo.endsAt && now > combo.endsAt) return "expired";
  if (combo.startsAt && now < combo.startsAt) return "scheduled";
  return "active";
}
