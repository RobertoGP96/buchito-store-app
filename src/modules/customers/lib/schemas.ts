import { z } from "zod";

export const customerNotesSchema = z.object({
  notes: z
    .union([z.literal(""), z.null(), z.string().trim().max(2000, "Máximo 2000 caracteres")])
    .transform((v) => (v === "" || v == null ? null : v)),
});

export type CustomerNotesInput = z.input<typeof customerNotesSchema>;
export type CustomerNotesValues = z.output<typeof customerNotesSchema>;
