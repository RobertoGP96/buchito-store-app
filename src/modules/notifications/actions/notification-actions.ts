"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { ForbiddenError } from "@/lib/auth-guard";
import { createAuditLog, requireCurrentUserId } from "@/lib/audit";
import { failAction, firstIssueMessage, isValidId } from "@/lib/action-utils";
import { isRole } from "@/lib/roles";
import type { ActionResult } from "@/types";
import { ROLE_CATEGORIES, isNotificationCategory, type NotificationFeed } from "../lib/labels";
import { notificationPreferencesSchema, type NotificationPreferencesInput } from "../lib/schemas";
import { getNotificationFeed } from "../queries/notification-queries";

const INBOX_PATHS = ["/perfil/notificaciones", "/admin/notificaciones", "/mensajero/notificaciones"];

/** Leídas hace más de esto se borran al "marcar todas" (no hay cron). */
const RETENTION_MS = 90 * 24 * 60 * 60 * 1000;

/** Lectura para la campana: contador y últimos avisos. */
export async function fetchNotificationFeed(): Promise<ActionResult<NotificationFeed>> {
  try {
    const userId = await requireCurrentUserId();
    return { success: true, data: await getNotificationFeed(userId) };
  } catch (error) {
    return failAction("fetchNotificationFeed", error, "No se pudieron cargar las notificaciones");
  }
}

/** Marca un aviso propio como leído. Idempotente: conserva la primera lectura. */
export async function markNotificationRead(notificationId: number): Promise<ActionResult<void>> {
  if (!isValidId(notificationId)) return { success: false, error: "Notificación no válida" };
  try {
    const userId = await requireCurrentUserId();
    await db.notification.updateMany({
      where: { notificationId, userId, readAt: null },
      data: { readAt: new Date() },
    });
    return { success: true, data: undefined };
  } catch (error) {
    return failAction("markNotificationRead", error, "No se pudo marcar como leída");
  }
}

/** Marca como leídas las propias hasta `upToId` (el último aviso que el
 *  usuario tenía en pantalla): uno que llegó después sigue sin leer. */
export async function markAllNotificationsRead(upToId: number | null): Promise<ActionResult<{ count: number }>> {
  if (upToId != null && !isValidId(upToId)) return { success: false, error: "Notificación no válida" };
  try {
    const userId = await requireCurrentUserId();
    const marked = await db.notification.updateMany({
      where: { userId, readAt: null, ...(upToId != null ? { notificationId: { lte: upToId } } : {}) },
      data: { readAt: new Date() },
    });
    await db.notification.deleteMany({
      where: { userId, readAt: { lt: new Date(Date.now() - RETENTION_MS) } },
    });
    for (const path of INBOX_PATHS) revalidatePath(path);
    return { success: true, data: { count: marked.count } };
  } catch (error) {
    return failAction("markAllNotificationsRead", error, "No se pudieron marcar como leídas");
  }
}

/** Categorías que el usuario silencia; solo cuentan las de su rol. */
export async function updateNotificationPreferences(input: NotificationPreferencesInput): Promise<ActionResult<void>> {
  const parsed = notificationPreferencesSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: firstIssueMessage(parsed.error, "Revisa las preferencias") };
  }

  try {
    const session = await auth();
    if (!session?.user) throw new Error("No autenticado");
    const userId = session.user.userId;
    const role = session.user.role;
    if (!isRole(role)) throw new ForbiddenError();
    const allowed = ROLE_CATEGORIES[role];
    const muted = [...new Set(parsed.data.muted)].filter((c) => allowed.includes(c));

    await db.$transaction(async (tx) => {
      const previous = await tx.notificationPreference.findUnique({
        where: { userId },
        select: { mutedCategories: true },
      });
      await tx.notificationPreference.upsert({
        where: { userId },
        create: { userId, mutedCategories: muted },
        update: { mutedCategories: muted },
      });
      await createAuditLog(tx, {
        action: "update",
        entityType: "NotificationPreference",
        entityId: userId,
        module: "notifications",
        userId,
        oldValues: { mutedCategories: (previous?.mutedCategories ?? []).filter(isNotificationCategory) },
        newValues: { mutedCategories: muted },
      });
    });

    revalidatePath("/perfil");
    revalidatePath("/mensajero/perfil");
    revalidatePath("/admin/notificaciones");
    return { success: true, data: undefined };
  } catch (error) {
    return failAction("updateNotificationPreferences", error, "No se pudieron guardar tus preferencias");
  }
}
