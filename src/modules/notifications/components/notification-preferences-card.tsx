"use client";

import { useState } from "react";
import { Button } from "@heroui/react";
import { Bell, SlidersHorizontal } from "lucide-react";
import { ButtonLink } from "@/components/button-link";
import { lazyDialog } from "@/components/lazy-dialog";
import { StatusChip } from "@/components/status-chip";
import type { Role } from "@/lib/roles";
import { ROLE_CATEGORIES, categoryCopy, type NotificationCategory } from "../lib/labels";

const NotificationPreferencesDialog = lazyDialog(() =>
  import("./notification-preferences-dialog").then((m) => m.NotificationPreferencesDialog)
);

interface PreferencesProps {
  role: Role;
  muted: NotificationCategory[];
}

/** Botón que abre las preferencias (la bandeja del admin lo usa sin la card).
 *  Montarlo con `key={muted.join(",")}` para que se remonte cerrado al guardar. */
export function NotificationPreferencesButton({
  role,
  muted,
  label = "Preferencias",
  variant = "outline",
}: PreferencesProps & { label?: string; variant?: "outline" | "ghost" }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button variant={variant} size="sm" className="rounded-full" onPress={() => setOpen(true)}>
        <SlidersHorizontal className="h-3.5 w-3.5" strokeWidth={1.9} />
        {label}
      </Button>
      <NotificationPreferencesDialog open={open} onOpenChange={setOpen} role={role} muted={muted} />
    </>
  );
}

/** Card «Notificaciones» de Mi perfil: qué categorías llegan y acceso a la bandeja. */
export function NotificationPreferencesCard({ role, muted, inboxHref }: PreferencesProps & { inboxHref: string }) {
  const categories = ROLE_CATEGORIES[role];
  const mutedCount = categories.filter((c) => muted.includes(c)).length;

  return (
    <section className="flex flex-col rounded-card bg-canvas p-5 shadow-card md:p-6">
      <div className="flex items-center gap-3">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-tint text-navy-700">
          <Bell className="h-5 w-5" strokeWidth={1.9} />
        </span>
        <p className="min-w-0 flex-1 text-[15px] font-semibold text-ink">Notificaciones</p>
        <StatusChip
          label={mutedCount === 0 ? "Todas activas" : mutedCount === 1 ? "1 silenciada" : `${mutedCount} silenciadas`}
          tone={mutedCount === 0 ? "success" : "neutral"}
        />
      </div>

      <p className="mt-3 text-[13px] leading-[1.6] text-slate-500">
        Elige qué avisos quieres recibir. Los que silencies no se generan y no aparecerán después en tu bandeja.
      </p>

      <dl className="mt-4 grid grid-cols-[1fr_auto] gap-x-6 gap-y-2 text-[13px]">
        {categories.map((category) => (
          <div key={category} className="contents">
            <dt className="text-slate-500">{categoryCopy(role, category).label}</dt>
            <dd className={muted.includes(category) ? "font-medium text-slate-400" : "font-medium text-ink"}>
              {muted.includes(category) ? "Silenciada" : "Activa"}
            </dd>
          </div>
        ))}
      </dl>

      <div className="mt-auto flex flex-wrap gap-2 pt-4">
        <ButtonLink href={inboxHref} variant="soft" size="sm">
          Ver notificaciones
        </ButtonLink>
        <NotificationPreferencesButton role={role} muted={muted} label="Configurar" />
      </div>
    </section>
  );
}
