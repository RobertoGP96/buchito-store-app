import type { Metadata } from "next";
import { Settings2 } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { getActiveCurrencies } from "@/modules/currency/queries/currency-queries";
import { SettingsForm } from "@/modules/settings/components/settings-form";
import { getStoreSettings } from "@/modules/settings/queries/settings-queries";

export const metadata: Metadata = { title: "Configuración" };
export const dynamic = "force-dynamic";

export default async function AdminSettingsPage() {
  const [settings, currencies] = await Promise.all([getStoreSettings(), getActiveCurrencies()]);
  return (
    <>
      <PageHeader
        icon={Settings2}
        title="Configuración"
        description="Datos de la tienda, moneda base, envío y folios."
      />
      <SettingsForm
        settings={settings}
        currencies={currencies.map((c) => ({
          value: String(c.currencyId),
          label: `${c.code} · ${c.name ?? ""}`,
        }))}
      />
    </>
  );
}
