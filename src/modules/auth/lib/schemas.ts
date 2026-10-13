import { z } from "zod";
import { isValidPhone } from "@/lib/phone";

export const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email("Escribe un correo válido"),
  password: z.string().min(1, "Escribe tu contraseña"),
  callbackUrl: z.string().optional(),
});

export type LoginInput = z.infer<typeof loginSchema>;

export const registerSchema = z
  .object({
    fullName: z.string().trim().min(2, "Escribe tu nombre"),
    email: z.string().trim().toLowerCase().email("Escribe un correo válido"),
    phone: z
      .string()
      .trim()
      .refine(isValidPhone, "Escribe un teléfono válido (7 a 15 dígitos)"),
    password: z.string().min(8, "Mínimo 8 caracteres"),
    confirmPassword: z.string(),
    callbackUrl: z.string().optional(),
  })
  .refine((v) => v.password === v.confirmPassword, {
    message: "Las contraseñas no coinciden",
    path: ["confirmPassword"],
  });

export type RegisterInput = z.infer<typeof registerSchema>;

/** Solo rutas internas: un callbackUrl externo sería un open redirect. El
 *  middleware de next-auth manda la URL absoluta; se conserva solo su ruta. */
export function safeCallbackUrl(value: string | undefined, fallback: string): string {
  if (!value) return fallback;
  if (/^https?:\/\//i.test(value)) {
    try {
      const url = new URL(value);
      return `${url.pathname}${url.search}`;
    } catch {
      return fallback;
    }
  }
  if (!value.startsWith("/") || value.startsWith("//")) return fallback;
  return value;
}

/** Enlace entre login y registro conservando a dónde volver (p. ej. al
 *  checkout) cuando hay un callbackUrl. */
export function withCallbackUrl(path: string, callbackUrl?: string): string {
  return callbackUrl ? `${path}?callbackUrl=${encodeURIComponent(callbackUrl)}` : path;
}
