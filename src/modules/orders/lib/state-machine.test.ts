import { describe, expect, it } from "vitest";
import { ORDER_STATUSES, type OrderStatus } from "./labels";
import { canTransitionOrder, nextOrderStates, ORDER_TRANSITIONS } from "./state-machine";

const admin = { fulfillment: "delivery" as const, isOwner: false };
const owner = { fulfillment: "delivery" as const, isOwner: true };

describe("ORDER_TRANSITIONS", () => {
  it("delivered y cancelled son terminales", () => {
    expect(ORDER_TRANSITIONS.delivered).toEqual([]);
    expect(ORDER_TRANSITIONS.cancelled).toEqual([]);
  });

  it("cualquier par no listado se rechaza para todos los actores", () => {
    for (const from of ORDER_STATUSES) {
      for (const to of ORDER_STATUSES) {
        if (ORDER_TRANSITIONS[from].includes(to)) continue;
        for (const actor of ["admin", "customer", "system"] as const) {
          expect(canTransitionOrder(from, to, actor, owner).ok).toBe(false);
        }
      }
    }
  });
});

describe("admin", () => {
  it("confirma, marca listo y cancela", () => {
    expect(canTransitionOrder("pending", "confirmed", "admin", admin).ok).toBe(true);
    expect(canTransitionOrder("confirmed", "ready", "admin", admin).ok).toBe(true);
    expect(canTransitionOrder("confirmed", "cancelled", "admin", admin).ok).toBe(true);
  });

  it("solo entrega directo desde listo si es recogida", () => {
    expect(canTransitionOrder("ready", "delivered", "admin", admin).ok).toBe(false);
    expect(canTransitionOrder("ready", "delivered", "admin", { ...admin, fulfillment: "pickup" }).ok).toBe(true);
  });

  it("no puede cancelar con la entrega en camino", () => {
    expect(canTransitionOrder("ready", "cancelled", "admin", { ...admin, deliveryStatus: "in_transit" }).ok).toBe(false);
    expect(canTransitionOrder("ready", "cancelled", "admin", { ...admin, deliveryStatus: "assigned" }).ok).toBe(true);
  });

  it("no ejecuta las transiciones de reparto", () => {
    expect(canTransitionOrder("ready", "out_for_delivery", "admin", admin).ok).toBe(false);
    expect(canTransitionOrder("out_for_delivery", "delivered", "admin", admin).ok).toBe(false);
  });
});

describe("system", () => {
  it("solo mueve el reparto", () => {
    expect(canTransitionOrder("ready", "out_for_delivery", "system", admin).ok).toBe(true);
    expect(canTransitionOrder("out_for_delivery", "delivered", "system", admin).ok).toBe(true);
    expect(canTransitionOrder("out_for_delivery", "ready", "system", admin).ok).toBe(true);
    expect(canTransitionOrder("pending", "confirmed", "system", admin).ok).toBe(false);
  });
});

describe("customer", () => {
  it("solo cancela pendientes y solo los suyos", () => {
    expect(canTransitionOrder("pending", "cancelled", "customer", owner).ok).toBe(true);
    expect(canTransitionOrder("pending", "cancelled", "customer", admin).ok).toBe(false);
    expect(canTransitionOrder("confirmed", "cancelled", "customer", owner).ok).toBe(false);
  });
});

describe("nextOrderStates", () => {
  it("devuelve los botones correctos por actor", () => {
    expect(nextOrderStates("pending", "admin", admin)).toEqual<OrderStatus[]>(["confirmed", "cancelled"]);
    expect(nextOrderStates("ready", "admin", admin)).toEqual<OrderStatus[]>(["cancelled"]);
    expect(nextOrderStates("ready", "admin", { ...admin, fulfillment: "pickup" })).toEqual<OrderStatus[]>(["delivered", "cancelled"]);
    expect(nextOrderStates("pending", "customer", owner)).toEqual<OrderStatus[]>(["cancelled"]);
    expect(nextOrderStates("delivered", "admin", admin)).toEqual([]);
  });
});
