"use client";

import { usePathname, useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { Button, Drawer, Popover, Skeleton, toast } from "@heroui/react";
import { Bell } from "lucide-react";
import { ButtonLink } from "@/components/button-link";
import { CountBadge, ICON_ACTION } from "@/components/layout/store/nav-primitives";
import { useIsDesktop } from "@/lib/use-is-desktop";
import { cn } from "@/lib/utils";
import { fetchNotificationFeed, markNotificationRead } from "../actions/notification-actions";
import { FEED_SIZE, type Audience, type NotificationFeed } from "../lib/labels";
import { MarkAllReadButton, NOTIFICATIONS_CHANGED_EVENT, NotificationList } from "./notification-list";

interface NotificationsBellProps {
  audience: Audience;
  /** `brand`: barra café de la tienda; `light`: cabeceras del panel y del mensajero. */
  tone: "brand" | "light";
  inboxHref: string;
}

/** Mensaje con el que `failAction` responde sin sesión: deja de sondear. */
const AUTH_ERROR = "Debes iniciar sesión para continuar";
const POLL_MS = 60_000;
const THROTTLE_MS = 5_000;

const LIGHT_TRIGGER =
  "relative inline-flex h-9 w-9 min-w-0 items-center justify-center rounded-full bg-transparent p-0 text-slate-500 transition-colors duration-150 hover:bg-hover hover:text-navy-700 data-[pressed]:bg-tint";

/** Campana con contador de no leídas. Se refresca al montar, al navegar, al
 *  volver a la pestaña, al abrirla y cada minuto con la pestaña visible. En
 *  escritorio abre un popover; en móvil, una hoja inferior. Un aviso que llega
 *  con la app abierta se anuncia con un toast. */
export function NotificationsBell({ audience, tone, inboxHref }: NotificationsBellProps) {
  const pathname = usePathname();
  const router = useRouter();
  const desktop = useIsDesktop();
  const [open, setOpen] = useState(false);
  // null hasta la primera respuesta: sin contador en el HTML del servidor.
  const [feed, setFeed] = useState<NotificationFeed | null>(null);

  const requestSeq = useRef(0);
  const lastFetchAt = useRef(0);
  const authFailures = useRef(0);
  const lastSeenId = useRef<number | null>(null);
  const openRef = useRef(false);

  const announce = useCallback(
    (next: NotificationFeed) => {
      const newest = next.items[0]?.notificationId ?? 0;
      // La primera carga solo fija la referencia: lo que ya había no es "nuevo".
      if (lastSeenId.current == null) {
        lastSeenId.current = newest;
        return;
      }
      const seen = lastSeenId.current;
      lastSeenId.current = Math.max(seen, newest);
      const fresh = next.items.filter((i) => i.readAt == null && i.notificationId > seen);
      if (fresh.length === 0 || openRef.current || document.visibilityState !== "visible") return;

      if (fresh.length === 1) {
        const item = fresh[0];
        toast.info(item.title, {
          description: item.body,
          timeout: 6000,
          actionProps: {
            children: "Ver",
            size: "sm",
            variant: "ghost",
            onPress: () => {
              markNotificationRead(item.notificationId).catch((error) => console.error("markNotificationRead:", error));
              router.push(item.href ?? inboxHref);
            },
          },
        });
        return;
      }
      toast.info(
        fresh.length >= FEED_SIZE ? "Tienes varias notificaciones nuevas" : `Tienes ${fresh.length} notificaciones nuevas`,
        {
          timeout: 6000,
          actionProps: { children: "Ver todas", size: "sm", variant: "ghost", onPress: () => router.push(inboxHref) },
        }
      );
    },
    [inboxHref, router]
  );

  const refresh = useCallback(
    async (force = false) => {
      if (authFailures.current >= 2) return;
      const now = Date.now();
      if (!force && now - lastFetchAt.current < THROTTLE_MS) return;
      lastFetchAt.current = now;
      const seq = ++requestSeq.current;
      try {
        const result = await fetchNotificationFeed();
        if (seq !== requestSeq.current) return;
        if (!result.success) {
          // Los fallos de sondeo nunca se muestran: se conserva lo último bueno.
          if (result.error === AUTH_ERROR) authFailures.current += 1;
          return;
        }
        authFailures.current = 0;
        announce(result.data);
        setFeed(result.data);
      } catch (error) {
        console.error("NotificationsBell:", error);
      }
    },
    [announce]
  );

  useEffect(() => {
    openRef.current = open;
  }, [open]);

  // Los shells viven en el layout y no se desmontan: cerrar y refrescar al navegar.
  useEffect(() => {
    authFailures.current = 0;
    setOpen(false);
    void refresh();
  }, [pathname, refresh]);

  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState === "visible") void refresh();
    };
    const onFocus = () => void refresh();
    const onChanged = () => void refresh(true);
    const interval = window.setInterval(() => {
      if (document.visibilityState === "visible") void refresh(true);
    }, POLL_MS);
    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener(NOTIFICATIONS_CHANGED_EVENT, onChanged);
    return () => {
      window.clearInterval(interval);
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener(NOTIFICATIONS_CHANGED_EVENT, onChanged);
    };
  }, [refresh]);

  const handleOpenChange = (next: boolean) => {
    setOpen(next);
    if (next) void refresh();
  };

  const markReadLocally = (notificationId: number) => {
    setFeed((prev) => {
      if (!prev) return prev;
      const target = prev.items.find((i) => i.notificationId === notificationId);
      if (!target || target.readAt != null) return prev;
      const now = new Date().toISOString();
      return {
        unread: Math.max(0, prev.unread - 1),
        items: prev.items.map((i) => (i.notificationId === notificationId ? { ...i, readAt: now } : i)),
      };
    });
  };

  const markAllLocally = () => {
    const now = new Date().toISOString();
    setFeed((prev) => prev && { unread: 0, items: prev.items.map((i) => (i.readAt ? i : { ...i, readAt: now })) });
  };

  const unread = feed?.unread ?? 0;
  const items = feed?.items ?? [];
  const upToId = items[0]?.notificationId ?? null;
  const close = () => setOpen(false);

  const list =
    feed === null ? (
      <div className="flex flex-col gap-3 p-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="flex items-start gap-3">
            <Skeleton className="h-9 w-9 flex-none rounded-full" />
            <div className="flex flex-1 flex-col gap-2 pt-1">
              <Skeleton animationType="none" className="h-3 w-3/4 rounded-full" />
              <Skeleton animationType="none" className="h-2.5 w-1/2 rounded-full" />
            </div>
          </div>
        ))}
      </div>
    ) : (
      <NotificationList
        items={items}
        variant="panel"
        audience={audience}
        inboxHref={inboxHref}
        onRead={markReadLocally}
        onNavigate={close}
      />
    );

  const seeAll = (
    <ButtonLink href={inboxHref} variant="soft" size="sm" onClick={close} className="flex-1">
      Ver todas
    </ButtonLink>
  );

  return (
    <>
      <Popover isOpen={desktop && open} onOpenChange={handleOpenChange}>
        <Button
          isIconOnly
          variant="ghost"
          size="sm"
          aria-label={unread > 0 ? `Notificaciones, ${unread} sin leer` : "Notificaciones"}
          aria-haspopup="dialog"
          aria-expanded={open}
          className={cn(tone === "brand" ? cn(ICON_ACTION, "min-w-0 bg-transparent p-0 text-nav-fg") : LIGHT_TRIGGER)}
        >
          <Bell className="h-[18px] w-[18px]" strokeWidth={1.9} />
          <CountBadge count={unread} className={tone === "light" ? "ring-canvas" : undefined} />
        </Button>
        <Popover.Content placement="bottom end" offset={8} className="w-[360px] max-w-[calc(100vw-24px)]">
          <Popover.Dialog aria-label="Notificaciones" className="p-0">
            <div className="flex items-center justify-between gap-3 border-b border-line px-4 py-2.5">
              <p className="text-[14px] font-semibold text-ink">Notificaciones</p>
              {unread > 0 && (
                <MarkAllReadButton upToId={upToId} label="Marcar leídas" variant="ghost" onDone={markAllLocally} />
              )}
            </div>
            <div className="max-h-[min(60dvh,440px)] overflow-y-auto p-2">{list}</div>
            <div className="flex border-t border-line p-2">{seeAll}</div>
          </Popover.Dialog>
        </Popover.Content>
      </Popover>

      <Drawer isOpen={!desktop && open} onOpenChange={handleOpenChange}>
        <Drawer.Backdrop>
          <Drawer.Content placement="bottom">
            <Drawer.Dialog aria-label="Notificaciones" className="max-h-[86dvh] bg-canvas">
              <Drawer.Handle />
              <Drawer.Header>
                <Drawer.Heading className="font-display text-[18px] text-navy-900">Notificaciones</Drawer.Heading>
              </Drawer.Header>
              <Drawer.Body className="-mx-2">{list}</Drawer.Body>
              <Drawer.Footer className="flex w-full gap-2 pb-[max(0px,env(safe-area-inset-bottom))]">
                {unread > 0 && (
                  <MarkAllReadButton
                    upToId={upToId}
                    label="Marcar leídas"
                    variant="outline"
                    className="flex-1"
                    onDone={markAllLocally}
                  />
                )}
                {seeAll}
              </Drawer.Footer>
            </Drawer.Dialog>
          </Drawer.Content>
        </Drawer.Backdrop>
      </Drawer>
    </>
  );
}
