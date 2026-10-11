import type { DeliveryStatus } from "./labels";

/** Transiciones de una entrega. Una entrega fallida se re-asigna, no se
 *  crea otra; `cancelled` solo llega desde la cancelación del pedido. */
export const DELIVERY_TRANSITIONS: Record<DeliveryStatus, readonly DeliveryStatus[]> = {
  pending: ["assigned", "cancelled"],
  assigned: ["in_transit", "pending", "cancelled"],
  in_transit: ["delivered", "failed"],
  failed: ["assigned", "cancelled"],
  delivered: [],
  cancelled: [],
};

export type DeliveryActor = "admin" | "courier" | "system";

export interface DeliveryContext {
  /** El courier de la sesión es el asignado a esta entrega. */
  isAssignedCourier: boolean;
  /** Mensajero que se asignaría (para pending/failed → assigned). */
  courierId?: number | null;
  failedReason?: string | null;
}

export type TransitionCheck = { ok: true } | { ok: false; reason: string };

export function canTransitionDelivery(
  from: DeliveryStatus,
  to: DeliveryStatus,
  actor: DeliveryActor,
  ctx: DeliveryContext
): TransitionCheck {
  if (!DELIVERY_TRANSITIONS[from].includes(to)) {
    return { ok: false, reason: `Una entrega ${from} no puede pasar a ${to}` };
  }

  if (to === "cancelled") {
    return actor === "system"
      ? { ok: true }
      : { ok: false, reason: "La entrega se cancela cancelando el pedido" };
  }
  if (actor === "system") {
    return { ok: false, reason: "El sistema solo cancela entregas" };
  }

  if (to === "assigned") {
    if (actor !== "admin") return { ok: false, reason: "Solo el administrador asigna mensajeros" };
    if (!ctx.courierId) return { ok: false, reason: "Elige un mensajero" };
    return { ok: true };
  }
  if (to === "pending") {
    return actor === "admin"
      ? { ok: true }
      : { ok: false, reason: "Solo el administrador desasigna" };
  }

  // in_transit / delivered / failed: admin o el mensajero asignado.
  if (actor === "courier" && !ctx.isAssignedCourier) {
    return { ok: false, reason: "Esta entrega no está asignada a ti" };
  }
  if (to === "failed" && !ctx.failedReason?.trim()) {
    return { ok: false, reason: "Indica el motivo por el que no se pudo entregar" };
  }
  return { ok: true };
}

export function nextDeliveryStates(
  from: DeliveryStatus,
  actor: DeliveryActor,
  ctx: DeliveryContext
): DeliveryStatus[] {
  return DELIVERY_TRANSITIONS[from].filter((to) => {
    // Para pintar botones, "fallida" y "asignar" se ofrecen aunque falten
    // los datos que se piden en el formulario (motivo, mensajero).
    const probe: DeliveryContext = {
      ...ctx,
      failedReason: to === "failed" ? (ctx.failedReason || "pendiente") : ctx.failedReason,
      courierId: to === "assigned" ? (ctx.courierId ?? -1) : ctx.courierId,
    };
    return canTransitionDelivery(from, to, actor, probe).ok;
  });
}

/** Efecto de cada transición de entrega sobre el pedido (actor `system`). */
export function orderEffectFor(to: DeliveryStatus): "out_for_delivery" | "delivered" | "ready" | null {
  if (to === "in_transit") return "out_for_delivery";
  if (to === "delivered") return "delivered";
  if (to === "failed") return "ready";
  return null;
}
