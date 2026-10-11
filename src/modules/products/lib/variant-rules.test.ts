import { describe, expect, it } from "vitest";
import type { AttributeDef } from "./attribute-schema";
import {
  firstAttributeError,
  nextAvailableSlug,
  resolveIsDefault,
  resolveVariantName,
} from "./variant-rules";

const schema: AttributeDef[] = [
  { key: "talla", label: "Talla", kind: "select", options: ["S", "M"], required: true, scope: "variant" },
  { key: "color", label: "Color", kind: "text", required: false, scope: "variant" },
  { key: "material", label: "Material", kind: "text", required: false, scope: "product" },
];

describe("nextAvailableSlug", () => {
  it("devuelve la base si está libre", () => {
    expect(nextAvailableSlug("camisa", [])).toBe("camisa");
    expect(nextAvailableSlug("camisa", ["camisa-roja", "pantalon"])).toBe("camisa");
  });

  it("añade -2, -3… saltando los ocupados", () => {
    expect(nextAvailableSlug("camisa", ["camisa"])).toBe("camisa-2");
    expect(nextAvailableSlug("camisa", new Set(["camisa", "camisa-2", "camisa-3"]))).toBe("camisa-4");
    expect(nextAvailableSlug("camisa", ["camisa", "camisa-3"])).toBe("camisa-2");
  });
});

describe("resolveVariantName", () => {
  it("prefiere el nombre explícito", () => {
    expect(resolveVariantName("Edición especial", schema, { talla: "M" })).toBe("Edición especial");
  });

  it("deriva el nombre de los atributos de variante en el orden del esquema", () => {
    expect(resolveVariantName(null, schema, { color: "Negro", talla: "M" })).toBe("M / Negro");
  });

  it("es null sin nombre ni atributos de variante", () => {
    expect(resolveVariantName(null, schema, {})).toBeNull();
    expect(resolveVariantName(null, schema, { material: "Algodón" })).toBeNull();
  });
});

describe("resolveIsDefault", () => {
  it("la primera variante siempre es predeterminada", () => {
    expect(resolveIsDefault(false, 0)).toBe(true);
    expect(resolveIsDefault(true, 0)).toBe(true);
  });

  it("después respeta lo pedido", () => {
    expect(resolveIsDefault(false, 2)).toBe(false);
    expect(resolveIsDefault(true, 2)).toBe(true);
  });
});

describe("firstAttributeError", () => {
  it("devuelve el primer mensaje o null", () => {
    expect(firstAttributeError({ talla: "Talla es obligatorio", color: "x" })).toBe("Talla es obligatorio");
    expect(firstAttributeError({})).toBeNull();
  });
});
