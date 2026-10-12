import type { StatusMeta } from "@/components/status-chip";
import type { ProductStatus } from "@/modules/products/lib/labels";
import { fmtQty, fmtQtyNumber, type SaleUnit } from "@/modules/products/lib/units";

export interface ComboItemLabelInput {
  qty: number;
  unit: SaleUnit;
  productName: string;
  variantName: string | null;
}

/** "2 × Arroz (M)" por unidades; "0.5 kg Arroz" por peso o medida. */
export function comboItemLabel(item: ComboItemLabelInput): string {
  const name = item.variantName ? `${item.productName} (${item.variantName})` : item.productName;
  return item.unit === "unit" ? `${fmtQtyNumber(item.qty)} × ${name}` : `${fmtQty(item.qty, item.unit)} ${name}`;
}

export function comboItemsSummary(items: ComboItemLabelInput[]): string {
  return items.map(comboItemLabel).join(", ");
}

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
