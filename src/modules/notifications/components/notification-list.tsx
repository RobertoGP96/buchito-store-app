"use client";

import Link from "next/link";
import { useState } from "react";
import { Button, toast } from "@heroui/react";
import { BellOff, Boxes, CheckCheck, Inbox, Receipt, Truck, type LucideIcon } from "lucide-react";
import { EmptyState } from "@/components/empty-state";
import { fmtDateTime } from "@/lib/format";
import { cn } from "@/lib/utils";
import { markAllNotificationsRead, markNotificationRead } from "../actions/notification-actions";
import { EMPTY_COPY, INBOX_SIZE, type Audience, type NotificationCategory, type NotificationRow } from "../lib/labels";

/** Lo emiten quienes cambian el estado de lectura fuera de la campana (la
 *  bandeja): la campana se refresca al oírlo, sin esperar a su intervalo. */
export const NOTIFICATIONS_CHANGED_EVENT = "notifications:changed";

export function emitNotificationsChanged(): void {
  window.dispatchEvent(new Event(NOTIFICATIONS_CHANGED_EVENT));
}

const CATEGORY_ICON: Record<NotificationCategory, LucideIcon> = {
  orders: Inbox,
  deliveries: Truck,
  payments: Receipt,
  stock: Boxes,
};

interface NotificationListProps {
  items: NotificationRow[];
  variant: "panel" | "page";
  audience: Audience;
  /** Destino de los avisos sin enlace propio. */
  inboxHref: string;
  /** Ids marcados como leídos fuera de la lista (marcar todas desde la campana). */
  readOverride?: (item: NotificationRow) => boolean;
  onRead?: (notificationId: number) => void;
  onNavigate?: () => void;
}

/** Lista de avisos de la campana y de las bandejas. Tocar uno lo marca leído
 *  (en local al instante; en el servidor sin esperar) y abre su enlace. */
export function NotificationList({
  items,
  variant,
  audience,
  inboxHref,
  readOverride,
  onRead,
  onNavigate,
}: NotificationListProps) {
  const [readIds, setReadIds] = useState<ReadonlySet<number>>(() => new Set());

  if (items.length === 0) {
    const empty = (
      <EmptyState
        icon={BellOff}
        size={variant === "panel" ? "compact" : "default"}
        title={EMPTY_COPY[audience].title}
        description={EMPTY_COPY[audience].description}
      />
    );
    return variant === "page" ? <div className="rounded-card bg-canvas shadow-card">{empty}</div> : empty;
  }

  const markRead = (item: NotificationRow) => {
    setReadIds((prev) => new Set(prev).add(item.notificationId));
    onRead?.(item.notificationId);
    markNotificationRead(item.notificationId).catch((error) => console.error("markNotificationRead:", error));
  };

  return (
    <>
      <ul
        className={cn(
          variant === "page"
            ? "divide-y divide-line-soft overflow-hidden rounded-card bg-canvas shadow-card"
            : "flex flex-col gap-0.5"
        )}
      >
        {items.map((item) => {
          const isRead = item.readAt != null || readIds.has(item.notificationId) || (readOverride?.(item) ?? false);
          const Icon = CATEGORY_ICON[item.category];
          return (
            <li key={item.notificationId}>
              <Link
                href={item.href ?? inboxHref}
                onClick={() => {
                  if (!isRead) markRead(item);
                  onNavigate?.();
                }}
                className={cn(
                  "flex min-h-11 items-start gap-3 px-3 py-3 transition-colors duration-150",
                  variant === "panel" ? "rounded-field" : "md:px-4",
                  isRead ? "hover:bg-hover" : "bg-tint/40 hover:bg-tint/70"
                )}
              >
                <span className="flex h-9 w-9 flex-none items-center justify-center rounded-full bg-tint text-navy-700">
                  <Icon className="h-4 w-4" strokeWidth={1.9} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className={cn("block text-[13.5px] leading-snug text-ink", isRead ? "font-medium" : "font-semibold")}>
                    {item.title}
                  </span>
                  <span className="mt-0.5 line-clamp-2 block text-[12.5px] leading-[1.5] text-slate-500">{item.body}</span>
                  {/* La hora se formatea con la zona de quien pinta: el servidor
                      (UTC en producción) y el navegador pueden diferir. */}
                  <time
                    dateTime={item.createdAt}
                    suppressHydrationWarning
                    className="tabular mt-1 block text-[11.5px] text-slate-400"
                  >
                    {fmtDateTime(item.createdAt)}
                  </time>
                </span>
                {!isRead && (
                  <>
                    <span aria-hidden className="mt-2 h-2 w-2 flex-none rounded-full bg-gold-500" />
                    <span className="sr-only">No leída</span>
                  </>
                )}
              </Link>
            </li>
          );
        })}
      </ul>
      {variant === "page" && items.length >= INBOX_SIZE && (
        <p className="mt-3 text-center text-[12.5px] text-slate-400">
          Se muestran las últimas {INBOX_SIZE} notificaciones.
        </p>
      )}
    </>
  );
}

interface MarkAllReadButtonProps {
  /** Último aviso que el usuario tiene en pantalla: los posteriores no se tocan. */
  upToId: number | null;
  label?: string;
  variant?: "outline" | "ghost";
  className?: string;
  onDone?: () => void;
}

export function MarkAllReadButton({
  upToId,
  label = "Marcar todas como leídas",
  variant = "outline",
  className,
  onDone,
}: MarkAllReadButtonProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const run = async () => {
    setIsSubmitting(true);
    try {
      const result = await markAllNotificationsRead(upToId);
      if (!result.success) {
        toast.danger(result.error);
        return;
      }
      onDone?.();
      emitNotificationsChanged();
    } catch (error) {
      console.error("MarkAllReadButton:", error);
      toast.danger("No se pudieron marcar como leídas");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Button
      variant={variant}
      size="sm"
      className={cn("rounded-full", className)}
      isPending={isSubmitting}
      isDisabled={isSubmitting}
      onPress={() => void run()}
    >
      <CheckCheck className="h-4 w-4" strokeWidth={1.9} />
      {label}
    </Button>
  );
}
