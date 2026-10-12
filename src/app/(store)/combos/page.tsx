import type { Metadata } from "next";
import { Gift } from "lucide-react";
import { EmptyState } from "@/components/empty-state";
import { ProductGrid, ProductGridCell } from "@/components/product-grid";
import { ScreenHeader } from "@/components/screen-header";
import { ComboCard } from "@/modules/combos/components/combo-card";
import { getCatalogCombos } from "@/modules/combos/queries/combo-catalog-queries";

export const metadata: Metadata = { title: "Combos" };
export const dynamic = "force-dynamic";

export default async function CombosPage() {
  const combos = await getCatalogCombos();

  return (
    <>
      <ScreenHeader
        eyebrow="Combos"
        title="Más por menos"
        description="Paquetes de productos a un precio cerrado. Cada combo muestra lo que incluye y cuánto ahorras frente a comprarlo por separado."
      />
      <div className="mx-auto flex w-full max-w-[1120px] flex-1 flex-col gap-6 px-5 pb-10 md:px-6">
        {combos.length === 0 ? (
          <EmptyState
            icon={Gift}
            title="Pronto habrá combos"
            description="Cuando la tienda arme paquetes de productos aparecerán aquí."
            ctaLabel="Ver catálogo"
            ctaHref="/catalogo"
          />
        ) : (
          <>
            <p className="tabular text-[12.5px] text-slate-400">
              {combos.length} {combos.length === 1 ? "combo" : "combos"}
            </p>
            <ProductGrid>
              {combos.map((combo, i) => (
                <ProductGridCell key={combo.comboId}>
                  <ComboCard combo={combo} priority={i < 4} />
                </ProductGridCell>
              ))}
            </ProductGrid>
          </>
        )}
      </div>
    </>
  );
}
