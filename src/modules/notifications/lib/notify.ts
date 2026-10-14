import "server-only";
import type { Prisma } from "@/generated/prisma";
import { candidateUserIds, planNotifications } from "./recipients";
import type { NotifyTarget } from "./targets";

/** Escribe los avisos de uno o varios eventos dentro de la tx del llamador,
 *  después de `createAuditLog`: se confirman o se revierten con la operación.
 *  Nunca avisa al actor y lo silenciado no se escribe. Como mucho tres
 *  sentencias cortas y sin red. Sin try/catch: el texto sale de una función
 *  pura y total, así que un fallo aquí es un bug y debe abortar la tx como
 *  cualquier otra escritura. Devuelve cuántas filas creó. */
export async function notify(
  tx: Prisma.TransactionClient,
  actorUserId: number | null,
  targets: readonly NotifyTarget[]
): Promise<number> {
  if (targets.length === 0) return 0;

  const adminUserIds = targets.some((t) => t.admins)
    ? (
        await tx.user.findMany({
          where: { role: "admin", isActive: true, ...(actorUserId != null ? { userId: { not: actorUserId } } : {}) },
          select: { userId: true },
        })
      ).map((u) => u.userId)
    : [];

  const candidates = candidateUserIds(targets, adminUserIds, actorUserId);
  // Pedido de invitado, o solo admins y no queda ninguno: ni se leen preferencias.
  if (candidates.length === 0) return 0;

  const prefs = await tx.notificationPreference.findMany({
    where: { userId: { in: candidates }, mutedCategories: { isEmpty: false } },
    select: { userId: true, mutedCategories: true },
  });
  const rows = planNotifications(targets, {
    adminUserIds,
    actorUserId,
    mutedByUser: new Map(prefs.map((p) => [p.userId, p.mutedCategories])),
  });
  if (rows.length === 0) return 0;

  await tx.notification.createMany({
    data: rows.map((r) => ({
      userId: r.userId,
      category: r.draft.category,
      kind: r.draft.kind,
      title: r.draft.title,
      body: r.draft.body,
      href: r.draft.href,
    })),
  });
  return rows.length;
}
