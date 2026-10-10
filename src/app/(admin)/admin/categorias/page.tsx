import type { Metadata } from "next";
import { FolderTree } from "lucide-react";
import { EmptyState } from "@/components/empty-state";
import { PageHeader } from "@/components/page-header";

export const metadata: Metadata = { title: "Categorías" };
export const dynamic = "force-dynamic";

export default function AdminCategoriesPage() {
  return (
    <>
      <PageHeader icon={FolderTree} title="Categorías" description="Árbol de categorías del catálogo." />
      <div className="rounded-card bg-canvas shadow-card">
        <EmptyState icon={FolderTree} title="Sin categorías" description="Crea la primera categoría." size="compact" />
      </div>
    </>
  );
}
