"use client";

import Link from "next/link";
import { ChevronLeft } from "lucide-react";
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
      <Link
        href="/catalogo"
        className="nav-label -ml-1 inline-flex items-center gap-0.5 text-slate-500 transition-colors duration-150 hover:text-navy-700"
      >
        <ChevronLeft className="h-4 w-4" strokeWidth={2} />
        Catálogo
      </Link>

      <div className="mt-5 grid grid-cols-[minmax(0,1fr)] gap-8 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] md:gap-12">
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

        <div className="flex min-w-0 flex-col">
          {product.categoryName && (
            <Link href={`/catalogo?cat=${product.categorySlug}`} className="eyebrow self-start hover:text-navy-700">
              {product.categoryName}
            </Link>
          )}
          <h1 className="font-display mt-2 text-[26px] leading-[1.1] text-navy-900 md:text-[32px]">
            {product.name}
          </h1>
          <ProductPrice variant={variant} className="mt-4" />
          <ProductAvailability variant={variant} className="mt-2" />
          <ProductVariantPicker
            product={product}
            variant={variant}
            onSelect={selection.selectVariant}
            className="mt-6"
          />
          <ProductAddControls selection={selection} className="mt-6 flex-wrap" />
          <ProductDescription product={product} className="mt-8" />
          <ProductSpecs product={product} variant={variant} className="mt-6" />
        </div>
      </div>
    </div>
  );
}
