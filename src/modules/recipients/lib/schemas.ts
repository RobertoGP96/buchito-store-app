import { z } from "zod";
import { isValidPhone } from "@/lib/phone";

const optionalText = z
  .union([z.literal(""), z.null(), z.string().trim().max(200, "Máximo 200 caracteres")])
  .transform((v) => (v === "" || v == null ? null : v));

/** Destinatario guardado por el cliente: a quién se entrega y dónde. La
 *  ciudad no se pide: la zona de entrega ya la determina. */
export const recipientSchema = z.object({
  label: optionalText,
  name: z.string().trim().min(2, "Escribe el nombre de quien recibe"),
  phone: z.string().trim().refine(isValidPhone, "Escribe un teléfono válido"),
  line1: z.string().trim().min(3, "Escribe la dirección"),
  line2: optionalText,
  neighborhood: optionalText,
  reference: optionalText,
  zoneId: z
    .union([z.literal(""), z.null(), z.coerce.number().int().positive()])
    .transform((v) => (v === "" ? null : v))
    .nullable(),
  isDefault: z.boolean().default(false),
});

export type RecipientInput = z.input<typeof recipientSchema>;
export type RecipientValues = z.output<typeof recipientSchema>;
