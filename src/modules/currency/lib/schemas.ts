import { z } from "zod";

export const currencySchema = z.object({
  code: z
    .string()
    .trim()
    .toUpperCase()
    .regex(/^[A-Z]{3,5}$/, "Código de 3 a 5 letras (CUP, USD, MLC)"),
  name: z.string().trim().min(2, "Escribe el nombre"),
  symbol: z.string().trim().min(1, "Escribe el símbolo").max(5, "Máximo 5 caracteres"),
  decimalPlaces: z.coerce.number().int().min(0).max(8, "Entre 0 y 8"),
  sortOrder: z.coerce.number().int().min(0).default(0),
  isActive: z.boolean().default(true),
});

export type CurrencyInput = z.input<typeof currencySchema>;
export type CurrencyValues = z.output<typeof currencySchema>;

export const rateSchema = z.object({
  /** Moneda origen; la tasa siempre va hacia la moneda base. */
  currencyId: z.coerce.number().int().positive("Elige la moneda"),
  rate: z.coerce.number().positive("La tasa debe ser mayor que cero"),
  note: z
    .string()
    .trim()
    .max(200, "Máximo 200 caracteres")
    .transform((v) => (v === "" ? null : v))
    .nullable(),
  /** Versión conocida del par; omitida al crear. */
  version: z.coerce.number().int().min(0).optional(),
});

export type RateInput = z.input<typeof rateSchema>;
export type RateValues = z.output<typeof rateSchema>;
