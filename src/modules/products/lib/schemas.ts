import { z } from "zod";
import { attributeSchemaListSchema } from "./attribute-schema";
import { PRODUCT_STATUSES } from "./labels";
import { isValidStep, MAX_LINE_QTY, SALE_UNITS } from "./units";

const optionalText = z
  .string()
  .trim()
  .transform((v) => (v === "" ? null : v))
  .nullable();

export const productTypeSchema = z.object({
  name: z.string().trim().min(2, "Escribe el nombre"),
  slug: z
    .string()
    .trim()
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Slug en minúsculas con guiones (ej. ropa-hombre)"),
  description: optionalText,
  attributeSchema: attributeSchemaListSchema,
  isActive: z.boolean().default(true),
});

export type ProductTypeInput = z.input<typeof productTypeSchema>;
export type ProductTypeValues = z.output<typeof productTypeSchema>;

export const categorySchema = z.object({
  name: z.string().trim().min(2, "Escribe el nombre"),
  slug: z
    .string()
    .trim()
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Slug en minúsculas con guiones (ej. ropa-hombre)"),
  parentId: z
    .union([z.literal(""), z.null(), z.coerce.number().int().positive()])
    .transform((v) => (v === "" ? null : v))
    .nullable(),
  description: optionalText,
  sortOrder: z.coerce.number().int().min(0).default(0),
  isActive: z.boolean().default(true),
});

export type CategoryInput = z.input<typeof categorySchema>;
export type CategoryValues = z.output<typeof categorySchema>;

const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export const productSchema = z.object({
  typeId: z.coerce.number().int().positive("Elige el tipo de producto"),
  categoryId: z
    .union([z.literal(""), z.null(), z.coerce.number().int().positive()])
    .transform((v) => (v === "" ? null : v))
    .nullable(),
  name: z.string().trim().min(2, "Escribe el nombre"),
  // Vacío = la action lo deriva del nombre y garantiza que sea único.
  slug: z
    .string()
    .trim()
    .refine((v) => v === "" || SLUG_PATTERN.test(v), "Slug en minúsculas con guiones"),
  description: optionalText,
  attributes: z.record(z.string(), z.unknown()).default({}),
  status: z.enum(PRODUCT_STATUSES).default("draft"),
  featured: z.boolean().default(false),
  sortOrder: z.coerce.number().int().min(0).default(0),
});

export type ProductInput = z.input<typeof productSchema>;
export type ProductValues = z.output<typeof productSchema>;

export const variantSchema = z.object({
  productId: z.coerce.number().int().positive(),
  sku: z.string().trim().min(1, "Escribe el SKU").max(40),
  name: optionalText,
  attributes: z.record(z.string(), z.unknown()).default({}),
  // `z.coerce.number()` convertiría "" en 0 y guardaría la variante gratis.
  price: z
    .union([z.literal(""), z.coerce.number().min(0, "No puede ser negativo")])
    .refine((v) => v !== "", "Escribe el precio")
    .transform(Number),
  compareAtPrice: z
    .union([z.literal(""), z.null(), z.coerce.number().min(0)])
    .transform((v) => (v === "" ? null : v))
    .nullable(),
  priceCurrencyId: z.coerce.number().int().positive("Elige la moneda del precio"),
  // Costo de compra por unidad (opcional). Sin moneda propia se asume la del precio.
  cost: z
    .union([z.literal(""), z.null(), z.coerce.number().min(0, "El costo no puede ser negativo")])
    .transform((v) => (v === "" ? null : v))
    .nullable(),
  costCurrencyId: z
    .union([z.literal(""), z.null(), z.coerce.number().int().positive()])
    .transform((v) => (v === "" ? null : v))
    .nullable(),
  imageUrl: optionalText,
  // Unidad de venta y mínimo vendible (el precio es por 1 unidad de `unit`).
  unit: z.enum(SALE_UNITS).default("unit"),
  qtyStep: z
    .union([z.literal(""), z.null(), z.coerce.number().positive("El paso debe ser mayor que cero").max(MAX_LINE_QTY)])
    .transform((v) => (v === "" || v == null ? 1 : v)),
  isDefault: z.boolean().default(false),
  isActive: z.boolean().default(true),
  sortOrder: z.coerce.number().int().min(0).default(0),
  // Solo se usa al crear: genera el StockMovement "Stock inicial". Editar una
  // variante nunca toca el stock (eso es adjustStock).
  initialStock: z.coerce.number().min(0, "No puede ser negativo").default(0),
})
  .refine((v) => v.compareAtPrice == null || v.compareAtPrice > v.price, {
    message: "El precio anterior debe ser mayor que el precio actual",
    path: ["compareAtPrice"],
  })
  .refine((v) => isValidStep(v.qtyStep, v.unit), {
    message: "Si se vende por unidades, el paso debe ser un número entero",
    path: ["qtyStep"],
  });

export type VariantInput = z.input<typeof variantSchema>;
export type VariantValues = z.output<typeof variantSchema>;

export const stockAdjustmentSchema = z.object({
  variantId: z.coerce.number().int().positive(),
  type: z.enum(["entry", "exit", "adjustment"]),
  // En la unidad de la variante; admite decimales (0.5 kg).
  quantity: z.coerce.number().positive("La cantidad debe ser mayor que cero"),
  // Solo en entradas: precio de compra por unidad de esta compra; actualiza
  // el costo de la variante.
  unitCost: z
    .union([z.literal(""), z.null(), z.coerce.number().min(0, "El costo no puede ser negativo")])
    .transform((v) => (v === "" ? null : v))
    .nullable()
    .optional(),
  costCurrencyId: z
    .union([z.literal(""), z.null(), z.coerce.number().int().positive()])
    .transform((v) => (v === "" ? null : v))
    .nullable()
    .optional(),
  notes: optionalText,
});

export type StockAdjustmentInput = z.input<typeof stockAdjustmentSchema>;
