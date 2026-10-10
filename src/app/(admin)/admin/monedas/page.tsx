import type { Metadata } from "next";
import { Coins } from "lucide-react";
import { EmptyState } from "@/components/empty-state";
import { PageHeader } from "@/components/page-header";

export const metadata: Metadata = { title: "Monedas" };
export const dynamic = "force-dynamic";

export default function AdminCurrenciesPage() {
  return (
    <>
      <PageHeader icon={Coins} title="Monedas" description="Monedas en las que se fijan precios y se cobra." />
      <div className="rounded-card bg-canvas shadow-card">
        <EmptyState icon={Coins} title="Sin monedas" description="Crea la moneda base de la tienda." size="compact" />
      </div>
    </>
  );
}
