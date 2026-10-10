import type { Metadata } from "next";
import { Tags } from "lucide-react";
import { EmptyState } from "@/components/empty-state";
import { PageHeader } from "@/components/page-header";

export const metadata: Metadata = { title: "Tipos de producto" };
export const dynamic = "force-dynamic";

export default function AdminProductTypesPage() {
  return (
    <>
      <PageHeader
        icon={Tags}
        title="Tipos de producto"
        description="Cada tipo define qué atributos lleva un producto y sus variantes."
      />
      <div className="rounded-card bg-canvas shadow-card">
        <EmptyState icon={Tags} title="Sin tipos" description="Crea el primer tipo de producto." size="compact" />
      </div>
    </>
  );
}
