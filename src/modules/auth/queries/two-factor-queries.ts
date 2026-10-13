import "server-only";
import { db } from "@/lib/db";
import { isMailConfigured } from "@/lib/mailer";
import type { TwoFactorStatus } from "../lib/two-factor-labels";

export async function getTwoFactorStatus(userId: number): Promise<TwoFactorStatus> {
  const row = await db.userTwoFactor.findUnique({
    where: { userId },
    select: { method: true, enabledAt: true, recoveryCodes: true },
  });
  // Una fila sin `enabledAt` es un alta a medias: para el usuario no existe.
  const enabled = Boolean(row?.enabledAt);
  return {
    enabled,
    method: enabled && row ? row.method : null,
    enabledAt: enabled && row?.enabledAt ? row.enabledAt.toISOString() : null,
    recoveryCodesLeft: enabled && row ? row.recoveryCodes.length : 0,
    emailAvailable: isMailConfigured(),
  };
}
