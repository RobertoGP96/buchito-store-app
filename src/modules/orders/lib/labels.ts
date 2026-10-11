import type { StatusMeta } from "@/components/status-chip";

export type OrderStatus =
  | "pending"
  | "confirmed"
  | "ready"
  | "out_for_delivery"
  | "delivered"
  | "cancelled";

export type FulfillmentType = "delivery" | "pickup";

export const ORDER_STATUSES: readonly OrderStatus[] = [
  "pending",
  "confirmed",
  "ready",
  "out_for_delivery",
  "delivered",
  "cancelled",
];

export const ORDER_STATUS_META: Record<OrderStatus, StatusMeta> = {
  pending: { label: "Pendiente", tone: "warning" },
  confirmed: { label: "Confirmado", tone: "info" },
  ready: { label: "Listo", tone: "info" },
  out_for_delivery: { label: "En camino", tone: "info" },
  delivered: { label: "Entregado", tone: "success" },
  cancelled: { label: "Cancelado", tone: "danger" },
};

export const FULFILLMENT_LABELS: Record<FulfillmentType, string> = {
  delivery: "Entrega a domicilio",
  pickup: "Recogida en tienda",
};

/** Rótulo del botón que lleva a cada estado destino. */
export const ORDER_TRANSITION_LABELS: Record<OrderStatus, string> = {
  pending: "Volver a pendiente",
  confirmed: "Confirmar pedido",
  ready: "Marcar listo",
  out_for_delivery: "En camino",
  delivered: "Marcar entregado",
  cancelled: "Cancelar pedido",
};
