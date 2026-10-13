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

export const verifyLoginCodeSchema = z.object({
  kind: z.enum(["otp", "recovery"]),
  code: z.string().trim().min(1, "Escribe el código"),
  callbackUrl: z.string().optional(),
});

export type VerifyLoginCodeInput = z.infer<typeof verifyLoginCodeSchema>;

export const twoFactorMethodSchema = z.object({
  method: z.enum(["app", "email"]),
});

export type TwoFactorMethodInput = z.infer<typeof twoFactorMethodSchema>;

export const confirmTwoFactorSchema = z.object({
  code: z.string().trim().regex(/^\d{6}$/, "Escribe los 6 dígitos del código"),
});

export type ConfirmTwoFactorInput = z.infer<typeof confirmTwoFactorSchema>;

export const disableTwoFactorSchema = z.object({
  password: z.string().min(1, "Escribe tu contraseña"),
});

export type DisableTwoFactorInput = z.infer<typeof disableTwoFactorSchema>;
