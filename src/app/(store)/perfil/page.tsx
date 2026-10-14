import type { Metadata } from "next";
import { MapPin, Package, UserRound } from "lucide-react";
import { auth } from "@/lib/auth";
import { getSessionCustomer } from "@/lib/auth-guard";
import { ROLE_LABELS, isRole } from "@/lib/roles";
import { ButtonLink } from "@/components/button-link";
import { ScreenHeader } from "@/components/screen-header";
import { LogoutButton } from "@/modules/auth/components/logout-button";
import { TwoFactorCard } from "@/modules/auth/components/two-factor-card";
import { getTwoFactorStatus } from "@/modules/auth/queries/two-factor-queries";
import { ProfileEditButton } from "@/modules/customers/components/profile-edit-button";
import { NotificationPreferencesCard } from "@/modules/notifications/components/notification-preferences-card";
import { inboxHrefForRole } from "@/modules/notifications/lib/labels";
import { getMutedCategories } from "@/modules/notifications/queries/notification-queries";

export const metadata: Metadata = { title: "Mi perfil" };
export const dynamic = "force-dynamic";

export default async function ProfilePage() {
  const [session, customer] = await Promise.all([auth(), getSessionCustomer()]);
  const user = session!.user;
  const roleLabel = isRole(user.role) ? ROLE_LABELS[user.role] : user.role;
  const [twoFactor, muted] = await Promise.all([getTwoFactorStatus(user.userId), getMutedCategories(user.userId)]);

  return (
    <>
      <ScreenHeader eyebrow="Tu cuenta" title="Mi perfil">
        <LogoutButton />
      </ScreenHeader>
      <div className="mx-auto grid w-full max-w-[1120px] flex-1 gap-4 px-5 pb-10 md:grid-cols-2 md:px-6">
        <section className="rounded-card bg-canvas p-5 shadow-card md:col-span-2 md:p-6">
          <div className="flex items-start justify-between gap-3">
            <div className="flex min-w-0 items-center gap-3">
              <span className="flex h-11 w-11 flex-none items-center justify-center rounded-full bg-tint text-navy-700">
                <UserRound className="h-5 w-5" strokeWidth={1.9} />
              </span>
              <div className="min-w-0">
                <p className="truncate text-[15px] font-semibold text-ink">{customer?.name ?? user.fullName}</p>
                <p className="truncate text-[12.5px] text-slate-400">{user.email}</p>
              </div>
            </div>
            {/* La clave remonta el botón (y cierra su diálogo) cuando los datos cambian. */}
            {customer && (
              <ProfileEditButton
                key={`${customer.name}|${customer.phone}`}
                customer={{ fullName: customer.name, phone: customer.phone }}
              />
            )}
          </div>
          <dl className="mt-5 grid grid-cols-[auto_1fr] gap-x-6 gap-y-2 text-[13px]">
            {customer && (
              <>
                <dt className="text-slate-400">Teléfono</dt>
                <dd className="tabular font-medium text-ink">{customer.phone}</dd>
              </>
            )}
            <dt className="text-slate-400">Rol</dt>
            <dd className="font-medium text-ink">{roleLabel}</dd>
          </dl>
        </section>
        <section className="flex flex-col rounded-card bg-canvas p-5 shadow-card md:p-6">
          <div className="flex items-center gap-3">
            <span className="flex h-11 w-11 items-center justify-center rounded-full bg-tint text-navy-700">
              <Package className="h-5 w-5" strokeWidth={1.9} />
            </span>
            <p className="text-[15px] font-semibold text-ink">Mis pedidos</p>
          </div>
          <p className="mt-3 text-[13px] leading-[1.6] text-slate-500">
            Consulta el estado de tus pedidos y el seguimiento de la entrega.
          </p>
          <ButtonLink href="/perfil/pedidos" variant="soft" className="mt-auto self-start pt-3">
            Ver pedidos
          </ButtonLink>
        </section>
        <section className="flex flex-col rounded-card bg-canvas p-5 shadow-card md:p-6">
          <div className="flex items-center gap-3">
            <span className="flex h-11 w-11 items-center justify-center rounded-full bg-tint text-navy-700">
              <MapPin className="h-5 w-5" strokeWidth={1.9} />
            </span>
            <p className="text-[15px] font-semibold text-ink">Mis destinatarios</p>
          </div>
          <p className="mt-3 text-[13px] leading-[1.6] text-slate-500">
            A quién le entregamos tus pedidos: nombre, teléfono y dirección, listos para elegir al comprar.
          </p>
          <ButtonLink href="/perfil/destinatarios" variant="soft" className="mt-auto self-start pt-3">
            Ver destinatarios
          </ButtonLink>
        </section>
        <TwoFactorCard status={twoFactor} />
        {/* La clave remonta la card (y cierra su diálogo) al guardar. */}
        {isRole(user.role) && (
          <NotificationPreferencesCard
            key={muted.join(",")}
            role={user.role}
            muted={muted}
            inboxHref={inboxHrefForRole(user.role)}
          />
        )}
      </div>
    </>
  );
}
