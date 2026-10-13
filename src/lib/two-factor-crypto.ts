import {
  createCipheriv,
  createDecipheriv,
  createHmac,
  hkdfSync,
  randomBytes,
  timingSafeEqual,
} from "node:crypto";
import { decode, encode } from "next-auth/jwt";

// Sin `server-only` a propósito: lo importan los tests de Vitest. Solo lo usan
// actions y libs de servidor (node:crypto no existe en el cliente).

type KeyUse = "totp-secret" | "email-code" | "recovery-code";

const HKDF_SALT = "buchito-2fa";

/** TWO_FACTOR_KEY manda; sin ella, AUTH_SECRET. Rotar la clave invalida todos
 *  los secretos TOTP cifrados, por eso conviene una variable propia. */
function keyMaterial(): string {
  const ikm = process.env.TWO_FACTOR_KEY || process.env.AUTH_SECRET;
  if (!ikm) throw new Error("Falta TWO_FACTOR_KEY o AUTH_SECRET");
  return ikm;
}

function deriveKey(use: KeyUse): Buffer {
  return Buffer.from(hkdfSync("sha256", keyMaterial(), HKDF_SALT, use, 32));
}

const IV_BYTES = 12;
const TAG_BYTES = 16;

/** AES-256-GCM; el blob es base64 de `iv || tag || cifrado`. */
export function encryptSecret(plain: string): string {
  const iv = randomBytes(IV_BYTES);
  const cipher = createCipheriv("aes-256-gcm", deriveKey("totp-secret"), iv);
  const ciphertext = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  return Buffer.concat([iv, cipher.getAuthTag(), ciphertext]).toString("base64");
}

/** Lanza si el blob fue manipulado o la clave no coincide. */
export function decryptSecret(blob: string): string {
  const raw = Buffer.from(blob, "base64");
  const iv = raw.subarray(0, IV_BYTES);
  const tag = raw.subarray(IV_BYTES, IV_BYTES + TAG_BYTES);
  const ciphertext = raw.subarray(IV_BYTES + TAG_BYTES);
  const decipher = createDecipheriv("aes-256-gcm", deriveKey("totp-secret"), iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString("utf8");
}

export type CodeKind = "email-code" | "recovery-code";

/** HMAC con clave del servidor, no SHA-256 plano: un código de 6 dígitos o de
 *  respaldo se rompería offline en segundos a partir de un volcado. */
export function hashCode(kind: CodeKind, value: string): string {
  return createHmac("sha256", deriveKey(kind)).update(value).digest("hex");
}

export function safeEqual(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) return false;
  return timingSafeEqual(bufA, bufB);
}

// ---------------------------------------------------------------------------
// Tickets de login. El provider Credentials de next-auth solo acepta un ticket
// `session`: acuñado por la action tras validar contraseña (y 2FA), y consumido
// en la misma petición. El `pending` viaja en una cookie httpOnly entre el paso
// de contraseña y el del código. Ambos van cifrados (JWE) con AUTH_SECRET.
// ---------------------------------------------------------------------------

export type LoginTicketStage = "pending" | "session";

const TICKET_SALT: Record<LoginTicketStage, string> = {
  pending: "buchito.login.pending",
  session: "buchito.login.session",
};

export const TICKET_MAX_AGE_SECONDS: Record<LoginTicketStage, number> = {
  pending: 5 * 60,
  session: 60,
};

interface LoginTicketPayload {
  uid: number;
  stage: LoginTicketStage;
}

function authSecret(): string {
  const secret = process.env.AUTH_SECRET;
  if (!secret) throw new Error("Falta AUTH_SECRET");
  return secret;
}

export async function mintLoginTicket(
  userId: number,
  stage: LoginTicketStage,
  maxAge: number = TICKET_MAX_AGE_SECONDS[stage]
): Promise<string> {
  return encode<LoginTicketPayload>({
    token: { uid: userId, stage },
    secret: authSecret(),
    salt: TICKET_SALT[stage],
    maxAge,
  });
}

/** null si falta, caducó, fue manipulado o es de otra etapa. */
export async function verifyLoginTicket(
  token: string | undefined,
  stage: LoginTicketStage
): Promise<{ userId: number } | null> {
  if (!token) return null;
  try {
    const payload = await decode<LoginTicketPayload>({
      token,
      secret: authSecret(),
      salt: TICKET_SALT[stage],
    });
    if (!payload || payload.stage !== stage) return null;
    if (!Number.isInteger(payload.uid) || payload.uid <= 0) return null;
    return { userId: payload.uid };
  } catch {
    return null;
  }
}
