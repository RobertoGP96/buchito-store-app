import { PackageOpen } from "lucide-react";
import { ButtonLink } from "@/components/button-link";
import { EmptyState } from "@/components/empty-state";
import { STORE_NAME } from "@/lib/config";

export const dynamic = "force-dynamic";

export default function HomePage() {
  return (
    <>
      <section className="border-b border-line bg-canvas px-5 pt-14 pb-12 text-center md:px-10 md:pt-[72px] md:pb-16">
        <p className="eyebrow text-navy-700">Bienvenido a {STORE_NAME}</p>
        <h1 className="font-display mx-auto mt-5 max-w-[640px] text-[30px] leading-[1.05] text-navy-900 md:text-[48px]">
          Todo lo que necesitas, entregado en tu puerta.
        </h1>
        <p className="mx-auto mt-5 max-w-[470px] text-[14px] leading-[1.7] text-pretty text-slate-500 md:text-[15px]">
          Productos de distintos tipos, precios claros en tu moneda y entrega a
          domicilio con seguimiento.
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-3.5">
          <ButtonLink href="/catalogo" variant="solid" size="lg">
            Ver catálogo
          </ButtonLink>
          <ButtonLink href="/perfil/pedidos" variant="outline" size="lg">
            Mis pedidos
          </ButtonLink>
        </div>
      </section>

      <div className="mx-auto flex w-full max-w-[1120px] flex-1 flex-col px-5 py-10 md:px-6 md:py-11">
        <section>
          <p className="eyebrow">Destacados</p>
          <h2 className="font-display mt-2 text-[20px] leading-tight text-navy-900 md:text-[24px]">
            Lo más pedido
          </h2>
          <EmptyState
            icon={PackageOpen}
            title="Pronto habrá productos"
            description="Cuando el catálogo tenga productos destacados aparecerán aquí."
            ctaLabel="Explorar catálogo"
            ctaHref="/catalogo"
            size="compact"
          />
        </section>
      </div>
    </>
  );
}
