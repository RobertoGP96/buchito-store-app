import { cookies } from "next/headers";
import type { UserTwoFactor } from "@/generated/prisma";
import { db } from "@/lib/db";
import { createAuditLog } from "@/lib/audit";
import { STORE_NAME } from "@/lib/config";
import { sendMail } from "@/lib/mailer";
import { decryptSecret, hashCode, safeEqual, TICKET_MAX_AGE_SECONDS } from "@/lib/two-factor-crypto";
import {
  EMAIL_CODE_TTL_MINUTES,
  LOCK_MINUTES,
  MAX_FAILED_ATTEMPTS,
  generateEmailCode,
  normalizeRecoveryCode,
  validateTotp,
} from "./two-factor";
import { buildTwoFactorCodeEmail } from "./two-factor-email";
import { RESEND_COOLDOWN_SECONDS, type TwoFactorMethod } from "./two-factor-labels";

// Helpers de servidor compartidos por las actions de login y de alta del 2FA.
// Sin "use server": no son endpoints, solo los importan las actions.

// ---------------------------------------------------------------------------
// Cookie del login pendiente: entre la contraseña correcta y el código.
// ---------------------------------------------------------------------------

export const TWO_FACTOR_COOKIE = "buchito-2fa";

export async function setPendingLoginCookie(ticket: string): Promise<void> {
  const store = await cookies();
  store.set(TWO_FACTOR_COOKIE, ticket, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: TICKET_MAX_AGE_SECONDS.pending,
  });
}

export async function readPendingLoginCookie(): Promise<string | undefined> {
  const store = await cookies();
  return store.get(TWO_FACTOR_COOKIE)?.value;
}

export async function clearPendingLoginCookie(): Promise<void> {
  const store = await cookies();
  store.delete(TWO_FACTOR_COOKIE);
}

// ---------------------------------------------------------------------------
// Código por correo
// ---------------------------------------------------------------------------

type EmailCodeRow = Pick<UserTwoFactor, "userId" | "emailCodeSentAt" | "emailCodeExpiresAt">;

export interface IssueEmailCodeResult {
  sent: boolean;
  resendAfterSeconds: number;
}

/** Genera, guarda (HMAC + caducidad) y envía un código. Si hace menos de 60 s
 *  que salió uno todavía válido no manda otro: devuelve cuánto falta. Va
 *  contra `db` y no contra una tx: el envío es red y no debe vivir dentro de
 *  una transacción. */
export async function issueEmailCode(row: EmailCodeRow, email: string): Promise<IssueEmailCodeResult> {
  const now = Date.now();
  if (row.emailCodeSentAt && row.emailCodeExpiresAt && row.emailCodeExpiresAt.getTime() > now) {
    const elapsed = (now - row.emailCodeSentAt.getTime()) / 1000;
    if (elapsed < RESEND_COOLDOWN_SECONDS) {
      return { sent: false, resendAfterSeconds: Math.ceil(RESEND_COOLDOWN_SECONDS - elapsed) };
    }
  }

  const code = generateEmailCode();
  await db.userTwoFactor.update({
    where: { userId: row.userId },
    data: {
      emailCodeHash: hashCode("email-code", code),
      emailCodeExpiresAt: new Date(now + EMAIL_CODE_TTL_MINUTES * 60_000),
      emailCodeSentAt: new Date(now),
    },
  });
  try {
    await sendMail({
      to: email,
      ...buildTwoFactorCodeEmail({ storeName: STORE_NAME, code, minutes: EMAIL_CODE_TTL_MINUTES }),
    });
  } catch (error) {
    // Sin correo no hay código: se anula para que el reintento no choque con
    // el cooldown de un envío que nunca llegó.
    await db.userTwoFactor
      .update({
        where: { userId: row.userId },
        data: { emailCodeHash: null, emailCodeExpiresAt: null, emailCodeSentAt: null },
      })
      .catch((e) => console.error("issueEmailCode rollback:", e));
    throw error;
  }
  return { sent: true, resendAfterSeconds: RESEND_COOLDOWN_SECONDS };
}

// ---------------------------------------------------------------------------
// Verificación y consumo de códigos (login y confirmación del alta)
// ---------------------------------------------------------------------------

export type VerifyCodeKind = "otp" | "recovery";

export type VerifyCodeResult =
  | { status: "ok" }
  | { status: "invalid" }
  | { status: "expired" }
  | { status: "locked"; minutesLeft: number };

type VerifyRow = Pick<
  UserTwoFactor,
  | "userId"
  | "method"
  | "secret"
  | "recoveryCodes"
  | "lastCounter"
  | "emailCodeHash"
  | "emailCodeExpiresAt"
  | "failedAttempts"
  | "lockedUntil"
>;

const RESET_ATTEMPTS = { failedAttempts: 0, lockedUntil: null } as const;

