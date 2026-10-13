"use server";

import { revalidatePath } from "next/cache";
import bcrypt from "bcryptjs";
import QRCode from "qrcode";
import { db } from "@/lib/db";
import { createAuditLog, requireCurrentUserId } from "@/lib/audit";
import { failAction, firstIssueMessage } from "@/lib/action-utils";
import { STORE_NAME } from "@/lib/config";
import { isMailConfigured } from "@/lib/mailer";
import { encryptSecret, hashCode } from "@/lib/two-factor-crypto";
import type { ActionResult } from "@/types";
import {
  confirmTwoFactorSchema,
  disableTwoFactorSchema,
  twoFactorMethodSchema,
  type ConfirmTwoFactorInput,
  type DisableTwoFactorInput,
  type TwoFactorMethodInput,
} from "../lib/schemas";
import {
  formatManualKey,
  generateRecoveryCodes,
  generateTotpSecret,
  maskEmail,
  otpauthUri,
} from "../lib/two-factor";
import type { TwoFactorSetup } from "../lib/two-factor-labels";
import { issueEmailCode, verifyAndConsumeCode, verifyCodeMessage } from "../lib/two-factor-server";

const ALREADY_ENABLED = "La verificación en dos pasos ya está activada";

function revalidateTwoFactorPaths() {
  revalidatePath("/perfil");
  revalidatePath("/admin/usuarios");
}

// Al (re)empezar un alta se vacía todo lo del intento anterior.
const PENDING_RESET = {
  recoveryCodes: [] as string[],
  lastCounter: null,
  failedAttempts: 0,
  lockedUntil: null,
};

/** Paso 1 del alta: deja una fila pendiente (`enabledAt` null). Con app
 *  devuelve el QR y la clave manual; con correo envía el código. Llamarla de
 *  nuevo con correo equivale a «reenviar» (respeta el cooldown). */
export async function startTwoFactorSetup(input: TwoFactorMethodInput): Promise<ActionResult<TwoFactorSetup>> {
  const parsed = twoFactorMethodSchema.safeParse(input);
  if (!parsed.success) return { success: false, error: "Elige un método" };
  const { method } = parsed.data;

  try {
    const userId = await requireCurrentUserId();
    const user = await db.user.findUnique({
      where: { userId },
      select: {
        email: true,
        twoFactor: { select: { method: true, enabledAt: true } },
      },
    });
    if (!user) return { success: false, error: "Usuario no encontrado" };
    if (user.twoFactor?.enabledAt) return { success: false, error: ALREADY_ENABLED };

    if (method === "app") {
      const secret = generateTotpSecret();
      const encrypted = encryptSecret(secret);
      await db.userTwoFactor.upsert({
        where: { userId },
        create: { userId, method: "app", secret: encrypted },
        update: {
          method: "app",
          secret: encrypted,
          emailCodeHash: null,
          emailCodeExpiresAt: null,
          emailCodeSentAt: null,
          ...PENDING_RESET,
        },
      });
      const uri = otpauthUri(secret, user.email, STORE_NAME);
      const qrDataUrl = await QRCode.toDataURL(uri, { margin: 1, width: 240 });
      return { success: true, data: { method: "app", qrDataUrl, manualKey: formatManualKey(secret) } };
    }

    if (!isMailConfigured()) {
      return { success: false, error: "El envío de correos no está configurado en la tienda" };
    }
    // Si el alta pendiente ya era por correo se conserva su cooldown.
    const keepEmailCode = user.twoFactor?.method === "email";
    const row = await db.userTwoFactor.upsert({
      where: { userId },
      create: { userId, method: "email" },
      update: {
        method: "email",
        secret: null,
        ...(keepEmailCode ? {} : { emailCodeHash: null, emailCodeExpiresAt: null, emailCodeSentAt: null }),
        ...PENDING_RESET,
      },
      select: { userId: true, emailCodeSentAt: true, emailCodeExpiresAt: true },
    });
    const issued = await issueEmailCode(row, user.email);
    return {
      success: true,
      data: {
        method: "email",
        emailMasked: maskEmail(user.email),
        resendAfterSeconds: issued.resendAfterSeconds,
        sent: issued.sent,
      },
    };
  } catch (error) {
    return failAction("startTwoFactorSetup", error, "No se pudo iniciar la activación. Inténtalo de nuevo.");
  }
}

