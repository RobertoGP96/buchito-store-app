import { describe, expect, it } from "vitest";
import {
  courierAssignmentTargets,
  deliveryTransitionTargets,
  orderCreatedTargets,
  orderPaymentTargets,
  orderTransitionTargets,
  type NotifyTarget,
} from "./targets";

const CUP = { code: "CUP", decimalPlaces: 0 };
const order = { orderId: 12, orderNo: "PED-00012", fulfillment: "delivery" as const, customerUserId: 5, customerName: "Cliente" };

function summary(targets: NotifyTarget[]) {
  return targets.map((t) => `${t.event.audience}:${t.event.kind}${t.admins ? "*" : ""}`);
}

describe("orderTransitionTargets", () => {
  it("confirmar avisa solo al cliente", () => {
    const t = orderTransitionTargets({ from: "pending", to: "confirmed", actor: "admin", reason: null, order, delivery: null });
    expect(summary(t)).toEqual(["customer:order_confirmed"]);
    expect(t[0].userIds).toEqual([5]);
  });

  it("volver a listo desde en camino es una entrega fallida para el cliente", () => {
    const t = orderTransitionTargets({ from: "out_for_delivery", to: "ready", actor: "system", reason: "No estaba", order, delivery: null });
    expect(summary(t)).toEqual(["customer:order_delivery_failed"]);
  });

  it("listo normal lleva el tipo de entrega", () => {
    const t = orderTransitionTargets({ from: "confirmed", to: "ready", actor: "admin", reason: null, order, delivery: null });
    expect(t[0].event).toMatchObject({ kind: "order_ready", fulfillment: "delivery" });
  });

  it("en camino lleva el nombre del mensajero", () => {
    const t = orderTransitionTargets({
      from: "ready",
      to: "out_for_delivery",
      actor: "system",
      reason: null,
      order,
      delivery: { deliveryId: 7, status: "assigned", courierUserId: 9, courierName: "Ana" },
    });
    expect(t[0].event).toMatchObject({ kind: "order_out_for_delivery", courierName: "Ana" });
  });

  it("el cliente que cancela avisa a los admins", () => {
    const t = orderTransitionTargets({ from: "pending", to: "cancelled", actor: "customer", reason: "Me equivoqué", order, delivery: null });
    expect(summary(t)).toEqual(["customer:order_cancelled", "admin:order_cancelled*"]);
  });

  it("el admin que cancela con entrega asignada avisa al cliente y al mensajero", () => {
    const t = orderTransitionTargets({
      from: "ready",
      to: "cancelled",
      actor: "admin",
      reason: "Sin stock",
      order,
      delivery: { deliveryId: 7, status: "assigned", courierUserId: 9, courierName: "Ana" },
    });
    expect(summary(t)).toEqual(["customer:order_cancelled", "courier:delivery_cancelled"]);
    expect(t[1].userIds).toEqual([9]);
  });

  it("una entrega fallida no avisa al mensajero al cancelar", () => {
    const t = orderTransitionTargets({
      from: "ready",
      to: "cancelled",
      actor: "admin",
      reason: null,
      order,
      delivery: { deliveryId: 7, status: "failed", courierUserId: 9, courierName: "Ana" },
    });
    expect(summary(t)).toEqual(["customer:order_cancelled"]);
  });
});

describe("deliveryTransitionTargets", () => {
  const base = { orderId: 12, orderNo: "PED-00012", courierName: "Ana", failedReason: null };

  it("los pasos del mensajero avisan a los admins", () => {
    expect(summary(deliveryTransitionTargets({ ...base, actor: "courier", to: "in_transit" }))).toEqual(["admin:delivery_in_transit*"]);
    expect(summary(deliveryTransitionTargets({ ...base, actor: "courier", to: "delivered" }))).toEqual(["admin:delivery_delivered*"]);
    expect(summary(deliveryTransitionTargets({ ...base, actor: "courier", to: "failed" }))).toEqual(["admin:delivery_failed*"]);
  });

  it("lo que hace un admin no genera avisos de reparto", () => {
    expect(deliveryTransitionTargets({ ...base, actor: "admin", to: "delivered" })).toEqual([]);
  });
});

