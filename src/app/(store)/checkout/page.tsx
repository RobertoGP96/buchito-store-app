import type { Metadata } from "next";
import { ClipboardList } from "lucide-react";
import { EmptyState } from "@/components/empty-state";
import { ScreenHeader } from "@/components/screen-header";

export const metadata: Metadata = { title: "Finalizar compra" };
export const dynamic = "force-dynamic";

export default function CheckoutPage() {
  return (
    <>
      <ScreenHeader eyebrow="Tu compra" title="Finalizar compra" backHref="/carrito" />
      <div className="mx-auto flex w-full max-w-[1120px] flex-1 flex-col px-5 pb-10 md:px-6">
        <EmptyState
          icon={ClipboardList}
          title="Nada que pagar todavía"
          description="Añade productos a la bolsa antes de finalizar la compra."
          ctaLabel="Ir al catálogo"
          ctaHref="/catalogo"
        />
      </div>
    </>
  );
}
