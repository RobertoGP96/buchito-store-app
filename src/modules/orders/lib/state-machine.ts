import type { FulfillmentType, OrderStatus } from "./labels";

/** Transiciones permitidas de un pedido. Las que arrancan en `system` las
 *  dispara la máquina de entregas (recoger / entregar / fallar). */
export const ORDER_TRANSITIONS: Record<OrderStatus, readonly OrderStatus[]> = {
  pending: ["confirmed", "cancelled"],
  confirmed: ["ready", "cancelled"],
  ready: ["out_for_delivery", "delivered", "cancelled"],
  out_for_delivery: ["delivered", "ready"],
  delivered: [],
  cancelled: [],
};

export type OrderActor = "admin" | "customer" | "system";

export interface OrderContext {
  fulfillment: FulfillmentType;
  /** El customer es el dueño del pedido. */
  isOwner: boolean;
  deliveryStatus?: string | null;
}

export type TransitionCheck = { ok: true } | { ok: false; reason: string };

export function canTransitionOrder(
  from: OrderStatus,
  to: OrderStatus,
  actor: OrderActor,
  ctx: OrderContext
): TransitionCheck {
  if (!ORDER_TRANSITIONS[from].includes(to)) {
    return { ok: false, reason: `Un pedido ${from} no puede pasar a ${to}` };
  }

  if (actor === "customer") {
    if (!ctx.isOwner) return { ok: false, reason: "Este pedido no es tuyo" };
    if (from === "pending" && to === "cancelled") return { ok: true };
    return { ok: false, reason: "Solo puedes cancelar un pedido que aún no ha sido confirmado" };
  }

  // Las transiciones que vienen del reparto solo las ejecuta el sistema
  // (desde la máquina de entregas), nunca un botón del admin.
  const deliveryDriven =
    (from === "ready" && to === "out_for_delivery") ||
    (from === "out_for_delivery" && to === "delivered") ||
    (from === "out_for_delivery" && to === "ready");
  if (deliveryDriven) {
    return actor === "system"
      ? { ok: true }
      : { ok: false, reason: "Este cambio lo hace el mensajero desde la entrega" };
  }

  if (actor === "system") {
    return { ok: false, reason: "El sistema solo ejecuta transiciones de reparto" };
  }

  if (from === "ready" && to === "delivered" && ctx.fulfillment !== "pickup") {
    return { ok: false, reason: "Un pedido a domicilio se entrega desde la entrega asignada" };
  }
  if (to === "cancelled" && (ctx.deliveryStatus === "in_transit" || ctx.deliveryStatus === "delivered")) {
    return { ok: false, reason: "No se puede cancelar: la entrega ya está en camino o entregada" };
  }
  return { ok: true };
}

/** Estados a los que `actor` puede llevar el pedido ahora (para pintar botones). */
export function nextOrderStates(from: OrderStatus, actor: OrderActor, ctx: OrderContext): OrderStatus[] {
  return ORDER_TRANSITIONS[from].filter((to) => canTransitionOrder(from, to, actor, ctx).ok);
}

export function isTerminalOrderStatus(status: OrderStatus): boolean {
  return ORDER_TRANSITIONS[status].length === 0;
}
