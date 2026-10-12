import type { Metadata } from "next";
import { BadgePercent } from "lucide-react";
import { ButtonLink } from "@/components/button-link";
import { EmptyState } from "@/components/empty-state";
import { ProductCard } from "@/components/product-card";
import { ProductGrid, ProductGridCell } from "@/components/product-grid";
import { ScreenHeader } from "@/components/screen-header";
import { ComboCard } from "@/modules/combos/components/combo-card";
import { getCatalogCombos } from "@/modules/combos/queries/combo-catalog-queries";
import { getOnSaleProducts } from "@/modules/products/queries/catalog-queries";

export const metadata: Metadata = { title: "Ofertas" };
export const dynamic = "force-dynamic";

export default async function OffersPage() {
  const [products, combos] = await Promise.all([getOnSaleProducts(), getCatalogCombos()]);
  // Solo los combos que de verdad ahorran: un paquete al mismo precio no es oferta.
  const savingCombos = combos.filter((c) => c.savingsPct > 0);
  const empty = products.length === 0 && savingCombos.length === 0;

  return (
    <>
      <ScreenHeader
        eyebrow="Ofertas"
        title="Rebajas y combos"
        description="Productos con el precio rebajado y combos que salen más baratos que comprar por separado. Los precios ya están en tu moneda."
      />
      <div className="mx-auto flex w-full max-w-[1120px] flex-1 flex-col gap-10 px-5 pb-10 md:px-6">
        {empty ? (
          <EmptyState
            icon={BadgePercent}
            title="Sin ofertas por ahora"
            description="Cuando haya productos rebajados o combos con descuento aparecerán aquí."
            ctaLabel="Ver catálogo"
            ctaHref="/catalogo"
          />
        ) : (
          <>
            {products.length > 0 && (
              <section>
                <div className="flex items-end justify-between gap-4">
                  <div>
                    <p className="eyebrow">Rebajados</p>
                    <h2 className="font-display mt-2 text-[20px] leading-tight text-navy-900 md:text-[24px]">
                      Productos con descuento
                    </h2>
                  </div>
                  <p className="tabular text-[12.5px] text-slate-400">
                    {products.length} {products.length === 1 ? "producto" : "productos"}
                  </p>
                </div>
                <ProductGrid className="mt-5">
                  {products.map((product, i) => (
                    <ProductGridCell key={product.productId}>
                      <ProductCard product={product} priority={i < 4} />
                    </ProductGridCell>
                  ))}
                </ProductGrid>
              </section>
            )}

            {savingCombos.length > 0 && (
              <section>
                <div className="flex items-end justify-between gap-4">
                  <div>
                    <p className="eyebrow">Combos</p>
                    <h2 className="font-display mt-2 text-[20px] leading-tight text-navy-900 md:text-[24px]">
                      Paquetes que ahorran
                    </h2>
                  </div>
                  <ButtonLink href="/combos" variant="ghost" size="sm">
                    Ver todos
                  </ButtonLink>
                </div>
                <ProductGrid className="mt-5">
                  {savingCombos.map((combo) => (
                    <ProductGridCell key={combo.comboId}>
                      <ComboCard combo={combo} />
                    </ProductGridCell>
                  ))}
                </ProductGrid>
              </section>
            )}
          </>
        )}
      </div>
    </>
  );
}
