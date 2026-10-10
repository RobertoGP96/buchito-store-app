import type { Metadata } from "next";
import { ShoppingBag } from "lucide-react";
import { EmptyState } from "@/components/empty-state";
import { ScreenHeader } from "@/components/screen-header";

export const metadata: Metadata = { title: "Bolsa" };

export default function CartPage() {
  return (
    <>
      <ScreenHeader eyebrow="Tu compra" title="Bolsa" />
      <div className="mx-auto flex w-full max-w-[1120px] flex-1 flex-col px-5 pb-10 md:px-6">
        <EmptyState
          icon={ShoppingBag}
          title="Tu bolsa está vacía"
          description="Añade productos desde el catálogo para verlos aquí."
          ctaLabel="Ir al catálogo"
          ctaHref="/catalogo"
        />
      </div>
    </>
  );
}
