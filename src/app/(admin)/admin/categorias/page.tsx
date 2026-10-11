import type { Metadata } from "next";
import { FolderTree } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { CategoryList } from "@/modules/products/components/category-list";
import { getCategoryTree } from "@/modules/products/queries/category-queries";

export const metadata: Metadata = { title: "Categorías" };
export const dynamic = "force-dynamic";

export default async function AdminCategoriesPage() {
  const rows = await getCategoryTree();
  return (
    <>
      <PageHeader icon={FolderTree} title="Categorías" description="Árbol de categorías del catálogo. Una categoría padre agrupa los productos de sus hijas." />
      <CategoryList rows={rows} />
    </>
  );
}
