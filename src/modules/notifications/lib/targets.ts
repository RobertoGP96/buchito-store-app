import type { DeliveryStatus } from "@/modules/deliveries/lib/labels";
import type { FulfillmentType, OrderStatus } from "@/modules/orders/lib/labels";
import type { PaymentStatus } from "@/modules/payments/lib/labels";
import type { LowStockItem, LowStockSource, Money, NotificationEvent } from "./build-notification";

/* Matriz de audiencias: quién se entera de cada evento de negocio. Un
   «Entregado» del mensajero ejecuta en la misma tx la entrega, el pedido
   (como `system`) y el cobro; por eso cada audiencia tiene UN dueño:
   - cliente: solo desde el pedido y desde el cobro;
   - admins: pasos de reparto solo desde la entrega (y solo si los marca un
     mensajero); cobros solo si los registra un mensajero;
   - mensajero: asignación, cancelación de su entrega y liquidaciones.
   Al actor lo quita `planNotifications`, no estas funciones. */

export interface NotifyTarget {
  event: NotificationEvent;
  /** Destinatarios directos; null/undefined se descartan (cliente invitado). */
  userIds?: ReadonlyArray<number | null | undefined>;
  /** Además, todos los admins activos. */
  admins?: boolean;
}

export function orderTransitionTargets(input: {
  from: OrderStatus;
  to: OrderStatus;
  actor: "admin" | "customer" | "system";
  reason: string | null;
  order: {
    orderId: number;
    orderNo: string;
    fulfillment: FulfillmentType;
    customerUserId: number | null;
    customerName: string;
  };
  /** Estado de la entrega ANTES de la transición. */
  delivery: { deliveryId: number; status: DeliveryStatus; courierUserId: number | null; courierName: string | null } | null;
}): NotifyTarget[] {
  const { from, to, order, delivery } = input;
  const customer = [order.customerUserId];
  const targets: NotifyTarget[] = [];

  switch (to) {
    case "confirmed":
      targets.push({ event: { audience: "customer", kind: "order_confirmed", orderNo: order.orderNo }, userIds: customer });
      break;
    case "ready":
      // Volver a "listo" desde "en camino" es una entrega fallida.
      targets.push({
        event:
          from === "out_for_delivery"
            ? { audience: "customer", kind: "order_delivery_failed", orderNo: order.orderNo }
            : { audience: "customer", kind: "order_ready", orderNo: order.orderNo, fulfillment: order.fulfillment },
        userIds: customer,
      });
      break;
    case "out_for_delivery":
      targets.push({
        event: {
          audience: "customer",
          kind: "order_out_for_delivery",
          orderNo: order.orderNo,
          courierName: delivery?.courierName ?? null,
        },
        userIds: customer,
      });
      break;
    case "delivered":
      targets.push({ event: { audience: "customer", kind: "order_delivered", orderNo: order.orderNo }, userIds: customer });
      break;
    case "cancelled":
      targets.push({
        event: { audience: "customer", kind: "order_cancelled", orderNo: order.orderNo, reason: input.reason },
        userIds: customer,
      });
      if (input.actor === "customer") {
        targets.push({
          event: {
            audience: "admin",
            kind: "order_cancelled",
            orderId: order.orderId,
            orderNo: order.orderNo,
            customerName: order.customerName,
            reason: input.reason,
          },
          admins: true,
        });
      }
      // Solo una entrega asignada sigue en la lista del mensajero; una fallida
      // ya la cerró él.
      if (delivery && delivery.status === "assigned" && delivery.courierUserId != null) {
        targets.push({
          event: { audience: "courier", kind: "delivery_cancelled", deliveryId: delivery.deliveryId, orderNo: order.orderNo },
          userIds: [delivery.courierUserId],
        });
      }
      break;
    case "pending":
      break;
  }
  return targets;
}

export function deliveryTransitionTargets(input: {
  actor: "admin" | "courier";
  to: "in_transit" | "delivered" | "failed";
  orderId: number;
  orderNo: string;
  courierName: string | null;
  failedReason: string | null;
}): NotifyTarget[] {
  if (input.actor !== "courier") return [];
  const event: NotificationEvent =
    input.to === "failed"
      ? {
          audience: "admin",
          kind: "delivery_failed",
          orderNo: input.orderNo,
          courierName: input.courierName,
          failedReason: input.failedReason,
        }
      : {
          audience: "admin",
          kind: input.to === "in_transit" ? "delivery_in_transit" : "delivery_delivered",
          orderId: input.orderId,
          orderNo: input.orderNo,
          courierName: input.courierName,
        };
  return [{ event, admins: true }];
}

