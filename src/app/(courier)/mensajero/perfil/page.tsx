import type { Metadata } from "next";
import { UserRound } from "lucide-react";
import { auth } from "@/lib/auth";
import { fmtDate } from "@/lib/format";
import { Money } from "@/components/money";
import { PageHeader } from "@/components/page-header";
import { StatusChip } from "@/components/status-chip";
import { LogoutButton } from "@/modules/auth/components/logout-button";
import { TwoFactorCard } from "@/modules/auth/components/two-factor-card";
import { getTwoFactorStatus } from "@/modules/auth/queries/two-factor-queries";
import { CourierInactive } from "@/modules/deliveries/components/courier-inactive";
import { CourierProfileEditButton } from "@/modules/deliveries/components/courier-profile-edit-button";
import { VEHICLE_LABELS } from "@/modules/deliveries/lib/labels";
import { getCourierProfile } from "@/modules/deliveries/queries/courier-queries";

export const metadata: Metadata = { title: "Mi perfil" };
export const dynamic = "force-dynamic";

export default async function CourierProfilePage() {
  const session = await auth();
  const user = session!.user;
  const [profile, twoFactor] = await Promise.all([getCourierProfile(user.userId), getTwoFactorStatus(user.userId)]);
  if (!profile) return <CourierInactive />;

  return (
    <>
      <PageHeader icon={UserRound} title="Mi perfil" description="Tus datos de mensajero y la seguridad de tu cuenta.">
        <LogoutButton />
      </PageHeader>

      <section className="rounded-card bg-canvas p-5 shadow-card">
        <div className="flex items-start justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <span className="flex h-11 w-11 flex-none items-center justify-center rounded-full bg-tint text-navy-700">
              <UserRound className="h-5 w-5" strokeWidth={1.9} />
            </span>
            <div className="min-w-0">
              <p className="truncate text-[15px] font-semibold text-ink">{profile.fullName}</p>
              <p className="truncate text-[12.5px] text-slate-400">{profile.email}</p>
            </div>
          </div>
          {/* La clave remonta el botón (y cierra su diálogo) cuando los datos cambian. */}
          <CourierProfileEditButton
            key={`${profile.fullName}|${profile.phone}`}
            profile={{ fullName: profile.fullName, phone: profile.phone }}
          />
        </div>
        <dl className="mt-5 grid grid-cols-[auto_1fr] gap-x-6 gap-y-2 text-[13px]">
          <dt className="text-slate-400">Teléfono</dt>
          <dd className="tabular font-medium text-ink">{profile.phone}</dd>
          <dt className="text-slate-400">Vehículo</dt>
          <dd className="font-medium text-ink">{VEHICLE_LABELS[profile.vehicle]}</dd>
          <dt className="text-slate-400">Pago por entrega</dt>
          <dd className="font-medium text-ink">
            <Money value={profile.deliveryFee} />
          </dd>
          <dt className="text-slate-400">Estado</dt>
          <dd>
            <StatusChip label={profile.active ? "Activo" : "Inactivo"} tone={profile.active ? "success" : "neutral"} />
          </dd>
          <dt className="text-slate-400">Mensajero desde</dt>
          <dd className="tabular font-medium text-ink">{fmtDate(profile.createdAt)}</dd>
        </dl>
      </section>

      <TwoFactorCard status={twoFactor} />
    </>
  );
}
