"use server";

import { redirect } from "next/navigation";
import { AuthError } from "next-auth";
import bcrypt from "bcryptjs";
import { db } from "@/lib/db";
import { auth, signIn, signOut } from "@/lib/auth";
import { createAuditLog } from "@/lib/audit";
import { firstIssueMessage } from "@/lib/action-utils";
import { homeForRole } from "@/lib/roles";
import { normalizePhone } from "@/lib/phone";
import { mintLoginTicket, verifyLoginTicket } from "@/lib/two-factor-crypto";
import type { ActionResult } from "@/types";
import {
  loginSchema,
  registerSchema,
  safeCallbackUrl,
  verifyLoginCodeSchema,
  type LoginInput,
  type RegisterInput,
  type VerifyLoginCodeInput,
} from "../lib/schemas";
import { maskEmail } from "../lib/two-factor";
import { TWO_FACTOR_EXPIRED_MESSAGE, type LoginChallenge } from "../lib/two-factor-labels";
import {
  clearPendingLoginCookie,
  issueEmailCode,
  readPendingLoginCookie,
  setPendingLoginCookie,
  verifyAndConsumeCode,
  verifyCodeMessage,
} from "../lib/two-factor-server";

const LOGIN_FAILED = "No se pudo iniciar sesión. Inténtalo de nuevo.";
const INVALID_CREDENTIALS = "Correo o contraseña incorrectos";
// Hash de relleno: la comparación tarda lo mismo exista o no el correo.
const DUMMY_HASH = "$2a$12$CwTycUXWue0Thq9StjUM0uJ8sJ3n6Hn8hM8nM0y5R5a3b9p7w1sJm";

/** Crea la sesión con un ticket de un minuto y redirige desde el servidor:
 *  la respuesta de la action ya trae el destino renderizado con la cookie
 *  nueva. Solo devuelve si `signIn` falla; con éxito `redirect` lanza. */
async function completeLogin(userId: number, destination: string): Promise<ActionResult<never>> {
  try {
    const ticket = await mintLoginTicket(userId, "session");
    await signIn("credentials", { ticket, redirect: false });
  } catch (error) {
    if (!(error instanceof AuthError)) console.error("completeLogin:", error);
    return { success: false, error: LOGIN_FAILED };
  }
  redirect(destination);
}

function findLoginUser(email: string) {
  return db.user.findUnique({
    where: { email },
    select: {
      userId: true,
      email: true,
      passwordHash: true,
      isActive: true,
      role: true,
      twoFactor: {
        select: { userId: true, method: true, enabledAt: true, emailCodeSentAt: true, emailCodeExpiresAt: true },
      },
    },
  });
}

/** Paso 1: correo y contraseña. Sin 2FA redirige ya; con 2FA deja un ticket
 *  pendiente en cookie httpOnly y devuelve el reto para el segundo paso. */
export async function loginUser(input: LoginInput): Promise<ActionResult<LoginChallenge>> {
  const parsed = loginSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: "Revisa el correo y la contraseña" };
  }
  const { email, password, callbackUrl } = parsed.data;

  let user: Awaited<ReturnType<typeof findLoginUser>>;
  try {
    user = await findLoginUser(email);
  } catch (error) {
    console.error("loginUser:", error);
    return { success: false, error: LOGIN_FAILED };
  }
  const passwordOk = await bcrypt.compare(password, user?.passwordHash ?? DUMMY_HASH);
  if (!user || !user.isActive || !passwordOk) {
    return { success: false, error: INVALID_CREDENTIALS };
  }

  const destination = safeCallbackUrl(callbackUrl, homeForRole(user.role));
  const twoFactor = user.twoFactor;
  if (!twoFactor?.enabledAt) {
    return completeLogin(user.userId, destination);
  }

  try {
    await setPendingLoginCookie(await mintLoginTicket(user.userId, "pending"));
    if (twoFactor.method === "email") {
      const issued = await issueEmailCode(twoFactor, user.email);
      return {
        success: true,
        data: { method: "email", emailMasked: maskEmail(user.email), resendAfterSeconds: issued.resendAfterSeconds },
      };
    }
    return { success: true, data: { method: "app" } };
  } catch (error) {
    console.error("loginUser 2FA:", error);
    await clearPendingLoginCookie().catch(() => undefined);
    return { success: false, error: "No pudimos enviar el código de verificación. Inténtalo de nuevo." };
  }
}