export function orderPaymentTargets(input: {
  actorRole: "admin" | "courier";
  origin: "manual" | "cash_on_delivery";
  actorName: string | null;
  orderId: number;
  orderNo: string;
  customerUserId: number | null;
  amount: Money;
  outstanding: Money;
  paymentMethodName: string;
  paymentStatus: PaymentStatus;
}): NotifyTarget[] {
  const targets: NotifyTarget[] = [];
  // Un pedido reembolsado no tiene "pendiente" que contarle al cliente.
  if (input.paymentStatus !== "refunded") {
    targets.push({
      event:
        input.paymentStatus === "paid"
          ? { audience: "customer", kind: "order_paid", orderNo: input.orderNo, amount: input.amount }
          : {
              audience: "customer",
              kind: "payment_recorded",
              orderNo: input.orderNo,
              amount: input.amount,
              outstanding: input.outstanding,
            },
      userIds: [input.customerUserId],
    });
  }
  if (input.actorRole === "courier") {
    targets.push({
      event: {
        audience: "admin",
        kind: "payment_recorded",
        orderId: input.orderId,
        orderNo: input.orderNo,
        amount: input.amount,
        paymentMethodName: input.paymentMethodName,
        paymentStatus: input.paymentStatus,
        origin: input.origin,
        actorName: input.actorName,
      },
      admins: true,
    });
  }
  return targets;
}

export function lowStockTargets(input: { source: LowStockSource; items: LowStockItem[]; threshold: number }): NotifyTarget[] {
  if (input.items.length === 0) return [];
  return [
    {
      event: { audience: "admin", kind: "low_stock", source: input.source, items: input.items, threshold: input.threshold },
      admins: true,
    },
  ];
}

export function orderCreatedTargets(input: {
  orderId: number;
  orderNo: string;
  customerName: string;
  total: Money;
  fulfillment: FulfillmentType;
  zoneName: string | null;
  lowStock: { items: LowStockItem[]; threshold: number } | null;
}): NotifyTarget[] {
  const targets: NotifyTarget[] = [
    {
      event: {
        audience: "admin",
        kind: "order_created",
        orderId: input.orderId,
        orderNo: input.orderNo,
        customerName: input.customerName,
        total: input.total,
        fulfillment: input.fulfillment,
        zoneName: input.zoneName,
      },
      admins: true,
    },
  ];
  if (input.lowStock) {
    targets.push(
      ...lowStockTargets({
        source: { type: "order", orderNo: input.orderNo },
        items: input.lowStock.items,
        threshold: input.lowStock.threshold,
      })
    );
  }
  return targets;
}

export function courierAssignmentTargets(input: {
  mode: "assign" | "unassign";
  deliveryId: number;
  orderNo: string;
  isRetry: boolean;
  zoneName: string | null;
  newCourierUserId: number | null;
  previousCourierUserId: number | null;
}): NotifyTarget[] {
  const targets: NotifyTarget[] = [];
  if (input.mode === "assign" && input.newCourierUserId != null) {
    targets.push({
      event: {
        audience: "courier",
        kind: "delivery_assigned",
        deliveryId: input.deliveryId,
        orderNo: input.orderNo,
        isRetry: input.isRetry,
        zoneName: input.zoneName,
      },
      userIds: [input.newCourierUserId],
    });
  }
  const previousLeft =
    input.previousCourierUserId != null &&
    (input.mode === "unassign" || input.previousCourierUserId !== input.newCourierUserId);
  if (previousLeft) {
    targets.push({
      event: { audience: "courier", kind: "delivery_unassigned", orderNo: input.orderNo, reassigned: input.mode === "assign" },
      userIds: [input.previousCourierUserId],
    });
  }
  return targets;
}

export function courierPaymentTargets(input: { courierUserId: number; amount: Money; deliveryCount: number }): NotifyTarget[] {
  return [
    {
      event: { audience: "courier", kind: "courier_payment", amount: input.amount, deliveryCount: input.deliveryCount },
      userIds: [input.courierUserId],
    },
  ];
}
