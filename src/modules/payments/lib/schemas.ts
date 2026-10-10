import { z } from "zod";
import { PAYMENT_KINDS } from "./labels";

const optionalText = z
  .string()
  .trim()
  .transform((v) => (v === "" ? null : v))
  .nullable();

export const paymentMethodSchema = z.object({
  code: z
    .string()
    .trim()
    .toLowerCase()
    .regex(/^[a-z0-9-]{2,40}$/, "Código en minúsculas, números y guiones (ej. cash-usd)"),
  name: z.string().trim().min(2, "Escribe el nombre"),
  kind: z.enum(PAYMENT_KINDS, { message: "Elige el tipo" }),
  currencyId: z.coerce.number().int().positive("Elige la moneda"),
  instructions: optionalText,
  requiresReference: z.boolean().default(false),
  surchargePercent: z
    .union([z.literal(""), z.coerce.number().min(0, "No puede ser negativo").max(100, "Máximo 100 %")])
    .transform((v) => (v === "" ? null : v)),
  sortOrder: z.coerce.number().int().min(0).default(0),
  isActive: z.boolean().default(true),
});

export type PaymentMethodInput = z.input<typeof paymentMethodSchema>;
export type PaymentMethodValues = z.output<typeof paymentMethodSchema>;

export const registerPaymentSchema = z.object({
  orderId: z.coerce.number().int().positive(),
  paymentMethodId: z.coerce.number().int().positive("Elige el método"),
  amountTendered: z.coerce.number().positive("El monto debe ser mayor que cero"),
  reference: optionalText,
  notes: optionalText,
});

export type RegisterPaymentInput = z.input<typeof registerPaymentSchema>;
export type RegisterPaymentValues = z.output<typeof registerPaymentSchema>;
