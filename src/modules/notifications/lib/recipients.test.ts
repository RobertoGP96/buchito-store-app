import { describe, expect, it } from "vitest";
import { candidateUserIds, planNotifications } from "./recipients";
import type { NotifyTarget } from "./targets";

const customerTarget: NotifyTarget = {
  event: { audience: "customer", kind: "order_confirmed", orderNo: "P-1" },
  userIds: [5, null, undefined, 5],
};
const adminTarget: NotifyTarget = {
  event: { audience: "admin", kind: "order_cancelled", orderId: 1, orderNo: "P-1", customerName: "C", reason: null },
  admins: true,
};

describe("candidateUserIds", () => {
  it("une directos y admins, sin nulos, repetidos ni actor", () => {
    expect(candidateUserIds([customerTarget, adminTarget], [1, 2], 2).sort()).toEqual([1, 5]);
  });

  it("vacío si solo queda el actor", () => {
    expect(candidateUserIds([customerTarget], [], 5)).toEqual([]);
  });
});

describe("planNotifications", () => {
  it("un aviso por destinatario y target, sin el actor", () => {
    const rows = planNotifications([customerTarget, adminTarget], { adminUserIds: [1, 2], actorUserId: 5, mutedByUser: new Map() });
    expect(rows.map((r) => [r.userId, r.draft.kind])).toEqual([
      [1, "order_cancelled"],
      [2, "order_cancelled"],
    ]);
  });

  it("respeta la categoría silenciada solo de quien la silenció", () => {
    const rows = planNotifications([adminTarget], {
      adminUserIds: [1, 2],
      actorUserId: null,
      mutedByUser: new Map([[1, ["orders"]]]),
    });
    expect(rows.map((r) => r.userId)).toEqual([2]);
  });

  it("silenciar otra categoría no afecta", () => {
    const rows = planNotifications([customerTarget], {
      adminUserIds: [],
      actorUserId: null,
      mutedByUser: new Map([[5, ["payments"]]]),
    });
    expect(rows).toHaveLength(1);
  });

  it("cliente invitado: nada", () => {
    const guest: NotifyTarget = { ...customerTarget, userIds: [null] };
    expect(planNotifications([guest], { adminUserIds: [], actorUserId: null, mutedByUser: new Map() })).toEqual([]);
  });
});
