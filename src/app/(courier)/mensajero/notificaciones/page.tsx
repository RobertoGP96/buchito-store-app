import type { Metadata } from "next";
import { Bell } from "lucide-react";
import { auth } from "@/lib/auth";
import { ButtonLink } from "@/components/button-link";
import { PageHeader } from "@/components/page-header";
import { MarkAllReadButton, NotificationList } from "@/modules/notifications/components/notification-list";
import { getNotificationsForUser } from "@/modules/notifications/queries/notification-queries";

export const metadata: Metadata = { title: "Notificaciones" };
export const dynamic = "force-dynamic";

export default async function CourierNotificationsPage() {
  const session = await auth();
  const items = await getNotificationsForUser(session!.user.userId);
  const hasUnread = items.some((i) => i.readAt == null);

  return (
    <>
      <PageHeader icon={Bell} title="Notificaciones" description="Entregas asignadas, cambios y liquidaciones.">
        <ButtonLink href="/mensajero" variant="ghost" size="sm">
          Mis entregas
        </ButtonLink>
        {hasUnread && <MarkAllReadButton upToId={items[0]?.notificationId ?? null} />}
      </PageHeader>
      <NotificationList variant="page" audience="courier" items={items} inboxHref="/mensajero/notificaciones" />
    </>
  );
}
