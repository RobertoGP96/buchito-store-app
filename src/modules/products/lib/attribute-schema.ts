import { z } from "zod";

/** Definición de un atributo de un tipo de producto (`ProductType.attributeSchema`).
 *  `scope` decide dónde se captura el valor: en el producto (material) o en
 *  cada variante (talla, color). */
export const ATTRIBUTE_KINDS = ["text", "number", "select", "boolean"] as const;
export type AttributeKind = (typeof ATTRIBUTE_KINDS)[number];

export const ATTRIBUTE_SCOPES = ["product", "variant"] as const;
export type AttributeScope = (typeof ATTRIBUTE_SCOPES)[number];

export const attributeDefSchema = z
  .object({
    key: z
      .string()
      .trim()
      .regex(/^[a-z][a-z0-9_]{0,30}$/, "Clave en minúsculas sin espacios (ej. talla, color_base)"),
    label: z.string().trim().min(1, "Escribe la etiqueta"),
    kind: z.enum(ATTRIBUTE_KINDS),
    options: z.array(z.string().trim().min(1)).optional(),
    required: z.boolean().default(false),
    scope: z.enum(ATTRIBUTE_SCOPES).default("product"),
  })
  .refine((def) => def.kind !== "select" || (def.options?.length ?? 0) > 0, {
    message: "Un atributo de tipo lista necesita al menos una opción",
    path: ["options"],
  });

export type AttributeDef = z.infer<typeof attributeDefSchema>;

export const attributeSchemaListSchema = z
  .array(attributeDefSchema)
  .refine((defs) => new Set(defs.map((d) => d.key)).size === defs.length, {
    message: "Las claves de los atributos deben ser únicas",
  });

export type AttributeValue = string | number | boolean;
export type AttributeValues = Record<string, AttributeValue>;

export const ATTRIBUTE_KIND_LABELS: Record<AttributeKind, string> = {
  text: "Texto",
  number: "Número",
  select: "Lista de opciones",
  boolean: "Sí / No",
};

export const ATTRIBUTE_SCOPE_LABELS: Record<AttributeScope, string> = {
  product: "Del producto",
  variant: "De cada variante",
};

/** Lee el JSON guardado en DB sin confiar en él: un tipo con esquema
 *  corrupto no debe tumbar el catálogo, solo perder sus atributos. */
export function parseAttributeSchema(raw: unknown): AttributeDef[] {
  const result = attributeSchemaListSchema.safeParse(raw);
  return result.success ? result.data : [];
}

export function parseAttributeValues(raw: unknown): AttributeValues {
  if (typeof raw !== "object" || raw === null || Array.isArray(raw)) return {};
  const out: AttributeValues = {};
  for (const [key, value] of Object.entries(raw)) {
    if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
      out[key] = value;
    }
  }
  return out;
}

export interface AttributeValidation {
  ok: boolean;
  errors: Record<string, string>;
  /** Valores normalizados (number parseado, booleans, select validado). */
  values: AttributeValues;
}

/** Valida los valores capturados contra el esquema para un `scope`. Los
 *  atributos desconocidos se descartan; los requeridos ausentes fallan. */
export function validateAttributes(
  schema: AttributeDef[],
  input: Record<string, unknown>,
  scope: AttributeScope
): AttributeValidation {
  const errors: Record<string, string> = {};
  const values: AttributeValues = {};

  for (const def of schema) {
    if (def.scope !== scope) continue;
    const raw = input[def.key];
    const empty = raw === undefined || raw === null || raw === "";

    if (empty) {
      if (def.required) errors[def.key] = `${def.label} es obligatorio`;
      continue;
    }

    switch (def.kind) {
      case "text": {
        values[def.key] = String(raw).trim();
        break;
      }
      case "number": {
        const n = typeof raw === "number" ? raw : Number(String(raw).replace(",", "."));
        if (!Number.isFinite(n)) errors[def.key] = `${def.label} debe ser un número`;
        else values[def.key] = n;
        break;
      }
      case "select": {
        const v = String(raw);
        if (!def.options?.includes(v)) errors[def.key] = `${def.label}: opción no válida`;
        else values[def.key] = v;
        break;
      }
      case "boolean": {
        values[def.key] = raw === true || raw === "true" || raw === "1";
        break;
      }
    }
  }

  return { ok: Object.keys(errors).length === 0, errors, values };
}

/** "Negro / M" a partir de los atributos de variante, en el orden del esquema. */
export function variantLabel(schema: AttributeDef[], attributes: AttributeValues): string {
  return schema
    .filter((def) => def.scope === "variant" && attributes[def.key] !== undefined)
    .map((def) => {
      const v = attributes[def.key];
      return typeof v === "boolean" ? (v ? def.label : `Sin ${def.label.toLowerCase()}`) : String(v);
    })
    .join(" / ");
}

/** Nombre visible de una variante: el explícito, si no el derivado de sus
 *  atributos y, en último caso, el SKU. */
export function variantDisplayName(
  variant: { name: string | null; sku: string; attributes: AttributeValues },
  schema: AttributeDef[]
): string {
  if (variant.name) return variant.name;
  return variantLabel(schema, variant.attributes) || variant.sku;
}