/** Paso 2 del alta: el código demuestra que la app o el correo funcionan.
 *  Activa, genera los códigos de respaldo y los devuelve en claro una sola
 *  vez: en la base solo quedan sus HMAC. */
export async function confirmTwoFactorSetup(
  input: ConfirmTwoFactorInput
): Promise<ActionResult<{ recoveryCodes: string[] }>> {
  const parsed = confirmTwoFactorSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: firstIssueMessage(parsed.error, "Escribe el código") };
  }

  try {
    const userId = await requireCurrentUserId();
    const row = await db.userTwoFactor.findUnique({ where: { userId } });
    if (!row) return { success: false, error: "Empieza la activación de nuevo" };
    if (row.enabledAt) return { success: false, error: ALREADY_ENABLED };

    const result = await verifyAndConsumeCode(row, { kind: "otp", code: parsed.data.code });
    if (result.status !== "ok") {
      return { success: false, error: verifyCodeMessage(result, { method: row.method, kind: "otp" }) };
    }

    const recoveryCodes = generateRecoveryCodes();
    await db.$transaction(async (tx) => {
      await tx.userTwoFactor.update({
        where: { userId },
        data: {
          enabledAt: new Date(),
          recoveryCodes: recoveryCodes.map((code) => hashCode("recovery-code", code)),
          emailCodeHash: null,
          emailCodeExpiresAt: null,
          failedAttempts: 0,
          lockedUntil: null,
        },
      });
      await createAuditLog(tx, {
        action: "two_factor.enable",
        entityType: "User",
        entityId: userId,
        module: "auth",
        userId,
        newValues: { method: row.method },
      });
    });

    revalidateTwoFactorPaths();
    return { success: true, data: { recoveryCodes } };
  } catch (error) {
    return failAction("confirmTwoFactorSetup", error, "No se pudo activar la verificación en dos pasos");
  }
}

/** Requiere la contraseña: quien tenga la sesión abierta en un dispositivo
 *  ajeno no debe poder quitar el segundo factor sin más. */
export async function disableTwoFactor(input: DisableTwoFactorInput): Promise<ActionResult<void>> {
  const parsed = disableTwoFactorSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: firstIssueMessage(parsed.error, "Escribe tu contraseña") };
  }

  try {
    const userId = await requireCurrentUserId();
    const user = await db.user.findUnique({
      where: { userId },
      select: { passwordHash: true, twoFactor: { select: { method: true, enabledAt: true } } },
    });
    if (!user) return { success: false, error: "Usuario no encontrado" };
    const twoFactor = user.twoFactor;
    if (!twoFactor?.enabledAt) {
      return { success: false, error: "La verificación en dos pasos no está activada" };
    }
    const passwordOk = await bcrypt.compare(parsed.data.password, user.passwordHash);
    if (!passwordOk) return { success: false, error: "Contraseña incorrecta" };

    await db.$transaction(async (tx) => {
      await tx.userTwoFactor.delete({ where: { userId } });
      await createAuditLog(tx, {
        action: "two_factor.disable",
        entityType: "User",
        entityId: userId,
        module: "auth",
        userId,
        oldValues: { method: twoFactor.method, enabledAt: twoFactor.enabledAt },
      });
    });

    revalidateTwoFactorPaths();
    return { success: true, data: undefined };
  } catch (error) {
    return failAction("disableTwoFactor", error, "No se pudo desactivar la verificación en dos pasos");
  }
}

/** Cerrar el diálogo a medias: la fila pendiente no estorba al login, pero
 *  tampoco hace falta conservarla. */
export async function cancelTwoFactorSetup(): Promise<void> {
  try {
    const userId = await requireCurrentUserId();
    await db.userTwoFactor.deleteMany({ where: { userId, enabledAt: null } });
  } catch (error) {
    console.error("cancelTwoFactorSetup:", error);
  }
}
