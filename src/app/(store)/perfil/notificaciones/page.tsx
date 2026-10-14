import type { Metadata } from "next";
import { auth } from "@/lib/auth";
import { ScreenHeader } from "@/components/screen-header";
import { MarkAllReadButton, NotificationList } from "@/modules/notifications/components/notification-list";
import { audienceForRole } from "@/modules/notifications/lib/labels";
import { getNotificationsForUser } from "@/modules/notifications/queries/notification-queries";

export const metadata: Metadata = { title: "Notificaciones" };
export const dynamic = "force-dynamic";

export default async function MyNotificationsPage() {
  const session = await auth();
  const user = session!.user;
  const items = await getNotificationsForUser(user.userId);
  const hasUnread = items.some((i) => i.readAt == null);

  return (
    <>
      <ScreenHeader eyebrow="Tu cuenta" title="Notificaciones" backHref="/perfil">
        {hasUnread && <MarkAllReadButton upToId={items[0]?.notificationId ?? null} />}
      </ScreenHeader>
      <div className="mx-auto flex w-full max-w-[1120px] flex-1 flex-col px-5 pb-10 md:px-6">
        <NotificationList
          variant="page"
          audience={audienceForRole(user.role)}
          items={items}
          inboxHref="/perfil/notificaciones"
        />
      </div>
    </>
  );
}
