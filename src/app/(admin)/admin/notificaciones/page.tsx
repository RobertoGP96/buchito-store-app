import type { Metadata } from "next";
import { Bell } from "lucide-react";
import { auth } from "@/lib/auth";
import { PageHeader } from "@/components/page-header";
import { StatusChip } from "@/components/status-chip";
import { NotificationPreferencesButton } from "@/modules/notifications/components/notification-preferences-card";
import { MarkAllReadButton, NotificationList } from "@/modules/notifications/components/notification-list";
import { getMutedCategories, getNotificationsForUser } from "@/modules/notifications/queries/notification-queries";

export const metadata: Metadata = { title: "Notificaciones" };
export const dynamic = "force-dynamic";

export default async function AdminNotificationsPage() {
  const session = await auth();
  const userId = session!.user.userId;
  const [items, muted] = await Promise.all([getNotificationsForUser(userId), getMutedCategories(userId)]);
  const unread = items.filter((i) => i.readAt == null).length;

  return (
    <>
      <PageHeader
        icon={Bell}
        title="Notificaciones"
        description="Pedidos nuevos, pasos de las entregas, cobros de mensajeros y stock bajo. Toca uno para abrirlo."
        badge={unread > 0 ? <StatusChip label={`${unread} sin leer`} tone="warning" /> : undefined}
      >
        <NotificationPreferencesButton key={muted.join(",")} role="admin" muted={muted} variant="ghost" />
        {unread > 0 && <MarkAllReadButton upToId={items[0]?.notificationId ?? null} />}
      </PageHeader>
      <NotificationList variant="page" audience="admin" items={items} inboxHref="/admin/notificaciones" />
    </>
  );
}
