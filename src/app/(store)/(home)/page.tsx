import Link from "next/link";
import { ArrowRight, BadgePercent, Gift, PackageOpen, Sparkles, Wallet, type LucideIcon } from "lucide-react";
import { ButtonLink } from "@/components/button-link";
import { EmptyState } from "@/components/empty-state";
import { BenefitsStrip } from "@/components/layout/store/benefits-strip";
import { Money } from "@/components/money";
import { ProductCard } from "@/components/product-card";
import { ProductGrid, ProductGridCell } from "@/components/product-grid";
import { ProductImage } from "@/components/product-image";
import { SectionHeader } from "@/components/section-header";
import { STORE_NAME } from "@/lib/config";
import { ComboCard } from "@/modules/combos/components/combo-card";
import { getCatalogCombos } from "@/modules/combos/queries/combo-catalog-queries";
import { getFeaturedProducts, getNewestProducts, type CatalogProduct } from "@/modules/products/queries/catalog-queries";

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

const SECTION = "mx-auto w-full max-w-[1120px] px-5 md:px-6";

/** Escaparate del hero: la foto de un producto con su nombre y precio.
 *  Solo desde `md`: en móvil empujaría la retícula bajo el pliegue. */
function HeroShowcase({ product }: { product: CatalogProduct }) {
  return (
    <Link
      href={`/producto/${encodeURIComponent(product.slug)}`}
      className="group relative hidden aspect-[5/4] w-full overflow-hidden rounded-sheet bg-crema-100 shadow-float md:block"
    >
      <span className="absolute inset-0 flex items-center justify-center transition-transform duration-700 ease-out motion-safe:group-hover:scale-[1.04]">
        <ProductImage src={product.imageUrl} alt="" sizes="(min-width: 1120px) 500px, 45vw" priority />
      </span>
      <span className="absolute inset-x-3 bottom-3 flex items-center justify-between gap-3 rounded-card bg-canvas/95 px-4 py-3 shadow-card">
        <span className="min-w-0">
          <span className="eyebrow block text-caramelo-700">{product.featured ? "Destacado" : "Novedad"}</span>
          <span className="type-body mt-1 block truncate leading-tight font-semibold text-ink">{product.name}</span>
        </span>
        <span className="flex flex-none items-center gap-2">
          <span className="num-display text-[16px] text-espresso-900">
            <Money value={product.defaultVariant.price} />
          </span>
          <ArrowRight
            className="h-4 w-4 text-tostado-700 transition-transform motion-safe:group-hover:translate-x-0.5"
            strokeWidth={2.2}
            aria-hidden
          />
        </span>
      </span>
    </Link>
  );
}

