import { describe, expect, it } from "vitest";
import {
  parseAttributeSchema,
  validateAttributes,
  variantLabel,
  type AttributeDef,
} from "./attribute-schema";

const schema: AttributeDef[] = [
  { key: "talla", label: "Talla", kind: "select", options: ["S", "M"], required: true, scope: "variant" },
  { key: "color", label: "Color", kind: "select", options: ["Negro"], required: true, scope: "variant" },
  { key: "peso", label: "Peso", kind: "number", required: false, scope: "product" },
  { key: "material", label: "Material", kind: "text", required: false, scope: "product" },
  { key: "eco", label: "Ecológico", kind: "boolean", required: false, scope: "product" },
];

describe("parseAttributeSchema", () => {
  it("acepta un esquema válido", () => {
    expect(parseAttributeSchema(schema)).toHaveLength(5);
  });

  it("devuelve vacío ante JSON corrupto o claves repetidas", () => {
    expect(parseAttributeSchema("nope")).toEqual([]);
    expect(parseAttributeSchema([schema[0], schema[0]])).toEqual([]);
  });

  it("rechaza select sin opciones", () => {
    expect(parseAttributeSchema([{ key: "x", label: "X", kind: "select", scope: "product" }])).toEqual([]);
  });
});

describe("validateAttributes", () => {
  it("exige los requeridos del scope y descarta claves desconocidas", () => {
    const result = validateAttributes(schema, { talla: "M", otra: "x" }, "variant");
    expect(result.ok).toBe(false);
    expect(result.errors).toHaveProperty("color");
    expect(result.values).toEqual({ talla: "M" });
  });

  it("normaliza números, booleanos y texto", () => {
    const result = validateAttributes(schema, { peso: "1,5", material: " Algodón ", eco: "true" }, "product");
    expect(result.ok).toBe(true);
    expect(result.values).toEqual({ peso: 1.5, material: "Algodón", eco: true });
  });

  it("rechaza opciones fuera de la lista y números inválidos", () => {
    expect(validateAttributes(schema, { talla: "XL", color: "Negro" }, "variant").errors).toHaveProperty("talla");
    expect(validateAttributes(schema, { peso: "abc" }, "product").errors).toHaveProperty("peso");
  });
});

describe("variantLabel", () => {
  it("une los atributos de variante en el orden del esquema", () => {
    expect(variantLabel(schema, { color: "Negro", talla: "M" })).toBe("M / Negro");
  });
});
