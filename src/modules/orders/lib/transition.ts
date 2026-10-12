import "server-only";
import type { Prisma } from "@/generated/prisma";
import { StaleVersionError } from "@/lib/action-utils";
import { createAuditLog } from "@/lib/audit";
import type { FulfillmentType, OrderStatus } from "./labels";
import { canTransitionOrder, type OrderActor } from "./state-machine";

export interface ApplyOrderTransitionInput {
  orderId: number;
  to: OrderStatus;
  actor: OrderActor;
  /** Quién ejecuta (audit, StockMovement, DeliveryEvent); null para el sistema sin sesión. */
  userId: number | null;
  reason?: string | null;
  /** El customer de la sesión es el dueño del pedido. */
  isOwner?: boolean;
  /** Versión que vio quien pulsó el botón; sin ella se usa la actual. */
  expectedVersion?: number | null;
}

export type ApplyOrderTransitionResult =
  | {
      ok: true;
      order: {
        orderId: number;
        orderNo: string;
        status: OrderStatus;
        version: number;
        fulfillment: FulfillmentType;
        paymentMethodId: number;
      };
    }
  | { ok: false; error: string };

const DELIVERY_TERMINAL = new Set(["delivered", "cancelled"]);

/** Transición de estado de un pedido con todos sus efectos, dentro de la
 *  transacción de quien llama (admin, cliente o la máquina de entregas como
 *  `system`). No revalida rutas: eso lo hace la action. Lanza
 *  `StaleVersionError` si la versión no coincide; devuelve `ok:false` cuando
 *  la máquina de estados rechaza el cambio. */
export async function applyOrderTransition(
  tx: Prisma.TransactionClient,
  input: ApplyOrderTransitionInput
): Promise<ApplyOrderTransitionResult> {
  const order = await tx.order.findUnique({
    where: { orderId: input.orderId },
    include: {
      delivery: { select: { deliveryId: true, status: true } },
      lines: { select: { variantId: true, qty: true } },
    },
  });
  if (!order) return { ok: false, error: "Pedido no encontrado" };

  const from: OrderStatus = order.status;
  const to = input.to;
  const check = canTransitionOrder(from, to, input.actor, {
    fulfillment: order.fulfillment,
    isOwner: input.isOwner ?? false,
    deliveryStatus: order.delivery?.status ?? null,
  });
  if (!check.ok) return { ok: false, error: check.reason };

  const reason = input.reason?.trim() || null;
  const now = new Date();
  const data: Prisma.OrderUpdateManyMutationInput = { status: to, version: { increment: 1 } };
  if (to === "confirmed") data.confirmedAt = now;
  // Una entrega fallida devuelve el pedido a "listo": conserva el readyAt original.
  if (to === "ready" && order.readyAt == null) data.readyAt = now;
  if (to === "delivered") data.deliveredAt = now;
  if (to === "cancelled") {
    data.cancelledAt = now;
    data.cancelReason = reason;
  }

  const expectedVersion = input.expectedVersion ?? order.version;
  const updated = await tx.order.updateMany({
    where: { orderId: order.orderId, version: expectedVersion },
    data,
  });
  if (updated.count !== 1) throw new StaleVersionError();

  if (to === "ready" && order.fulfillment === "delivery" && !order.delivery) {
    const delivery = await tx.delivery.create({
      data: { orderId: order.orderId, zoneId: order.zoneId, fee: order.shippingFee, status: "pending" },
    });
    await tx.deliveryEvent.create({
      data: { deliveryId: delivery.deliveryId, fromStatus: null, toStatus: "pending", actorId: input.userId },
    });
  }

  if (to === "cancelled") {
    await restockLines(tx, order, input.userId);

    if (order.delivery && !DELIVERY_TERMINAL.has(order.delivery.status)) {
      await tx.delivery.update({
        where: { deliveryId: order.delivery.deliveryId },
        data: { status: "cancelled", version: { increment: 1 } },
      });
      await tx.deliveryEvent.create({
        data: {
          deliveryId: order.delivery.deliveryId,
          fromStatus: order.delivery.status,
          toStatus: "cancelled",
          actorId: input.userId,
          note: reason,
        },
      });
    }

    if (order.couponId != null) {
      await tx.coupon.updateMany({
        where: { couponId: order.couponId, usedCount: { gt: 0 } },
        data: { usedCount: { decrement: 1 } },
      });
    }
  }

  await createAuditLog(tx, {
    module: "orders",
    entityType: "Order",
    entityId: order.orderId,
    action: `transition:${to}`,
    userId: input.userId,
    oldValues: { status: from },
    newValues: { status: to, reason },
  });

  return {
    ok: true,
    order: {
      orderId: order.orderId,
      orderNo: order.orderNo,
      status: to,
      version: expectedVersion + 1,
      fulfillment: order.fulfillment,
      paymentMethodId: order.paymentMethodId,
    },
  };
}

/** Devuelve al inventario lo que el pedido había descontado al crearse. */
async function restockLines(
  tx: Prisma.TransactionClient,
  // `qty` llega como Decimal de la DB (cantidades con decimales): Prisma lo
  // acepta tal cual en el incremento y en el movimiento.
  order: { orderId: number; orderNo: string; lines: { variantId: number; qty: Prisma.Decimal | number }[] },
  userId: number | null
): Promise<void> {
  // Mismo orden de bloqueo que el descuento de stock en createOrder: evita
  // deadlocks entre una cancelación y un checkout con las mismas variantes.
  const lines = [...order.lines].sort((a, b) => a.variantId - b.variantId);
  for (const line of lines) {
    const variant = await tx.productVariant.update({
      where: { variantId: line.variantId },
      data: { stock: { increment: line.qty } },
      select: { stock: true },
    });
    await tx.stockMovement.create({
      data: {
        variantId: line.variantId,
        type: "entry",
        quantity: line.qty,
        stockAfter: variant.stock,
        referenceType: "order",
        referenceId: order.orderId,
        notes: `Cancelación ${order.orderNo}`,
        createdById: userId,
      },
    });
  }
}
