import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { cache } from "react";
import { AlertTriangle, Package } from "lucide-react";
import { ButtonLink } from "@/components/button-link";
import { PageHeader } from "@/components/page-header";
import { StatusChip } from "@/components/status-chip";
import { getActiveCurrencies } from "@/modules/currency/queries/currency-queries";
import { ProductForm } from "@/modules/products/components/product-form";
import { ProductImages } from "@/modules/products/components/product-images";
import { ProductStatusActions } from "@/modules/products/components/product-status-actions";
import { VariantList } from "@/modules/products/components/variant-list";
import { PRODUCT_STATUS_META } from "@/modules/products/lib/labels";
import { getCategoryTree } from "@/modules/products/queries/category-queries";
import { getAdminProduct } from "@/modules/products/queries/product-queries";
import { getProductTypes } from "@/modules/products/queries/product-type-queries";
import { getStoreSettings } from "@/modules/settings/queries/settings-queries";

export const dynamic = "force-dynamic";

interface AdminProductPageProps {
  params: Promise<{ id: string }>;
}

function parseProductId(id: string): number | null {
  const productId = Number(id);
  return Number.isInteger(productId) && productId > 0 ? productId : null;
}

// generateMetadata y la página piden el mismo producto en el mismo request.
const loadProduct = cache((productId: number) => getAdminProduct(productId));

export async function generateMetadata({ params }: AdminProductPageProps): Promise<Metadata> {
  const { id } = await params;
  const productId = parseProductId(id);
  const product = productId ? await loadProduct(productId) : null;
  return { title: product ? product.name : "Producto" };
}

export default async function AdminProductPage({ params }: AdminProductPageProps) {
  const { id } = await params;
  const productId = parseProductId(id);
  if (!productId) notFound();

  const [product, types, categories, currencies, settings] = await Promise.all([
    loadProduct(productId),
    getProductTypes(),
    getCategoryTree(),
    getActiveCurrencies(),
    getStoreSettings(),
  ]);
  if (!product) notFound();

  const hasActiveVariants = product.variants.some((v) => v.isActive);
  const subtitle = [product.type.name, product.categoryName].filter(Boolean).join(" · ");

  return (
    <>
      <PageHeader
        icon={Package}
        title={product.name}
        description={subtitle}
        badge={
          <>
            <StatusChip {...PRODUCT_STATUS_META[product.status]} />
            {product.featured && <StatusChip label="Destacado" tone="info" />}
          </>
        }
      >
        <ProductStatusActions
          productId={product.productId}
          status={product.status}
          hasActiveVariants={hasActiveVariants}
        />
        <ButtonLink href="/admin/productos" variant="ghost" size="sm">
          Volver a productos
        </ButtonLink>
      </PageHeader>

      {!hasActiveVariants && (
        <p
          role="status"
          className="flex items-start gap-2.5 rounded-field bg-gold-100 px-4 py-3 text-[13px] leading-[1.5] text-gold-600"
        >
          <AlertTriangle className="mt-0.5 h-4 w-4 flex-none" strokeWidth={2} />
          <span>
            <span className="font-semibold">Publica al menos una variante para que aparezca en la tienda.</span>{" "}
            Sin variantes activas el producto no se muestra aunque esté publicado.
          </span>
        </p>
      )}

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:items-start">
        <div className="flex flex-col gap-5">
          <ProductImages productId={product.productId} images={product.images} />
          {/* key: tras guardar o cambiar de estado, el formulario se remonta con los datos frescos. */}
          <ProductForm
            key={`${product.productId}-${product.version}-${product.status}`}
            product={product}
            types={types.map((t) => ({
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
        <VariantList
          productId={product.productId}
          variants={product.variants}
          attributeSchema={product.type.attributeSchema}
          currencies={currencies}
          lowStockThreshold={settings.lowStockThreshold}
        />
      </div>
    </>
  );
}
