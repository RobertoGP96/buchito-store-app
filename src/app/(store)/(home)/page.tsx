import Link from "next/link";
import { ArrowRight, BadgePercent, Gift, PackageOpen, Sparkles, Wallet, type LucideIcon } from "lucide-react";
import { ButtonLink } from "@/components/button-link";
import { EmptyState } from "@/components/empty-state";
import { ProductCard } from "@/components/product-card";
import { ProductGrid, ProductGridCell } from "@/components/product-grid";
import { STORE_NAME } from "@/lib/config";
import { ComboCard } from "@/modules/combos/components/combo-card";
import { getCatalogCombos } from "@/modules/combos/queries/combo-catalog-queries";
import { getFeaturedProducts, getNewestProducts } from "@/modules/products/queries/catalog-queries";

export const dynamic = "force-dynamic";

interface InfoLink {
  href: string;
  icon: LucideIcon;
  title: string;
  description: string;
}

// Las tres vistas informativas de la tienda, enlazadas desde la portada
// porque en móvil no caben en la barra inferior.
const INFO_LINKS: InfoLink[] = [
  { href: "/combos", icon: Gift, title: "Combos", description: "Paquetes de productos a precio cerrado." },
  { href: "/ofertas", icon: BadgePercent, title: "Ofertas", description: "Rebajas y combos que ahorran." },
  { href: "/pagos", icon: Wallet, title: "Formas de pago", description: "Métodos, monedas y tasa del día." },
];

/** Una fila completa en desktop; se piden de más por si hay que descartar destacados. */
const NEWEST_LIMIT = 4;

export default async function HomePage() {
  const [featured, newest, combos] = await Promise.all([
    getFeaturedProducts(8),
    getNewestProducts(NEWEST_LIMIT + 8),
    getCatalogCombos({ limit: 4 }),
  ]);
  // Un producto destacado y recién creado ya está arriba: no se repite.
  const featuredIds = new Set(featured.map((p) => p.productId));
  const recentlyAdded = newest.filter((p) => !featuredIds.has(p.productId)).slice(0, NEWEST_LIMIT);

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

      <div className="mx-auto flex w-full max-w-[1120px] flex-1 flex-col gap-11 px-5 py-10 md:px-6 md:py-11">
        {recentlyAdded.length > 0 && (
          <section>
            <div className="flex items-end justify-between gap-4">
              <div>
                <p className="eyebrow inline-flex items-center gap-1.5">
                  <Sparkles className="h-3.5 w-3.5" strokeWidth={2} />
                  Novedades
                </p>
                <h2 className="font-display mt-2 text-[20px] leading-tight text-navy-900 md:text-[24px]">
                  Recién añadidos
                </h2>
              </div>
              <ButtonLink href="/catalogo" variant="ghost" size="sm">
                Ver catálogo
              </ButtonLink>
            </div>
            <ProductGrid className="mt-5">
              {/* Solo la primera fila: a 375px la segunda queda bajo el pliegue. */}
              {recentlyAdded.map((product, i) => (
                <ProductGridCell key={product.productId}>
                  <ProductCard product={product} priority={i < 2} />
                </ProductGridCell>
              ))}
            </ProductGrid>
          </section>
        )}

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
              {featured.map((product) => (
                <ProductGridCell key={product.productId}>
                  <ProductCard product={product} />
                </ProductGridCell>
              ))}
            </ProductGrid>
          )}
        </section>

        {combos.length > 0 && (
          <section>
            <div className="flex items-end justify-between gap-4">
              <div>
                <p className="eyebrow">Combos</p>
                <h2 className="font-display mt-2 text-[20px] leading-tight text-navy-900 md:text-[24px]">
                  Más por menos
                </h2>
              </div>
              <ButtonLink href="/combos" variant="ghost" size="sm">
                Ver todos
              </ButtonLink>
            </div>
            <ProductGrid className="mt-5">
              {combos.map((combo) => (
                <ProductGridCell key={combo.comboId}>
                  <ComboCard combo={combo} />
                </ProductGridCell>
              ))}
            </ProductGrid>
          </section>
        )}

        <section className="grid gap-3 sm:grid-cols-3">
          {INFO_LINKS.map((link) => {
            const Icon = link.icon;
            return (
              <Link
                key={link.href}
                href={link.href}
                className="group flex items-center gap-3.5 rounded-card bg-canvas p-4 shadow-card transition-[box-shadow,transform] duration-200 hover:shadow-float motion-safe:hover:-translate-y-0.5"
              >
                <span className="flex h-11 w-11 flex-none items-center justify-center rounded-field bg-tint text-navy-700">
                  <Icon className="h-5 w-5" strokeWidth={1.9} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-[14.5px] font-semibold text-ink">{link.title}</span>
                  <span className="block text-[12.5px] leading-[1.5] text-slate-500">{link.description}</span>
                </span>
                <ArrowRight
                  className="h-4 w-4 flex-none text-slate-300 transition-transform motion-safe:group-hover:translate-x-0.5"
                  strokeWidth={2}
                />
              </Link>
            );
          })}
        </section>
      </div>
    </>
  );
}
