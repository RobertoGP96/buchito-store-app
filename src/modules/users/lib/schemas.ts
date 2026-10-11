import { z } from "zod";
import { USER_ROLES } from "./labels";

export const userSchema = z.object({
  fullName: z.string().trim().min(2, "Escribe el nombre"),
  email: z.string().trim().toLowerCase().email("Escribe un correo válido"),
  // "courier" solo pasa al editar un mensajero existente (el select va
  // deshabilitado); las actions rechazan elegirlo desde aquí.
  role: z.enum(USER_ROLES),
  /** Obligatoria (≥ 8) al crear; al editar, vacío = no cambiar. */
  password: z.string().optional(),
  isActive: z.boolean().default(true),
});

export type UserInput = z.input<typeof userSchema>;
export type UserValues = z.output<typeof userSchema>;

export const MIN_PASSWORD_LENGTH = 8;
