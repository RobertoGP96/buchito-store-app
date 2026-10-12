import { z } from "zod";
import { PRODUCT_STATUSES } from "@/modules/products/lib/labels";

const optionalText = z
  .string()
  .trim()
  .transform((v) => (v === "" ? null : v))
  .nullable();

const DAY_RE = /^\d{4}-\d{2}-\d{2}$/;
const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

/** "YYYY-MM-DD" del <input type="date"> → Date al inicio o al final de ese
 *  día en la zona horaria de quien parsea (el resolver de RHF, en el cliente). */
function dayBoundary(value: string, edge: "start" | "end"): Date {
  const [y, m, d] = value.split("-").map(Number);
  return edge === "start" ? new Date(y, m - 1, d, 0, 0, 0, 0) : new Date(y, m - 1, d, 23, 59, 59, 999);
}

function optionalDay(edge: "start" | "end") {
  return z
    .union([
      z.literal(""),
      z.null(),
      z.date(),
      z.string().trim().refine((v) => DAY_RE.test(v) || !Number.isNaN(Date.parse(v)), "Fecha inválida"),
    ])
    .transform((v): Date | null => {
      if (v === "" || v == null) return null;
      if (v instanceof Date) return v;
      return DAY_RE.test(v) ? dayBoundary(v, edge) : new Date(v);
    });
}

export const comboItemSchema = z.object({
  variantId: z.coerce.number().int().positive("Elige un producto"),
  qty: z.coerce.number().int("Debe ser un número entero").positive("La cantidad debe ser mayor que cero").max(99),
});

export type ComboItemInput = z.input<typeof comboItemSchema>;

export const comboSchema = z
  .object({
    name: z.string().trim().min(2, "Escribe el nombre"),
    // Vacío = la action lo deriva del nombre y garantiza que sea único.
    slug: z
      .string()
      .trim()
      .refine((v) => v === "" || SLUG_PATTERN.test(v), "Slug en minúsculas con guiones"),
    description: optionalText,
    imageUrl: optionalText,
    // `z.coerce.number()` convertiría "" en 0 y guardaría el combo gratis.
    price: z
      .union([z.literal(""), z.coerce.number().min(0, "No puede ser negativo")])
      .refine((v) => v !== "", "Escribe el precio del combo")
      .transform(Number),
    priceCurrencyId: z.coerce.number().int().positive("Elige la moneda del precio"),
    status: z.enum(PRODUCT_STATUSES).default("draft"),
    featured: z.boolean().default(false),
    startsAt: optionalDay("start"),
    endsAt: optionalDay("end"),
    sortOrder: z.coerce.number().int().min(0).default(0),
    items: z.array(comboItemSchema).min(1, "Añade al menos un producto al combo"),
  })
  .superRefine((data, ctx) => {
    if (data.startsAt && data.endsAt && data.endsAt < data.startsAt) {
      ctx.addIssue({ code: "custom", path: ["endsAt"], message: "La fecha de fin debe ser igual o posterior al inicio" });
    }
    const seen = new Set<number>();
    data.items.forEach((item, index) => {
      if (seen.has(item.variantId)) {
        ctx.addIssue({
          code: "custom",
          path: ["items", index, "variantId"],
          message: "Ese producto ya está en el combo: súbele la cantidad",
        });
      }
      seen.add(item.variantId);
    });
  });

export type ComboInput = z.input<typeof comboSchema>;
export type ComboValues = z.output<typeof comboSchema>;
