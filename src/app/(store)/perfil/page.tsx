import type { Metadata } from "next";
import { MapPin, Package, UserRound } from "lucide-react";
import { auth } from "@/lib/auth";
import { ROLE_LABELS, isRole } from "@/lib/roles";
import { ButtonLink } from "@/components/button-link";
import { ScreenHeader } from "@/components/screen-header";
import { LogoutButton } from "@/modules/auth/components/logout-button";

export const metadata: Metadata = { title: "Mi perfil" };
export const dynamic = "force-dynamic";

export default async function ProfilePage() {
  const session = await auth();
  const user = session!.user;
  const roleLabel = isRole(user.role) ? ROLE_LABELS[user.role] : user.role;

  return (
    <>
      <ScreenHeader eyebrow="Tu cuenta" title="Mi perfil">
        <LogoutButton />
      </ScreenHeader>
      <div className="mx-auto grid w-full max-w-[1120px] flex-1 gap-4 px-5 pb-10 md:grid-cols-2 md:px-6">
        <section className="rounded-card bg-canvas p-5 shadow-card md:p-6">
          <div className="flex items-center gap-3">
            <span className="flex h-11 w-11 items-center justify-center rounded-full bg-tint text-navy-700">
              <UserRound className="h-5 w-5" strokeWidth={1.9} />
            </span>
            <div className="min-w-0">
              <p className="truncate text-[15px] font-semibold text-ink">{user.fullName}</p>
              <p className="truncate text-[12.5px] text-slate-400">{user.email}</p>
            </div>
          </div>
          <dl className="mt-5 grid grid-cols-[auto_1fr] gap-x-6 gap-y-2 text-[13px]">
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
            Guarda a quién y dónde entregamos tus pedidos para elegirlo con un toque al finalizar la compra.
          </p>
          <ButtonLink href="/perfil/destinatarios" variant="soft" className="mt-auto self-start pt-3">
            Gestionar destinatarios
          </ButtonLink>
        </section>
      </div>
    </>
  );
}