/** Paso 2: código de la app, del correo o de respaldo. Con éxito redirige. */
export async function verifyLoginCode(input: VerifyLoginCodeInput): Promise<ActionResult<never>> {
  const parsed = verifyLoginCodeSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: firstIssueMessage(parsed.error, "Escribe el código") };
  }
  const { kind, code, callbackUrl } = parsed.data;

  let userId: number;
  let role: string;
  try {
    const ticket = await verifyLoginTicket(await readPendingLoginCookie(), "pending");
    if (!ticket) {
      await clearPendingLoginCookie();
      return { success: false, error: TWO_FACTOR_EXPIRED_MESSAGE };
    }
    const user = await db.user.findUnique({
      where: { userId: ticket.userId },
      select: { userId: true, role: true, isActive: true, twoFactor: true },
    });
    if (!user || !user.twoFactor?.enabledAt) {
      await clearPendingLoginCookie();
      return { success: false, error: TWO_FACTOR_EXPIRED_MESSAGE };
    }
    if (!user.isActive) {
      await clearPendingLoginCookie();
      return { success: false, error: "Tu cuenta está desactivada" };
    }
    const result = await verifyAndConsumeCode(user.twoFactor, { kind, code });
    if (result.status !== "ok") {
      return { success: false, error: verifyCodeMessage(result, { method: user.twoFactor.method, kind }) };
    }
    await clearPendingLoginCookie();
    userId = user.userId;
    role = user.role;
  } catch (error) {
    console.error("verifyLoginCode:", error);
    return { success: false, error: LOGIN_FAILED };
  }
  return completeLogin(userId, safeCallbackUrl(callbackUrl, homeForRole(role)));
}

/** Nuevo código por correo durante el login (respeta el cooldown). */
export async function resendLoginCode(): Promise<ActionResult<{ resendAfterSeconds: number }>> {
  try {
    const ticket = await verifyLoginTicket(await readPendingLoginCookie(), "pending");
    if (!ticket) {
      await clearPendingLoginCookie();
      return { success: false, error: TWO_FACTOR_EXPIRED_MESSAGE };
    }
    const user = await db.user.findUnique({
      where: { userId: ticket.userId },
      select: {
        email: true,
        isActive: true,
        twoFactor: {
          select: { userId: true, method: true, enabledAt: true, emailCodeSentAt: true, emailCodeExpiresAt: true },
        },
      },
    });
    if (!user?.isActive || !user.twoFactor?.enabledAt || user.twoFactor.method !== "email") {
      await clearPendingLoginCookie();
      return { success: false, error: TWO_FACTOR_EXPIRED_MESSAGE };
    }
    const issued = await issueEmailCode(user.twoFactor, user.email);
    if (!issued.sent) {
      return { success: false, error: `Espera ${issued.resendAfterSeconds} segundos para pedir otro código` };
    }
    return { success: true, data: { resendAfterSeconds: issued.resendAfterSeconds } };
  } catch (error) {
    console.error("resendLoginCode:", error);
    return { success: false, error: "No pudimos enviar el código. Inténtalo de nuevo." };
  }
}

/** «Volver» en el segundo paso: olvida el login a medias. */
export async function cancelPendingLogin(): Promise<void> {
  await clearPendingLoginCookie();
}

/** Igual que `loginUser`: con éxito redirige desde el servidor. */
export async function registerCustomer(input: RegisterInput): Promise<ActionResult<never>> {
  const parsed = registerSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message ?? "Revisa los datos del formulario",
    };
  }
  const { fullName, email, phone, password } = parsed.data;

  let userId: number;
  try {
    const existing = await db.user.findUnique({ where: { email }, select: { userId: true } });
    if (existing) {
      return { success: false, error: "Ya existe una cuenta con ese correo" };
    }

    const passwordHash = await bcrypt.hash(password, 12);
    const normalizedPhone = normalizePhone(phone);

    userId = await db.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: { email, passwordHash, fullName, role: "customer" },
      });
      // Si ya compró como invitado con este teléfono, se le enlaza ese cliente.
      const guest = await tx.customer.findFirst({
        where: { normalizedPhone, userId: null },
        orderBy: { createdAt: "desc" },
      });
      const customer = guest
        ? await tx.customer.update({
            where: { customerId: guest.customerId },
            data: { userId: user.userId, name: fullName, email },
          })
        : await tx.customer.create({
            data: { userId: user.userId, name: fullName, phone, normalizedPhone, email },
          });
      await createAuditLog(tx, {
        action: "create",
        entityType: "Customer",
        entityId: customer.customerId,
        module: "auth",
        userId: user.userId,
        newValues: { fullName, email, phone },
      });
      return user.userId;
    });
  } catch (error) {
    console.error("registerCustomer:", error);
    return { success: false, error: "No se pudo crear la cuenta. Inténtalo de nuevo." };
  }

  // Con éxito `completeLogin` redirige; si no pudo crear la sesión, la cuenta
  // ya existe y el usuario entra a mano.
  const result = await completeLogin(userId, "/");
  if (!result.success) redirect("/login");
  return result;
}

export async function logoutUser(): Promise<void> {
  await clearPendingLoginCookie();
  await signOut({ redirectTo: "/" });
}

export async function getSessionUser() {
  const session = await auth();
  return session?.user ?? null;
}
