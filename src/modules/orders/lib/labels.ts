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

/** Cabecera de la ficha del pedido para el cliente según su estado: a ella
 *  llegan también los avisos, así que no siempre es un pedido recién hecho. */
export function orderScreenCopy(
  status: OrderStatus,
  fulfillment: FulfillmentType
): { eyebrow: string; description: string } {
  switch (status) {
    case "pending":
      return {
        eyebrow: "Pedido recibido",
        description: "Te avisaremos cuando lo confirmemos. Guarda este número para cualquier consulta.",
      };
    case "confirmed":
      return { eyebrow: "Pedido confirmado", description: "Lo estamos preparando. Te avisaremos cuando esté listo." };
    case "ready":
      return fulfillment === "pickup"
        ? { eyebrow: "Listo para recoger", description: "Pásate por la tienda cuando quieras." }
        : { eyebrow: "Pedido listo", description: "Pronto saldrá en camino con un mensajero." };
    case "out_for_delivery":
      return { eyebrow: "En camino", description: "El mensajero ya salió con tu pedido." };
    case "delivered":
      return { eyebrow: "Pedido entregado", description: "Gracias por tu compra." };
    case "cancelled":
      return { eyebrow: "Pedido cancelado", description: "Este pedido fue cancelado. Si tienes dudas, contáctanos." };
  }
}