describe("orderPaymentTargets", () => {
  const base = {
    origin: "manual" as const,
    actorName: "Ana",
    orderId: 12,
    orderNo: "PED-00012",
    customerUserId: 5,
    amount: { amount: 1000, currency: CUP },
    outstanding: { amount: 3750, currency: CUP },
    paymentMethodName: "Efectivo",
    paymentStatus: "partial" as const,
  };

  it("cobro del admin: solo el cliente", () => {
    expect(summary(orderPaymentTargets({ ...base, actorRole: "admin" }))).toEqual(["customer:payment_recorded"]);
  });

  it("cobro del mensajero: cliente y admins", () => {
    expect(summary(orderPaymentTargets({ ...base, actorRole: "courier", origin: "cash_on_delivery" }))).toEqual([
      "customer:payment_recorded",
      "admin:payment_recorded*",
    ]);
  });

  it("pagado por completo avisa de pedido pagado", () => {
    expect(summary(orderPaymentTargets({ ...base, actorRole: "admin", paymentStatus: "paid" }))).toEqual(["customer:order_paid"]);
  });

  it("un pedido reembolsado no avisa al cliente", () => {
    expect(summary(orderPaymentTargets({ ...base, actorRole: "admin", paymentStatus: "refunded" }))).toEqual([]);
  });
});

describe("orderCreatedTargets", () => {
  const base = {
    orderId: 12,
    orderNo: "PED-00012",
    customerName: "Cliente",
    total: { amount: 4750, currency: CUP },
    fulfillment: "delivery" as const,
    zoneName: "Centro",
  };

  it("pedido nuevo sin stock bajo: un aviso", () => {
    expect(summary(orderCreatedTargets({ ...base, lowStock: null }))).toEqual(["admin:order_created*"]);
    expect(summary(orderCreatedTargets({ ...base, lowStock: { items: [], threshold: 5 } }))).toEqual(["admin:order_created*"]);
  });

  it("con stock bajo: un aviso más que agrupa las variantes", () => {
    const t = orderCreatedTargets({
      ...base,
      lowStock: { items: [{ variantId: 1, productId: 2, label: "A", stockAfter: 3, unit: "unit", level: "low" }], threshold: 5 },
    });
    expect(summary(t)).toEqual(["admin:order_created*", "admin:low_stock*"]);
    expect(t[1].event).toMatchObject({ source: { type: "order", orderNo: "PED-00012" } });
  });
});

describe("courierAssignmentTargets", () => {
  const base = { deliveryId: 7, orderNo: "PED-00012", isRetry: false, zoneName: null };

  it("asignar por primera vez: solo el nuevo", () => {
    expect(summary(courierAssignmentTargets({ ...base, mode: "assign", newCourierUserId: 9, previousCourierUserId: null }))).toEqual([
      "courier:delivery_assigned",
    ]);
  });

  it("reasignar a otro: avisa al nuevo y al anterior", () => {
    const t = courierAssignmentTargets({ ...base, mode: "assign", newCourierUserId: 9, previousCourierUserId: 8 });
    expect(summary(t)).toEqual(["courier:delivery_assigned", "courier:delivery_unassigned"]);
    expect(t[1].event).toMatchObject({ reassigned: true });
    expect(t[1].userIds).toEqual([8]);
  });

  it("reasignar al mismo: un solo aviso", () => {
    expect(courierAssignmentTargets({ ...base, mode: "assign", newCourierUserId: 9, previousCourierUserId: 9 })).toHaveLength(1);
  });

  it("desasignar avisa al anterior", () => {
    const t = courierAssignmentTargets({ ...base, mode: "unassign", newCourierUserId: null, previousCourierUserId: 8 });
    expect(summary(t)).toEqual(["courier:delivery_unassigned"]);
    expect(t[0].event).toMatchObject({ reassigned: false });
  });
});
