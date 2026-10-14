import { buildNotification, type NotificationDraft } from "./build-notification";
import type { NotifyTarget } from "./targets";

export interface PlannedRow {
  userId: number;
  draft: NotificationDraft;
}

function directIds(target: NotifyTarget): number[] {
  return (target.userIds ?? []).filter((id): id is number => typeof id === "number" && Number.isInteger(id) && id > 0);
}

/** Ids a los que podría llegar algo (sin actor ni repetidos): para leer las
 *  preferencias en una sola consulta. */
export function candidateUserIds(
  targets: readonly NotifyTarget[],
  adminUserIds: readonly number[],
  actorUserId: number | null
): number[] {
  const ids = new Set<number>();
  for (const target of targets) {
    for (const id of directIds(target)) ids.add(id);
    if (target.admins) for (const id of adminUserIds) ids.add(id);
  }
  if (actorUserId != null) ids.delete(actorUserId);
  return [...ids];
}

/** Filas a escribir: por target, destinatarios directos más admins, sin el
 *  actor, sin quien silenció la categoría y sin repetir usuario. */
export function planNotifications(
  targets: readonly NotifyTarget[],
  ctx: {
    adminUserIds: readonly number[];
    actorUserId: number | null;
    mutedByUser: ReadonlyMap<number, readonly string[]>;
  }
): PlannedRow[] {
  const rows: PlannedRow[] = [];
  for (const target of targets) {
    const recipients = new Set<number>(directIds(target));
    if (target.admins) for (const id of ctx.adminUserIds) recipients.add(id);
    if (ctx.actorUserId != null) recipients.delete(ctx.actorUserId);
    if (recipients.size === 0) continue;
    const draft = buildNotification(target.event);
    for (const userId of recipients) {
      if (ctx.mutedByUser.get(userId)?.includes(draft.category)) continue;
      rows.push({ userId, draft });
    }
  }
  return rows;
}
