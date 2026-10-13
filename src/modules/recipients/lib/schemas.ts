import { z } from "zod";
import { isValidPhone } from "@/lib/phone";

const optionalText = z
  .string()
  .trim()
  .transform((v) => (v === "" ? null : v))
  .nullable();

/** Destinatario de una entrega: a quién se le lleva el pedido y dónde. Es
 *  una fila de `customer_addresses`. Objeto plano, sin `.refine`, para que el
 *  checkout pueda hacer `.omit` sobre él. */
export const recipientSchema = z.object({
  name: z.string().trim().min(2, "Escribe el nombre del destinatario"),
  phone: z.string().trim().refine(isValidPhone, "Escribe un teléfono válido"),
  line1: z.string().trim().min(3, "Escribe la dirección"),
  line2: optionalText,
  neighborhood: optionalText,
  city: z.string().trim().min(2, "Escribe la ciudad"),
  reference: optionalText,
  zoneId: z
    .union([z.literal(""), z.null(), z.coerce.number().int().positive()])
    .transform((v) => (v === "" ? null : v))
    .nullable(),
  isDefault: z.boolean().default(false),
});

export type RecipientInput = z.input<typeof recipientSchema>;
export type RecipientValues = z.output<typeof recipientSchema>;
