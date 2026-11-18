import type { Metadata } from "next";
import { Gift, Package } from "lucide-react";
import { EmptyState } from "@/components/empty-state";
import { PageHeader } from "@/components/page-header";
import { ComboForm } from "@/modules/combos/components/combo-form";
import { getComboVariantOptions } from "@/modules/combos/queries/combo-queries";
import { getActiveCurrencies } from "@/modules/currency/queries/currency-queries";

export const metadata: Metadata = { title: "Nuevo combo" };
export const dynamic = "force-dynamic";

export default async function NewComboPage() {
  const [variants, currencies] = await Promise.all([getComboVariantOptions(), getActiveCurrencies()]);

  return (
    <>
      <PageHeader
        backHref="/admin/combos"
        backLabel="Combos"
        icon={Gift}
        title="Nuevo combo"
        description="Elige los productos y sus cantidades, fija el precio del paquete y publícalo cuando esté listo."
      />

      {variants.length === 0 ? (
        <div className="rounded-card bg-canvas shadow-card">
          <EmptyState
            icon={Package}
            title="Faltan productos"
            description="Un combo agrupa variantes de productos existentes. Crea productos con variantes antes de continuar."
            ctaLabel="Ir a productos"
            ctaHref="/admin/productos"
            size="compact"
          />
        </div>
      ) : (
        <div className="mx-auto w-full max-w-[760px]">
          <ComboForm combo={null} variants={variants} currencies={currencies} />
        </div>
      )}
    </>
  );
}