export default async function HomePage() {
  const [featured, newest, combos] = await Promise.all([
    getFeaturedProducts(8),
    getNewestProducts(NEWEST_LIMIT + 8),
    getCatalogCombos({ limit: 4 }),
  ]);
  // Un producto destacado y recién creado ya está arriba: no se repite.
  const featuredIds = new Set(featured.map((p) => p.productId));
  const recentlyAdded = newest.filter((p) => !featuredIds.has(p.productId)).slice(0, NEWEST_LIMIT);
  // Escaparate: el primer destacado con foto y stock; sin destacados, la novedad.
  const showcase = [...featured, ...newest].find((p) => p.imageUrl && p.totalStock > 0) ?? null;

  return (
    <>
      {/* La banda crema sube bajo la barra café (sus esquinas redondeadas dejan
          ver la página) para que el hero arranque pegado a ella. */}
      <section className="-mt-7 bg-cream pt-7">
        <div
          className={`${SECTION} grid items-center gap-10 pt-10 pb-16 md:pt-14 md:pb-20 ${showcase ? "md:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)]" : ""}`}
        >
          <div className={showcase ? "text-center md:text-left" : "mx-auto max-w-[680px] text-center"}>
            <p className="eyebrow text-tostado-700">Bienvenido a {STORE_NAME}</p>
            <h1 className="font-display type-display mt-4 text-balance text-espresso-900">
              Todo lo que necesitas, entregado en tu puerta.
            </h1>
            <p
              className={`mt-4 max-w-[460px] text-[15px] leading-[1.65] text-pretty text-ink-muted md:text-[16px] ${showcase ? "mx-auto md:mx-0" : "mx-auto"}`}
            >
              Productos de distintos tipos, precios claros en tu moneda y entrega a domicilio con seguimiento.
            </p>
            <div className={`mt-7 flex flex-wrap gap-3 ${showcase ? "justify-center md:justify-start" : "justify-center"}`}>
              <ButtonLink href="/catalogo" variant="solid" size="lg">
                Ver catálogo
                <ArrowRight className="h-4 w-4" strokeWidth={2.2} aria-hidden />
              </ButtonLink>
              <ButtonLink href="/ofertas" variant="outline" size="lg" className="bg-canvas">
                Ver ofertas
              </ButtonLink>
            </div>
          </div>
          {showcase && <HeroShowcase product={showcase} />}
        </div>
      </section>

      {/* La franja monta sobre el borde del hero y cose las dos bandas. */}
      <div className={`${SECTION} -mt-9`}>
        <BenefitsStrip />
      </div>

      <div className="flex flex-1 flex-col gap-12 py-10 md:gap-14 md:py-12">
        {recentlyAdded.length > 0 && (
          <section className={SECTION}>
            <SectionHeader
              eyebrow="Novedades"
              icon={Sparkles}
              title="Recién añadidos"
              action={
                <ButtonLink href="/catalogo" variant="ghost" size="sm">
                  Ver catálogo
                </ButtonLink>
              }
            />
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

        <section className={SECTION}>
          <SectionHeader
            eyebrow="Destacados"
            title="Lo más pedido"
            action={
              <ButtonLink href="/catalogo" variant="ghost" size="sm">
                Ver todo
              </ButtonLink>
            }
          />
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
          // Banda crema a todo el ancho: separa la promoción del catálogo.
          <section className="bg-cream-50 py-10 md:py-12">
            <div className={SECTION}>
              <SectionHeader
                eyebrow="Combos"
                icon={Gift}
                title="Más por menos"
                description="Paquetes a precio cerrado que salen mejor que comprar por separado."
                action={
                  <ButtonLink href="/combos" variant="ghost" size="sm">
                    Ver todos
                  </ButtonLink>
                }
              />
              <ProductGrid className="mt-5">
                {combos.map((combo) => (
                  <ProductGridCell key={combo.comboId}>
                    <ComboCard combo={combo} />
                  </ProductGridCell>
                ))}
              </ProductGrid>
            </div>
          </section>
        )}

        <section className={`${SECTION} grid gap-3 sm:grid-cols-3`}>
          {INFO_LINKS.map((link) => {
            const Icon = link.icon;
            return (
              <Link
                key={link.href}
                href={link.href}
                className="group flex items-center gap-3.5 rounded-card bg-canvas p-4 shadow-card transition-[box-shadow,transform] duration-200 hover:shadow-float motion-safe:hover:-translate-y-0.5"
              >
                <span className="flex h-11 w-11 flex-none items-center justify-center rounded-field bg-crema-100 text-tostado-700">
                  <Icon className="h-5 w-5" strokeWidth={1.9} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="type-subheading block font-semibold text-ink">{link.title}</span>
                  <span className="type-meta block text-ink-muted">{link.description}</span>
                </span>
                <ArrowRight
                  className="h-4 w-4 flex-none text-ink-faint transition-[transform,color] group-hover:text-tostado-700 motion-safe:group-hover:translate-x-0.5"
                  strokeWidth={1.9}
                />
              </Link>
            );
          })}
        </section>
      </div>
    </>
  );
}
