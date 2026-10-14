import { describe, expect, it } from "vitest";
import { ORDER_STATUSES, orderScreenCopy } from "./labels";

describe("orderScreenCopy", () => {
  it("solo el pendiente se presenta como pedido recibido", () => {
    expect(orderScreenCopy("pending", "delivery").eyebrow).toBe("Pedido recibido");
    for (const status of ORDER_STATUSES.filter((s) => s !== "pending")) {
      const copy = orderScreenCopy(status, "delivery");
      expect(copy.eyebrow).not.toBe("Pedido recibido");
      expect(copy.description.length).toBeGreaterThan(0);
    }
  });

  it("listo distingue recogida y domicilio", () => {
    expect(orderScreenCopy("ready", "pickup").eyebrow).toBe("Listo para recoger");
    expect(orderScreenCopy("ready", "delivery").eyebrow).toBe("Pedido listo");
  });
});
