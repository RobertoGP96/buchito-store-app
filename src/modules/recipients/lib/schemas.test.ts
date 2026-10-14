import { describe, expect, it } from "vitest";
import { recipientSchema } from "./schemas";

const valid = {
  name: "Ana Pérez",
  phone: "+53 5 123 4567",
  line1: "Calle 23 #456",
  line2: "",
  neighborhood: "",
  reference: "",
  zoneId: "",
};

describe("recipientSchema", () => {
  it("normaliza los opcionales vacíos, la zona y el principal", () => {
    const result = recipientSchema.safeParse(valid);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.line2).toBeNull();
      expect(result.data.neighborhood).toBeNull();
      expect(result.data.reference).toBeNull();
      expect(result.data.zoneId).toBeNull();
      expect(result.data.isDefault).toBe(false);
    }
  });

  it("convierte la zona elegida a número y acepta null (resolver del cliente)", () => {
    const chosen = recipientSchema.safeParse({ ...valid, zoneId: "4", isDefault: true });
    expect(chosen.success).toBe(true);
    if (chosen.success) {
      expect(chosen.data.zoneId).toBe(4);
      expect(chosen.data.isDefault).toBe(true);
    }
    const none = recipientSchema.safeParse({ ...valid, zoneId: null, line2: null });
    expect(none.success).toBe(true);
    if (none.success) expect(none.data.zoneId).toBeNull();
  });

  it("exige nombre, teléfono válido y dirección", () => {
    const name = recipientSchema.safeParse({ ...valid, name: "A" });
    expect(name.success).toBe(false);
    if (!name.success) expect(name.error.issues[0]?.message).toBe("Escribe el nombre del destinatario");

    const phone = recipientSchema.safeParse({ ...valid, phone: "123" });
    expect(phone.success).toBe(false);
    if (!phone.success) expect(phone.error.issues[0]?.message).toBe("Escribe un teléfono válido");

    expect(recipientSchema.safeParse({ ...valid, line1: "" }).success).toBe(false);
  });
});
