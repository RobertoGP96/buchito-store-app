import "server-only";
import { db } from "@/lib/db";
import {
  FEED_SIZE,
  INBOX_SIZE,
  isNotificationCategory,
  type NotificationCategory,
  type NotificationFeed,
  type NotificationRow,
} from "../lib/labels";

/* Datos por usuario: nunca en la Data Cache. El `userId` sale siempre de la
   sesión de quien llama. */

const ROW_SELECT = {
  notificationId: true,
  category: true,
  kind: true,
  title: true,
  body: true,
  href: true,
  readAt: true,
  createdAt: true,
} as const;

type RawRow = {
  notificationId: number;
  category: NotificationRow["category"];
  kind: NotificationRow["kind"];
  title: string;
  body: string;
  href: string | null;
  readAt: Date | null;
  createdAt: Date;
};

function toRow(row: RawRow): NotificationRow {
  return {
    notificationId: row.notificationId,
    category: row.category,
    kind: row.kind,
    title: row.title,
    body: row.body,
    href: row.href,
    readAt: row.readAt ? row.readAt.toISOString() : null,
    createdAt: row.createdAt.toISOString(),
  };
}

/** Lo que pinta la campana: no leídas y los últimos avisos. */
export async function getNotificationFeed(userId: number): Promise<NotificationFeed> {
  const [unread, rows] = await Promise.all([
    db.notification.count({ where: { userId, readAt: null } }),
    db.notification.findMany({
      where: { userId },
      orderBy: { notificationId: "desc" },
      take: FEED_SIZE,
      select: ROW_SELECT,
    }),
  ]);
  return { unread, items: rows.map(toRow) };
}

export async function getNotificationsForUser(userId: number, take = INBOX_SIZE): Promise<NotificationRow[]> {
  const rows = await db.notification.findMany({
    where: { userId },
    orderBy: { notificationId: "desc" },
    take,
    select: ROW_SELECT,
  });
  return rows.map(toRow);
}

export async function getMutedCategories(userId: number): Promise<NotificationCategory[]> {
  const row = await db.notificationPreference.findUnique({ where: { userId }, select: { mutedCategories: true } });
  return (row?.mutedCategories ?? []).filter(isNotificationCategory);
}
