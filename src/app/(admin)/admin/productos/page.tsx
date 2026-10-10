import type { Metadata } from "next";
import { Package } from "lucide-react";
import { EmptyState } from "@/components/empty-state";
import { PageHeader } from "@/components/page-header";

export const metadata: Metadata = { title: "Productos" };
export const dynamic = "force-dynamic";

export default function AdminProductsPage() {
  return (
    <>
      <PageHeader
        icon={Package}
        title="Productos"
        description="Catálogo con variantes, precios y stock."
      />
      <div className="rounded-card bg-canvas shadow-card">
        <EmptyState
          icon={Package}
          title="Sin productos"
          description="Crea primero un tipo de producto y una categoría; después podrás dar de alta productos."
          size="compact"
        />
      </div>
    </>
  );
}
