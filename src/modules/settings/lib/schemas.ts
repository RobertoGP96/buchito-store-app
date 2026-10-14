import { z } from "zod";
import { isValidPhone } from "@/lib/phone";

const optionalText = z
  .string()
  .trim()
  .transform((v) => (v === "" ? null : v))
  .nullable();

/** Teléfono opcional: "" (formulario) y null (ya transformado en el cliente,
 *  regla del doble parseo) son "sin número"; con valor exige 7 a 15 dígitos. */
const optionalPhone = optionalText.refine(
  (v) => v == null || isValidPhone(v),
  "Escribe un número de WhatsApp válido (7 a 15 dígitos, con código de país)"
);

const money = z.coerce.number().min(0, "No puede ser negativo");

export const storeSettingsSchema = z.object({
  storeName: z.string().trim().min(2, "Escribe el nombre de la tienda"),
  baseCurrencyId: z.coerce.number().int().positive("Elige la moneda base"),
  phone: optionalText,
  whatsappPhone: optionalPhone,
  email: optionalText,
  address: optionalText,
  orderPrefix: z.string().trim().min(1, "Escribe un prefijo").max(10, "Máximo 10 caracteres"),
  defaultShippingFee: money,
  freeShippingThreshold: z
    .union([z.literal(""), z.null(), z.coerce.number().min(0, "No puede ser negativo")])
    .transform((v) => (v === "" ? null : v)),
  lowStockThreshold: z.coerce.number().int().min(0, "No puede ser negativo"),
  allowPickup: z.boolean(),
});

export type StoreSettingsInput = z.input<typeof storeSettingsSchema>;
export type StoreSettingsValues = z.output<typeof storeSettingsSchema>;
