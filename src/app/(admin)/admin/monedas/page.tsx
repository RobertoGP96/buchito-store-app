import type { Metadata } from "next";
import { Coins } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { CurrencyList } from "@/modules/currency/components/currency-list";
import { getCurrencies } from "@/modules/currency/queries/currency-queries";

export const metadata: Metadata = { title: "Monedas" };
export const dynamic = "force-dynamic";

export default async function AdminCurrenciesPage() {
  const rows = await getCurrencies();
  return (
    <>
      <PageHeader
        icon={Coins}
        title="Monedas"
        description="Monedas en las que se fijan precios y se cobra. La base se elige en Configuración."
      />
      <CurrencyList rows={rows} />
    </>
  );
}
