import { z } from "zod";
import { attributeSchemaListSchema } from "./attribute-schema";
import { PRODUCT_STATUSES } from "./labels";

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
    .union([z.literal(""), z.coerce.number().int().positive()])
    .transform((v) => (v === "" ? null : v))
    .nullable(),
  description: optionalText,
  sortOrder: z.coerce.number().int().min(0).default(0),
  isActive: z.boolean().default(true),
});

export type CategoryInput = z.input<typeof categorySchema>;
export type CategoryValues = z.output<typeof categorySchema>;

export const productSchema = z.object({
  typeId: z.coerce.number().int().positive("Elige el tipo de producto"),
  categoryId: z
    .union([z.literal(""), z.coerce.number().int().positive()])
    .transform((v) => (v === "" ? null : v))
    .nullable(),
  name: z.string().trim().min(2, "Escribe el nombre"),
  slug: z
    .string()
    .trim()
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Slug en minúsculas con guiones"),
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
  price: z.coerce.number().min(0, "No puede ser negativo"),
  compareAtPrice: z
    .union([z.literal(""), z.coerce.number().min(0)])
    .transform((v) => (v === "" ? null : v))
    .nullable(),
  priceCurrencyId: z.coerce.number().int().positive("Elige la moneda del precio"),
  imageUrl: optionalText,
  isDefault: z.boolean().default(false),
  isActive: z.boolean().default(true),
  sortOrder: z.coerce.number().int().min(0).default(0),
});

export type VariantInput = z.input<typeof variantSchema>;
export type VariantValues = z.output<typeof variantSchema>;

export const stockAdjustmentSchema = z.object({
  variantId: z.coerce.number().int().positive(),
  type: z.enum(["entry", "exit", "adjustment"]),
  quantity: z.coerce.number().int().positive("La cantidad debe ser mayor que cero"),
  notes: optionalText,
});

export type StockAdjustmentInput = z.input<typeof stockAdjustmentSchema>;
