import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ProductDetail } from "@/modules/products/components/product-detail";
import { getProductBySlug } from "@/modules/products/queries/catalog-queries";

export const dynamic = "force-dynamic";

interface ProductPageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: ProductPageProps): Promise<Metadata> {
  const { slug } = await params;
  const product = await getProductBySlug(decodeURIComponent(slug));
  return { title: product?.name ?? "Producto" };
}

export default async function ProductPage({ params }: ProductPageProps) {
  const { slug } = await params;
  const product = await getProductBySlug(decodeURIComponent(slug));
  if (!product) notFound();
  return <ProductDetail product={product} />;
}
