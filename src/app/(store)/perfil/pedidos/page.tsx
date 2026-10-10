import type { Metadata } from "next";
import { Package } from "lucide-react";
import { EmptyState } from "@/components/empty-state";
import { ScreenHeader } from "@/components/screen-header";

export const metadata: Metadata = { title: "Mis pedidos" };
export const dynamic = "force-dynamic";

export default function MyOrdersPage() {
  return (
    <>
      <ScreenHeader eyebrow="Tu cuenta" title="Mis pedidos" backHref="/perfil" />
      <div className="mx-auto flex w-full max-w-[1120px] flex-1 flex-col px-5 pb-10 md:px-6">
        <EmptyState
          icon={Package}
          title="Todavía no tienes pedidos"
          description="Cuando hagas tu primera compra, aquí verás su estado y seguimiento."
          ctaLabel="Ir al catálogo"
          ctaHref="/catalogo"
        />
      </div>
    </>
  );
}
