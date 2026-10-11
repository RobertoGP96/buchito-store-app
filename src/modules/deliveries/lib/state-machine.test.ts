import { describe, expect, it } from "vitest";
import { DELIVERY_STATUSES, type DeliveryStatus } from "./labels";
import {
  canTransitionDelivery,
  DELIVERY_TRANSITIONS,
  nextDeliveryStates,
  orderEffectFor,
} from "./state-machine";

const admin = { isAssignedCourier: false, courierId: 7 };
const courier = { isAssignedCourier: true };
const other = { isAssignedCourier: false };

describe("DELIVERY_TRANSITIONS", () => {
  it("delivered y cancelled son terminales", () => {
    expect(DELIVERY_TRANSITIONS.delivered).toEqual([]);
    expect(DELIVERY_TRANSITIONS.cancelled).toEqual([]);
  });

  it("cualquier par no listado se rechaza", () => {
    for (const from of DELIVERY_STATUSES) {
      for (const to of DELIVERY_STATUSES) {
        if (DELIVERY_TRANSITIONS[from].includes(to)) continue;
        for (const actor of ["admin", "courier", "system"] as const) {
          expect(canTransitionDelivery(from, to, actor, admin).ok).toBe(false);
        }
      }
    }
  });
});

describe("admin", () => {
  it("asigna (con mensajero), desasigna y re-asigna una fallida", () => {
    expect(canTransitionDelivery("pending", "assigned", "admin", admin).ok).toBe(true);
    expect(canTransitionDelivery("pending", "assigned", "admin", { ...admin, courierId: null }).ok).toBe(false);
    expect(canTransitionDelivery("assigned", "pending", "admin", admin).ok).toBe(true);
    expect(canTransitionDelivery("failed", "assigned", "admin", admin).ok).toBe(true);
  });

  it("puede recoger y entregar en nombre del mensajero", () => {
    expect(canTransitionDelivery("assigned", "in_transit", "admin", admin).ok).toBe(true);
    expect(canTransitionDelivery("in_transit", "delivered", "admin", admin).ok).toBe(true);
  });

  it("no cancela directamente", () => {
    expect(canTransitionDelivery("pending", "cancelled", "admin", admin).ok).toBe(false);
  });
});

describe("courier", () => {
  it("solo actúa sobre su entrega", () => {
    expect(canTransitionDelivery("assigned", "in_transit", "courier", courier).ok).toBe(true);
    expect(canTransitionDelivery("assigned", "in_transit", "courier", other).ok).toBe(false);
    expect(canTransitionDelivery("in_transit", "delivered", "courier", courier).ok).toBe(true);
  });

  it("fallida exige motivo", () => {
    expect(canTransitionDelivery("in_transit", "failed", "courier", courier).ok).toBe(false);
    expect(canTransitionDelivery("in_transit", "failed", "courier", { ...courier, failedReason: "Nadie en casa" }).ok).toBe(true);
  });

  it("no asigna ni desasigna", () => {
    expect(canTransitionDelivery("pending", "assigned", "courier", { ...courier, courierId: 1 }).ok).toBe(false);
    expect(canTransitionDelivery("assigned", "pending", "courier", courier).ok).toBe(false);
  });
});

describe("system", () => {
  it("solo cancela", () => {
    expect(canTransitionDelivery("assigned", "cancelled", "system", admin).ok).toBe(true);
    expect(canTransitionDelivery("in_transit", "delivered", "system", admin).ok).toBe(false);
  });
});

describe("nextDeliveryStates y efectos", () => {
  it("ofrece los botones correctos", () => {
    expect(nextDeliveryStates("pending", "admin", { isAssignedCourier: false })).toEqual<DeliveryStatus[]>(["assigned"]);
    expect(nextDeliveryStates("in_transit", "courier", courier)).toEqual<DeliveryStatus[]>(["delivered", "failed"]);
    expect(nextDeliveryStates("in_transit", "courier", other)).toEqual([]);
  });

  it("mapea el efecto sobre el pedido", () => {
    expect(orderEffectFor("in_transit")).toBe("out_for_delivery");
    expect(orderEffectFor("delivered")).toBe("delivered");
    expect(orderEffectFor("failed")).toBe("ready");
    expect(orderEffectFor("assigned")).toBeNull();
  });
});
