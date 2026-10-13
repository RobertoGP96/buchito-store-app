import { describe, expect, it } from "vitest";
import { createOrderSchema } from "./schemas";

const lines = [{ variantId: 1, qty: 1 }];
const recipient = {
  name: "Ana Pérez",
  phone: "+53 5 123 4567",
  line1: "Calle 23 #456",
  line2: "",
  neighborhood: "",
  city: "La Habana",
  reference: "",
};
const base = { paymentMethodId: 1, paymentReference: "", couponCode: "", notes: "", lines, combos: [] };

function firstMessage(result: ReturnType<typeof createOrderSchema.safeParse>): string | undefined {
  return result.success ? undefined : result.error.issues[0]?.message;
}

describe("createOrderSchema", () => {
  it("recogida en tienda no necesita zona ni destinatario", () => {
    const result = createOrderSchema.safeParse({
      ...base,
      fulfillment: "pickup",
      zoneId: "",
      recipientId: "",
      newRecipient: null,
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.zoneId).toBeNull();
      expect(result.data.recipientId).toBeNull();
      expect(result.data.newRecipient).toBeNull();
    }
  });

  it("la entrega exige zona", () => {
    const result = createOrderSchema.safeParse({
      ...base,
      fulfillment: "delivery",
      zoneId: "",
      recipientId: 3,
      newRecipient: null,
    });
    expect(result.success).toBe(false);
    expect(firstMessage(result)).toBe("Elige la zona de entrega");
  });

  it("acepta un destinatario guardado y convierte su id", () => {
    const result = createOrderSchema.safeParse({
      ...base,
      fulfillment: "delivery",
      zoneId: "2",
      recipientId: "12",
      newRecipient: null,
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.zoneId).toBe(2);
      expect(result.data.recipientId).toBe(12);
    }
  });

  it("acepta un destinatario nuevo y normaliza los opcionales vacíos", () => {
    const result = createOrderSchema.safeParse({
      ...base,
      fulfillment: "delivery",
      zoneId: 2,
      recipientId: null,
      newRecipient: recipient,
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.recipientId).toBeNull();
      expect(result.data.newRecipient).toEqual({
        name: "Ana Pérez",
        phone: "+53 5 123 4567",
        line1: "Calle 23 #456",
        line2: null,
        neighborhood: null,
        city: "La Habana",
        reference: null,
      });
    }
  });

  it("la entrega sin destinatario se rechaza", () => {
    const result = createOrderSchema.safeParse({
      ...base,
      fulfillment: "delivery",
      zoneId: 2,
      recipientId: "",
      newRecipient: null,
    });
    expect(result.success).toBe(false);
    expect(firstMessage(result)).toBe("Elige un destinatario o añade uno nuevo");
  });

  it("un destinatario guardado y uno nuevo a la vez se rechazan", () => {
    const result = createOrderSchema.safeParse({
      ...base,
      fulfillment: "delivery",
      zoneId: 2,
      recipientId: 5,
      newRecipient: recipient,
    });
    expect(result.success).toBe(false);
    expect(firstMessage(result)).toBe("Elige un destinatario o añade uno nuevo");
  });

  it("un destinatario nuevo incompleto falla con su propio mensaje", () => {
    const result = createOrderSchema.safeParse({
      ...base,
      fulfillment: "delivery",
      zoneId: 2,
      recipientId: "",
      newRecipient: { ...recipient, name: "" },
    });
    expect(result.success).toBe(false);
    expect(firstMessage(result)).toBe("Escribe el nombre del destinatario");
  });

  it("el carrito vacío se rechaza", () => {
    const result = createOrderSchema.safeParse({
      ...base,
      lines: [],
      fulfillment: "pickup",
      zoneId: "",
      recipientId: "",
      newRecipient: null,
    });
    expect(result.success).toBe(false);
    expect(firstMessage(result)).toBe("El carrito está vacío");
  });
});