async function consumeTotp(row: VerifyRow, code: string): Promise<VerifyCodeResult> {
  if (!row.secret) return { status: "invalid" };
  const result = validateTotp(decryptSecret(row.secret), code);
  if (!result) return { status: "invalid" };
  // Un código vale una sola vez: el contador aceptado solo puede avanzar.
  const updated = await db.userTwoFactor.updateMany({
    where: { userId: row.userId, OR: [{ lastCounter: null }, { lastCounter: { lt: result.counter } }] },
    data: { lastCounter: result.counter, ...RESET_ATTEMPTS },
  });
  return updated.count === 1 ? { status: "ok" } : { status: "invalid" };
}

async function consumeEmailCode(row: VerifyRow, code: string): Promise<VerifyCodeResult> {
  const now = new Date();
  if (!row.emailCodeHash || !row.emailCodeExpiresAt || row.emailCodeExpiresAt <= now) {
    return { status: "expired" };
  }
  if (!/^\d{6}$/.test(code)) return { status: "invalid" };
  const hash = hashCode("email-code", code);
  if (!safeEqual(hash, row.emailCodeHash)) return { status: "invalid" };
  const updated = await db.userTwoFactor.updateMany({
    where: { userId: row.userId, emailCodeHash: hash, emailCodeExpiresAt: { gt: now } },
    data: { emailCodeHash: null, emailCodeExpiresAt: null, ...RESET_ATTEMPTS },
  });
  return updated.count === 1 ? { status: "ok" } : { status: "expired" };
}

async function consumeRecoveryCode(row: VerifyRow, raw: string): Promise<VerifyCodeResult> {
  const code = normalizeRecoveryCode(raw);
  if (!/^[A-Z2-9]{5}-[A-Z2-9]{5}$/.test(code)) return { status: "invalid" };
  const hash = hashCode("recovery-code", code);
  if (!row.recoveryCodes.some((stored) => safeEqual(stored, hash))) return { status: "invalid" };
  const remaining = row.recoveryCodes.filter((stored) => stored !== hash);
  const updated = await db.userTwoFactor.updateMany({
    where: { userId: row.userId, recoveryCodes: { has: hash } },
    data: { recoveryCodes: remaining, ...RESET_ATTEMPTS },
  });
  if (updated.count !== 1) return { status: "invalid" };
  await createAuditLog(db, {
    action: "two_factor.recovery_code_used",
    entityType: "User",
    entityId: row.userId,
    module: "auth",
    userId: row.userId,
    newValues: { remaining: remaining.length },
  });
  return { status: "ok" };
}

/** Un fallo más; al quinto, bloqueo de 15 minutos (auditado). */
async function registerFailure(row: VerifyRow): Promise<VerifyCodeResult> {
  const attempts = row.failedAttempts + 1;
  const lock = attempts >= MAX_FAILED_ATTEMPTS;
  await db.userTwoFactor.update({
    where: { userId: row.userId },
    data: lock
      ? { failedAttempts: 0, lockedUntil: new Date(Date.now() + LOCK_MINUTES * 60_000) }
      : { failedAttempts: attempts },
  });
  if (!lock) return { status: "invalid" };
  await createAuditLog(db, {
    action: "two_factor.locked",
    entityType: "User",
    entityId: row.userId,
    module: "auth",
    userId: row.userId,
    newValues: { minutes: LOCK_MINUTES },
  });
  return { status: "locked", minutesLeft: LOCK_MINUTES };
}

/** Valida y consume un código (TOTP, correo o respaldo) con bloqueo por
 *  intentos. El consumo es atómico (`updateMany` + `count === 1`), como el
 *  stock: dos peticiones con el mismo código no pueden entrar las dos. */
export async function verifyAndConsumeCode(
  row: VerifyRow,
  input: { kind: VerifyCodeKind; code: string }
): Promise<VerifyCodeResult> {
  if (row.lockedUntil && row.lockedUntil > new Date()) {
    const minutesLeft = Math.max(1, Math.ceil((row.lockedUntil.getTime() - Date.now()) / 60_000));
    return { status: "locked", minutesLeft };
  }
  const result =
    input.kind === "recovery"
      ? await consumeRecoveryCode(row, input.code)
      : row.method === "app"
        ? await consumeTotp(row, input.code)
        : await consumeEmailCode(row, input.code);
  if (result.status === "invalid") return registerFailure(row);
  return result;
}

export function verifyCodeMessage(
  result: Exclude<VerifyCodeResult, { status: "ok" }>,
  context: { method: TwoFactorMethod; kind: VerifyCodeKind }
): string {
  switch (result.status) {
    case "locked":
      return `Demasiados intentos. Inténtalo de nuevo en ${result.minutesLeft} minutos.`;
    case "expired":
      return "El código caducó. Pide uno nuevo.";
    case "invalid":
      if (context.kind === "recovery") return "Código de respaldo incorrecto o ya usado.";
      return context.method === "app"
        ? "Código incorrecto. Comprueba que la hora del teléfono esté en automático."
        : "Código incorrecto.";
  }
}
