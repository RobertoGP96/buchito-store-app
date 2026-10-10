import type { Metadata } from "next";
import { PackageSearch } from "lucide-react";
import { EmptyState } from "@/components/empty-state";
import { ScreenHeader } from "@/components/screen-header";

export const metadata: Metadata = { title: "Catálogo" };
export const dynamic = "force-dynamic";

export default function CatalogPage() {
  return (
    <>
      <ScreenHeader eyebrow="Catálogo" title="Todos los productos" />
      <div className="mx-auto flex w-full max-w-[1120px] flex-1 flex-col px-5 pb-10 md:px-6">
        <EmptyState
          icon={PackageSearch}
          title="Todavía no hay productos"
          description="El catálogo se llenará cuando el administrador publique productos."
          ctaLabel="Volver al inicio"
          ctaHref="/"
        />
      </div>
    </>
  );
}
