import type { Metadata } from "next";
import { Suspense } from "react";
import { PackageSearch } from "lucide-react";
import { EmptyState } from "@/components/empty-state";
import { ProductCard } from "@/components/product-card";
import { ProductGrid, ProductGridCell } from "@/components/product-grid";
import { ScreenHeader } from "@/components/screen-header";
import { CatalogResultsSkeleton } from "@/components/skeletons";
import { CatalogFilters } from "@/modules/products/components/catalog-filters";
import {
  getCatalogCategories,
  getCatalogProducts,
} from "@/modules/products/queries/catalog-queries";

export const metadata: Metadata = { title: "Catálogo" };
export const dynamic = "force-dynamic";

interface CatalogPageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

function firstValue(value: string | string[] | undefined): string {
  if (Array.isArray(value)) return value[0] ?? "";
  return value ?? "";
}

/** Sin `loading.tsx` a propósito: la cabecera y los chips se quedan en su
 *  sitio al cambiar de filtro y solo la retícula pasa por el esqueleto. El
 *  chip pulsado se marca pendiente mientras llega la respuesta. */
export default async function CatalogPage({ searchParams }: CatalogPageProps) {
  const params = await searchParams;
  const q = firstValue(params.q);
  const category = firstValue(params.cat);

  const categories = await getCatalogCategories();
  const activeCategory = categories.find((c) => c.slug === category);

  return (
    <>
      <ScreenHeader
        eyebrow="Catálogo"
        title={activeCategory ? activeCategory.name : q ? `Resultados para "${q}"` : "Todos los productos"}
      />
      <div className="mx-auto flex w-full max-w-[1120px] flex-1 flex-col gap-6 px-5 pb-10 md:px-6">
        <CatalogFilters categories={categories} activeSlug={category} query={q} />
        <Suspense fallback={<CatalogResultsSkeleton />}>
          <CatalogResults q={q} category={category} />
        </Suspense>
      </div>
    </>
  );
}

async function CatalogResults({ q, category }: { q: string; category: string }) {
  const products = await getCatalogProducts({ q, category: category || undefined });

  if (products.length === 0) {
    return (
      <EmptyState
        icon={PackageSearch}
        title={q || category ? "Sin resultados" : "Todavía no hay productos"}
        description={
          q || category
            ? "Prueba con otra búsqueda o categoría."
            : "El catálogo se llenará cuando el administrador publique productos."
        }
        ctaLabel="Ver todo el catálogo"
        ctaHref="/catalogo"
      />
    );
  }

  return (
    <>
      <p className="tabular text-[12.5px] text-slate-400">
        {products.length} {products.length === 1 ? "producto" : "productos"}
      </p>
      <ProductGrid>
        {products.map((product, i) => (
          <ProductGridCell key={product.productId}>
            <ProductCard product={product} priority={i < 4} />
          </ProductGridCell>
        ))}
      </ProductGrid>
    </>
  );
}
