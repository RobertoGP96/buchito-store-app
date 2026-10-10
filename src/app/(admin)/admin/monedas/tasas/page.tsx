import type { Metadata } from "next";
import { TrendingUp } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { RateManager } from "@/modules/currency/components/rate-manager";
import { getRatesOverview } from "@/modules/currency/queries/rate-queries";

export const metadata: Metadata = { title: "Tasas de cambio" };
export const dynamic = "force-dynamic";

export default async function AdminRatesPage() {
  const overview = await getRatesOverview();
  return (
    <>
      <PageHeader
        icon={TrendingUp}
        title="Tasas de cambio"
        description={
          overview.base
            ? `Una tasa vigente por moneda hacia ${overview.base.code}, con historial de cambios.`
            : "Una tasa vigente por moneda hacia la moneda base, con historial de cambios."
        }
      />
      <RateManager overview={overview} />
    </>
  );
}
