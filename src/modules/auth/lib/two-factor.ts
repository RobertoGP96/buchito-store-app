import { randomBytes, randomInt } from "node:crypto";
import { Secret, TOTP } from "otpauth";
import { EMAIL_CODE_TTL_MINUTES } from "./two-factor-labels";

// Funciones puras del segundo factor: sin DB ni cookies. Las usan las actions
// y los tests.

export const TOTP_DIGITS = 6;
export const TOTP_PERIOD_SECONDS = 30;
/** Pasos de 30 s admitidos a cada lado: tolera un reloj un poco desfasado. */
export const TOTP_WINDOW = 1;
export { EMAIL_CODE_TTL_MINUTES };
export const MAX_FAILED_ATTEMPTS = 5;
export const LOCK_MINUTES = 15;
export const RECOVERY_CODE_COUNT = 8;

function buildTotp(secretBase32: string, label = "", issuer = ""): TOTP {
  return new TOTP({
    issuer,
    label,
    algorithm: "SHA1",
    digits: TOTP_DIGITS,
    period: TOTP_PERIOD_SECONDS,
    secret: Secret.fromBase32(secretBase32),
  });
}

export function generateTotpSecret(): string {
  return new Secret({ size: 20 }).base32;
}

/** Devuelve el contador (paso de 30 s) del código aceptado para que quien lo
 *  consuma rechace reutilizaciones; null si no vale dentro de la ventana. */
export function validateTotp(
  secretBase32: string,
  token: string,
  timestamp: number = Date.now()
): { counter: number } | null {
  if (!/^\d{6}$/.test(token)) return null;
  const totp = buildTotp(secretBase32);
  const delta = totp.validate({ token, timestamp, window: TOTP_WINDOW });
  if (delta === null) return null;
  return { counter: totp.counter({ timestamp }) + delta };
}

/** Solo para tests y utilidades: el código vigente de un secreto. */
export function generateTotpToken(secretBase32: string, timestamp: number = Date.now()): string {
  return buildTotp(secretBase32).generate({ timestamp });
}

export function otpauthUri(secretBase32: string, label: string, issuer: string): string {
  return buildTotp(secretBase32, label, issuer).toString();
}

/** Clave en grupos de 4 para teclearla a mano en la app. */
export function formatManualKey(secretBase32: string): string {
  return secretBase32.replace(/(.{4})/g, "$1 ").trim();
}

export function generateEmailCode(): string {
  return String(randomInt(0, 1_000_000)).padStart(6, "0");
}

// 32 símbolos sin 0/O ni 1/I: 256 % 32 == 0, así que un byte módulo 32 no sesga.
const RECOVERY_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

function randomRecoveryCode(): string {
  const bytes = randomBytes(10);
  let out = "";
  for (let i = 0; i < 10; i++) {
    out += RECOVERY_ALPHABET[bytes[i] % RECOVERY_ALPHABET.length];
    if (i === 4) out += "-";
  }
  return out;
}

export function generateRecoveryCodes(count: number = RECOVERY_CODE_COUNT): string[] {
  const codes = new Set<string>();
  while (codes.size < count) codes.add(randomRecoveryCode());
  return [...codes];
}

/** Mayúsculas y sin separadores: "abcde fghjk" vale igual que "ABCDE-FGHJK". */
export function normalizeRecoveryCode(raw: string): string {
  const clean = raw.toUpperCase().replace(/[^A-Z2-9]/g, "");
  return clean.length === 10 ? `${clean.slice(0, 5)}-${clean.slice(5)}` : clean;
}

export function maskEmail(email: string): string {
  const at = email.indexOf("@");
  if (at <= 0) return email;
  return `${email.slice(0, 1)}***${email.slice(at)}`;
}
