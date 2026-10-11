import type { Metadata } from "next";
import { Package, Tags } from "lucide-react";
import { ButtonLink } from "@/components/button-link";
import { EmptyState } from "@/components/empty-state";
import { PageHeader } from "@/components/page-header";
import { ProductForm } from "@/modules/products/components/product-form";
import { getCategoryTree } from "@/modules/products/queries/category-queries";
import { getProductTypes } from "@/modules/products/queries/product-type-queries";

export const metadata: Metadata = { title: "Nuevo producto" };
export const dynamic = "force-dynamic";

export default async function NewProductPage() {
  const [types, categories] = await Promise.all([getProductTypes(), getCategoryTree()]);
  const activeTypes = types.filter((t) => t.isActive);

  return (
    <>
      <PageHeader
        icon={Package}
        title="Nuevo producto"
        description="Primero los datos generales; las variantes (SKU, precio y stock) se añaden después de crearlo."
      >
        <ButtonLink href="/admin/productos" variant="ghost" size="sm">
          Volver a productos
        </ButtonLink>
      </PageHeader>

      {activeTypes.length === 0 ? (
        <div className="rounded-card bg-canvas shadow-card">
          <EmptyState
            icon={Tags}
            title="Falta un tipo de producto"
            description="Todo producto pertenece a un tipo, que define sus atributos. Crea uno antes de continuar."
            ctaLabel="Crear tipo de producto"
            ctaHref="/admin/productos/tipos"
            size="compact"
          />
        </div>
      ) : (
        <div className="mx-auto w-full max-w-[760px]">
          <ProductForm
            product={null}
            types={activeTypes.map((t) => ({
              typeId: t.typeId,
              name: t.name,
              attributeSchema: t.attributeSchema,
              isActive: t.isActive,
            }))}
            categories={categories.map((c) => ({
              categoryId: c.categoryId,
              name: c.name,
              depth: c.depth,
              isActive: c.isActive,
            }))}
          />
        </div>
      )}
    </>
  );
}
