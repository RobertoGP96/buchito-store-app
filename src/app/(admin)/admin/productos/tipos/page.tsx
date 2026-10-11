import type { Metadata } from "next";
import { Tags } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { ProductTypeList } from "@/modules/products/components/product-type-list";
import { getProductTypes } from "@/modules/products/queries/product-type-queries";

export const metadata: Metadata = { title: "Tipos de producto" };
export const dynamic = "force-dynamic";

export default async function AdminProductTypesPage() {
  const rows = await getProductTypes();
  return (
    <>
      <PageHeader
        icon={Tags}
        title="Tipos de producto"
        description="Cada tipo define qué atributos lleva un producto y cuáles distinguen a sus variantes."
      />
      <ProductTypeList rows={rows} />
    </>
  );
}
