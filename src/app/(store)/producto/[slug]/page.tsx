import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { cache } from "react";
import { ProductDetail } from "@/modules/products/components/product-detail";
import { getProductBySlug } from "@/modules/products/queries/catalog-queries";

export const dynamic = "force-dynamic";

// generateMetadata y la página piden el mismo producto en el mismo request.
const loadProduct = cache((slug: string) => getProductBySlug(slug));

interface ProductPageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: ProductPageProps): Promise<Metadata> {
  const { slug } = await params;
  const product = await loadProduct(decodeURIComponent(slug));
  return { title: product?.name ?? "Producto" };
}

export default async function ProductPage({ params }: ProductPageProps) {
  const { slug } = await params;
  const product = await loadProduct(decodeURIComponent(slug));
  if (!product) notFound();
  return <ProductDetail product={product} />;
}
