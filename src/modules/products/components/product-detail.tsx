"use client";

import Link from "next/link";
import { ChevronRight, Truck, Wallet } from "lucide-react";
import { ImageCarousel } from "@/components/image-carousel";
import {
  ProductAddControls,
  ProductAvailability,
  ProductBadges,
  ProductDescription,
  ProductPrice,
  ProductSpecs,
  ProductVariantPicker,
  useProductSelection,
} from "./product-detail-parts";
import type { CatalogProduct } from "../queries/catalog-queries";

/** Ficha completa (`/producto/[slug]`): la misma selección que el drawer de
 *  las cards, en dos columnas y con miniaturas bajo el carrusel. */
export function ProductDetail({ product }: { product: CatalogProduct }) {
  const selection = useProductSelection(product);
  const { variant, soldOut } = selection;

  return (
    <div className="mx-auto w-full max-w-[1120px] px-5 pt-6 pb-12 md:px-6 md:pt-8">
      <nav aria-label="Ruta" className="type-meta flex flex-wrap items-center gap-1 text-ink-subtle">
        <Link href="/catalogo" className="font-medium transition-colors duration-150 hover:text-tostado-700">
          Catálogo
        </Link>
        {product.categoryName && (
          <>
            <ChevronRight className="h-3.5 w-3.5 text-ink-faint" strokeWidth={2} aria-hidden />
            <Link
              href={`/catalogo?cat=${product.categorySlug}`}
              className="font-medium transition-colors duration-150 hover:text-tostado-700"
            >
              {product.categoryName}
            </Link>
          </>
        )}
        <ChevronRight className="h-3.5 w-3.5 text-ink-faint" strokeWidth={2} aria-hidden />
        <span aria-current="page" className="min-w-0 truncate text-ink-muted">
          {product.name}
        </span>
      </nav>

      <div className="mt-5 grid grid-cols-[minmax(0,1fr)] gap-8 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] md:items-start md:gap-12">
        <ImageCarousel
          images={selection.slides}
          index={selection.slide}
          onIndexChange={selection.setSlide}
          label={`Fotos de ${product.name}`}
          sizes="(max-width: 768px) 100vw, 560px"
          priority
          indicator="thumbs"
          frameClassName="rounded-card shadow-card"
          overlay={<ProductBadges product={product} variant={variant} soldOut={soldOut} />}
        />

        {/* La columna de compra acompaña al scroll de las fotos en desktop:
            el precio y el botón no se pierden al leer la descripción. */}
        <div className="flex min-w-0 flex-col md:sticky md:top-24">
          {product.categoryName && <p className="eyebrow text-tostado-700">{product.categoryName}</p>}
          <h1 className="font-display type-title mt-2 text-balance text-espresso-900">{product.name}</h1>
          <ProductPrice variant={variant} size="lg" className="mt-4" />
          <ProductAvailability variant={variant} className="mt-2" />
          <ProductVariantPicker
            product={product}
            variant={variant}
            onSelect={selection.selectVariant}
            className="mt-6"
          />
          <ProductAddControls selection={selection} className="mt-6 flex-wrap" />
          <ul className="type-meta mt-5 flex flex-col gap-2.5 rounded-field bg-cream-50 px-4 py-3.5 text-ink-muted">
            <li className="flex items-center gap-2.5">
              <Truck className="h-4 w-4 flex-none text-tostado-700" strokeWidth={1.9} aria-hidden />
              Entrega a domicilio con seguimiento del pedido.
            </li>
            <li className="flex items-center gap-2.5">
              <Wallet className="h-4 w-4 flex-none text-tostado-700" strokeWidth={1.9} aria-hidden />
              Eliges método de pago y moneda al confirmar.
            </li>
          </ul>
          <ProductDescription product={product} className="mt-8" />
          <ProductSpecs product={product} variant={variant} className="mt-6" />
        </div>
      </div>
    </div>
  );
}
