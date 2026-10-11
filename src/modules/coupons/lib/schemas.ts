import { z } from "zod";
import { COUPON_KINDS } from "./labels";

const DAY_RE = /^\d{4}-\d{2}-\d{2}$/;

/** "YYYY-MM-DD" (del <input type="date">) → Date al inicio o al final de ese
 *  día en la zona horaria de quien parsea. El resolver de RHF transforma en
 *  el cliente, así que el límite queda en la hora local del admin; el
 *  servidor recibe ya un Date (o su ISO) y lo respeta tal cual. */
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

export const couponSchema = z
  .object({
    code: z
      .string()
      .trim()
      .toUpperCase()
      .regex(/^[A-Z0-9-]{3,20}$/, "Solo letras, números y guiones (3 a 20 caracteres)"),
    kind: z.enum(COUPON_KINDS, { message: "Elige el tipo de descuento" }),
    value: z.coerce.number({ message: "Escribe el descuento" }).positive("Debe ser mayor que 0"),
    minSubtotal: z
      .union([z.literal(""), z.null(), z.coerce.number().min(0, "No puede ser negativo")])
      .transform((v) => (v === "" ? null : v)),
    maxUses: z
      .union([z.literal(""), z.null(), z.coerce.number().int("Debe ser un número entero").min(1, "Mínimo 1 uso")])
      .transform((v) => (v === "" ? null : v)),
    startsAt: optionalDay("start"),
    endsAt: optionalDay("end"),
    isActive: z.boolean().default(true),
  })
  .superRefine((data, ctx) => {
    if (data.kind === "percent" && data.value > 100) {
      ctx.addIssue({ code: "custom", path: ["value"], message: "Un porcentaje no puede superar 100" });
    }
    if (data.startsAt && data.endsAt && data.endsAt < data.startsAt) {
      ctx.addIssue({ code: "custom", path: ["endsAt"], message: "La fecha de fin debe ser igual o posterior al inicio" });
    }
  });

export type CouponInput = z.input<typeof couponSchema>;
export type CouponValues = z.output<typeof couponSchema>;
