import { z } from "zod";
import { isValidPhone } from "@/lib/phone";

export const customerNotesSchema = z.object({
  notes: z
    .union([z.literal(""), z.null(), z.string().trim().max(2000, "Máximo 2000 caracteres")])
    .transform((v) => (v === "" || v == null ? null : v)),
});

export type CustomerNotesInput = z.input<typeof customerNotesSchema>;
export type CustomerNotesValues = z.output<typeof customerNotesSchema>;

/** Lo que el propio cliente puede cambiar de su cuenta (el correo es su usuario). */
export const customerProfileSchema = z.object({
  fullName: z.string().trim().min(2, "Escribe tu nombre"),
  phone: z.string().trim().refine(isValidPhone, "Escribe un teléfono válido (7 a 15 dígitos)"),
});

export type CustomerProfileInput = z.input<typeof customerProfileSchema>;
export type CustomerProfileValues = z.output<typeof customerProfileSchema>;
