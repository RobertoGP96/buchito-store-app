import type { StatusMeta } from "@/components/status-chip";

export type ProductStatus = "draft" | "active" | "archived";

export const PRODUCT_STATUSES: readonly ProductStatus[] = ["draft", "active", "archived"];

export const PRODUCT_STATUS_META: Record<ProductStatus, StatusMeta> = {
  draft: { label: "Borrador", tone: "neutral" },
  active: { label: "Publicado", tone: "success" },
  archived: { label: "Archivado", tone: "warning" },
};
