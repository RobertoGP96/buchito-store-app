import { describe, expect, it } from "vitest";
import { storeSettingsSchema } from "./schemas";

const valid = {
  storeName: "Buchito",
  baseCurrencyId: 1,
  phone: "",
  whatsappPhone: "",
  email: "",
  address: "",
  orderPrefix: "PED-",
  defaultShippingFee: 0,
  freeShippingThreshold: "",
  lowStockThreshold: 5,
  allowPickup: true,
};

describe("storeSettingsSchema.whatsappPhone", () => {
  it("vacío o null significan sin número (doble parseo)", () => {
    expect(storeSettingsSchema.parse({ ...valid, whatsappPhone: "" }).whatsappPhone).toBeNull();
    expect(storeSettingsSchema.parse({ ...valid, whatsappPhone: null }).whatsappPhone).toBeNull();
  });

  it("recorta y guarda el número tal cual lo escribe el admin", () => {
    expect(storeSettingsSchema.parse({ ...valid, whatsappPhone: " +53 5 123 4567 " }).whatsappPhone).toBe(
      "+53 5 123 4567"
    );
  });

  it("rechaza un número con menos de 7 dígitos", () => {
    const result = storeSettingsSchema.safeParse({ ...valid, whatsappPhone: "123" });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0]?.message).toBe(
        "Escribe un número de WhatsApp válido (7 a 15 dígitos, con código de país)"
      );
    }
  });
});
