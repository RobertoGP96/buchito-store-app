import { describe, expect, it } from "vitest";
import { courierProfileSchema, deliveryProofSchema, transitionDeliverySchema } from "./schemas";

const PROOF = "/media/proofs/0f8fad5b-d9cb-469f-a165-70867728950e.jpg";
const base = { deliveryId: 1, version: 0, to: "delivered" as const, failedReason: "", amountCollected: "", note: "" };

describe("transitionDeliverySchema", () => {
  it("acepta la foto de prueba subida a nuestro bucket", () => {
    const result = transitionDeliverySchema.safeParse({ ...base, proofPhotoUrl: PROOF });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.proofPhotoUrl).toBe(PROOF);
  });

  it("sin foto: vacío y null valen lo mismo (doble parseo)", () => {
    for (const value of ["", null]) {
      const result = transitionDeliverySchema.safeParse({ ...base, proofPhotoUrl: value });
      expect(result.success).toBe(true);
      if (result.success) expect(result.data.proofPhotoUrl).toBeNull();
    }
  });

  it("rechaza una URL ajena como prueba", () => {
    const result = transitionDeliverySchema.safeParse({ ...base, proofPhotoUrl: "https://example.com/foto.jpg" });
    expect(result.success).toBe(false);
  });

  it("el monto cobrado vacío pasa a null", () => {
    const result = transitionDeliverySchema.safeParse({ ...base, proofPhotoUrl: null, amountCollected: "" });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.amountCollected).toBeNull();
  });
});

describe("deliveryProofSchema", () => {
  it("exige la foto", () => {
    expect(deliveryProofSchema.safeParse({ deliveryId: 3, version: 2, proofPhotoUrl: "" }).success).toBe(false);
    expect(deliveryProofSchema.safeParse({ deliveryId: 3, version: 2, proofPhotoUrl: PROOF }).success).toBe(true);
  });
});

describe("courierProfileSchema", () => {
  it("valida nombre y teléfono", () => {
    expect(courierProfileSchema.safeParse({ fullName: "A", phone: "+53 5 123 4567" }).success).toBe(false);
    expect(courierProfileSchema.safeParse({ fullName: "Ana", phone: "12" }).success).toBe(false);
    expect(courierProfileSchema.safeParse({ fullName: "  Ana Pérez ", phone: "+53 5 123 4567" })).toMatchObject({
      success: true,
      data: { fullName: "Ana Pérez" },
    });
  });
});
