import { PackageOpen } from "lucide-react";
import { ButtonLink } from "@/components/button-link";
import { EmptyState } from "@/components/empty-state";
import { ProductCard } from "@/components/product-card";
import { ProductGrid, ProductGridCell } from "@/components/product-grid";
import { STORE_NAME } from "@/lib/config";
import { getFeaturedProducts } from "@/modules/products/queries/catalog-queries";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const featured = await getFeaturedProducts(8);

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
          <div className="flex items-end justify-between gap-4">
            <div>
              <p className="eyebrow">Destacados</p>
              <h2 className="font-display mt-2 text-[20px] leading-tight text-navy-900 md:text-[24px]">
                Lo más pedido
              </h2>
            </div>
            <ButtonLink href="/catalogo" variant="ghost" size="sm">
              Ver todo
            </ButtonLink>
          </div>
          {featured.length === 0 ? (
            <EmptyState
              icon={PackageOpen}
              title="Pronto habrá productos"
              description="Cuando el catálogo tenga productos destacados aparecerán aquí."
              ctaLabel="Explorar catálogo"
              ctaHref="/catalogo"
              size="compact"
            />
          ) : (
            <ProductGrid className="mt-5">
              {featured.map((product, i) => (
                <ProductGridCell key={product.productId}>
                  <ProductCard product={product} priority={i < 4} />
                </ProductGridCell>
              ))}
            </ProductGrid>
          )}
        </section>
      </div>
    </>
  );
}
