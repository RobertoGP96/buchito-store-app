import "server-only";
import type { Prisma } from "@/generated/prisma";
import { StaleVersionError } from "@/lib/action-utils";
import { createAuditLog } from "@/lib/audit";
import { notify } from "@/modules/notifications/lib/notify";
import { deliveryTransitionTargets } from "@/modules/notifications/lib/targets";
import { applyOrderTransition } from "@/modules/orders/lib/transition";
import { recordOrderPayment } from "@/modules/payments/lib/record-payment";
import type { DeliveryStatus } from "./labels";
import { canTransitionDelivery, orderEffectFor } from "./state-machine";

/** Regla de negocio incumplida: el mensaje se muestra tal cual al usuario. */
export class DeliveryRuleError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "DeliveryRuleError";
  }
}

export function isDeliveryRuleError(error: unknown): error is DeliveryRuleError {
  return error instanceof DeliveryRuleError;
}

/** Destinos que ejecuta quien reparte. Asignar/desasignar tienen sus propias
 *  actions y `cancelled` solo llega desde la cancelación del pedido. */
export type CourierDeliveryTarget = Extract<DeliveryStatus, "in_transit" | "delivered" | "failed">;

export interface ApplyDeliveryTransitionInput {
  deliveryId: number;
  /** Versión que vio quien pulsó el botón. */
  expectedVersion: number;
  to: CourierDeliveryTarget;
  actor: "admin" | "courier";
  userId: number;
  /** Mensajero de la sesión cuando el actor es `courier`. */
  sessionCourierId?: number | null;
  failedReason?: string | null;
  proofPhotoUrl?: string | null;
  /** Cobro contra entrega, en la moneda del método de pago del pedido. */
  amountCollected?: number | null;
  note?: string | null;
}

export interface ApplyDeliveryTransitionResult {
  deliveryId: number;
  orderId: number;
  orderNo: string;
}

/** Transición de reparto (recoger / entregar / fallar) con todos sus efectos,
 *  dentro de la transacción de quien llama: `updateMany` con versión,
 *  `DeliveryEvent`, efecto sobre el pedido como `system`, cobro contra entrega
 *  y audit. Lanza `DeliveryRuleError` (mensaje para el usuario),
 *  `StaleVersionError` o los errores de `recordOrderPayment`. No revalida
 *  rutas: eso lo hace la action. */
export async function applyDeliveryTransition(
  tx: Prisma.TransactionClient,
  input: ApplyDeliveryTransitionInput
): Promise<ApplyDeliveryTransitionResult> {
  const delivery = await tx.delivery.findUnique({
    where: { deliveryId: input.deliveryId },
    select: {
      deliveryId: true,
      orderId: true,
      status: true,
      courierId: true,
      attempts: true,
      failedReason: true,
      courier: { select: { deliveryFee: true, user: { select: { fullName: true } } } },
      order: { select: { orderNo: true, paymentMethodId: true } },
    },
  });
  if (!delivery) throw new DeliveryRuleError("Entrega no encontrada");

  const from: DeliveryStatus = delivery.status;
  const to = input.to;
  const failedReason = input.failedReason?.trim() || null;
  const isAssignedCourier =
    input.actor === "courier" &&
    input.sessionCourierId != null &&
    delivery.courierId === input.sessionCourierId;

  const check = canTransitionDelivery(from, to, input.actor, { isAssignedCourier, failedReason });
  if (!check.ok) throw new DeliveryRuleError(check.reason);

  const now = new Date();
  const data: Prisma.DeliveryUpdateManyMutationInput = { status: to, version: { increment: 1 } };
  if (to === "in_transit") data.pickedUpAt = now;
  if (to === "delivered") {
    data.deliveredAt = now;
    if (input.proofPhotoUrl) data.proofPhotoUrl = input.proofPhotoUrl;
    // Servicio del mensajero: se fija con su tarifa vigente al completar la
    // entrega, para que un cambio de tarifa posterior no altere lo devengado.
    data.courierFee = delivery.courier?.deliveryFee ?? 0;
  }
  if (to === "failed") {
    data.failedAt = now;
    data.failedReason = failedReason;
    data.attempts = { increment: 1 };
  }

  const updated = await tx.delivery.updateMany({
    where: { deliveryId: delivery.deliveryId, version: input.expectedVersion },
    data,
  });
  if (updated.count !== 1) throw new StaleVersionError();

  const note = failedReason ?? input.note?.trim() ?? null;
  await tx.deliveryEvent.create({
    data: {
      deliveryId: delivery.deliveryId,
      fromStatus: from,
      toStatus: to,
      actorId: input.userId,
      note: note || null,
    },
  });

  // El pedido sigue a la entrega: recoger ⇒ out_for_delivery, entregar ⇒
  // delivered, fallar ⇒ vuelve a ready. Si la máquina de pedidos lo rechaza,
  // se aborta toda la tx para que la entrega no quede desincronizada.
  const effect = orderEffectFor(to);
  if (effect) {
    const result = await applyOrderTransition(tx, {
      orderId: delivery.orderId,
      to: effect,
      actor: "system",
      userId: input.userId,
      reason: failedReason,
    });
    if (!result.ok) throw new DeliveryRuleError(result.error);
  }

  const amountCollected = input.amountCollected ?? 0;
  if (to === "delivered" && amountCollected > 0) {
    await recordOrderPayment(tx, {
      orderId: delivery.orderId,
      paymentMethodId: delivery.order.paymentMethodId,
      amountTendered: amountCollected,
      receivedById: input.userId,
      notes: "Cobro contra entrega",
      actorRole: input.actor,
      origin: "cash_on_delivery",
      actorName: input.actor === "courier" ? (delivery.courier?.user.fullName ?? null) : null,
    });
  }

  await createAuditLog(tx, {
    action: `transition:${to}`,
    entityType: "Delivery",
    entityId: delivery.deliveryId,
    module: "deliveries",
    userId: input.userId,
    oldValues: { status: from, attempts: delivery.attempts, failedReason: delivery.failedReason },
    newValues: {
      status: to,
      actor: input.actor,
      orderId: delivery.orderId,
      orderEffect: effect,
      failedReason,
      proofPhotoUrl: input.proofPhotoUrl ?? null,
      amountCollected: amountCollected > 0 ? amountCollected : null,
      note: note || null,
    },
  });

  // Los admins se enteran de cada paso que marca el mensajero; al cliente le
  // avisa la transición del pedido y el cobro, no la entrega.
  await notify(
    tx,
    input.userId,
    deliveryTransitionTargets({
      actor: input.actor,
      to,
      orderId: delivery.orderId,
      orderNo: delivery.order.orderNo,
      courierName: delivery.courier?.user.fullName ?? null,
      failedReason,
    })
  );

  return { deliveryId: delivery.deliveryId, orderId: delivery.orderId, orderNo: delivery.order.orderNo };
}
