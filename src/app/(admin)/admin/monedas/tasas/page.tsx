import type { Metadata } from "next";
import { TrendingUp } from "lucide-react";
import { EmptyState } from "@/components/empty-state";
import { PageHeader } from "@/components/page-header";

export const metadata: Metadata = { title: "Tasas de cambio" };
export const dynamic = "force-dynamic";

export default function AdminRatesPage() {
  return (
    <>
      <PageHeader icon={TrendingUp} title="Tasas de cambio" description="Una tasa vigente por moneda hacia la moneda base, con historial." />
      <div className="rounded-card bg-canvas shadow-card">
        <EmptyState icon={TrendingUp} title="Sin tasas" description="Configura la tasa de cada moneda hacia la base." size="compact" />
      </div>
    </>
  );
}
