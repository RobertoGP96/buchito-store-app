import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { cache } from "react";
import { AlertTriangle, Gift } from "lucide-react";
import { ButtonLink } from "@/components/button-link";
import { PageHeader } from "@/components/page-header";
import { StatusChip } from "@/components/status-chip";
import { ComboForm } from "@/modules/combos/components/combo-form";
import { ComboStatusActions } from "@/modules/combos/components/combo-status-actions";
import { COMBO_STATE_META } from "@/modules/combos/lib/labels";
import { getAdminCombo, getComboVariantOptions } from "@/modules/combos/queries/combo-queries";
import { getActiveCurrencies } from "@/modules/currency/queries/currency-queries";

export const dynamic = "force-dynamic";

interface AdminComboPageProps {
  params: Promise<{ id: string }>;
}

function parseId(id: string): number | null {
  const comboId = Number(id);
  return Number.isInteger(comboId) && comboId > 0 ? comboId : null;
}

const loadCombo = cache((comboId: number) => getAdminCombo(comboId));

export async function generateMetadata({ params }: AdminComboPageProps): Promise<Metadata> {
  const { id } = await params;
  const comboId = parseId(id);
  const combo = comboId ? await loadCombo(comboId) : null;
  return { title: combo ? combo.name : "Combo" };
}

export default async function AdminComboPage({ params }: AdminComboPageProps) {
  const { id } = await params;
  const comboId = parseId(id);
  if (!comboId) notFound();

  const [combo, variants, currencies] = await Promise.all([
    loadCombo(comboId),
    getComboVariantOptions(),
    getActiveCurrencies(),
  ]);
  if (!combo) notFound();

  const unsellable = combo.items.filter((i) => !i.sellable);

  return (
    <>
      <PageHeader
        icon={Gift}
        title={combo.name}
        description={`${combo.items.length} ${combo.items.length === 1 ? "producto" : "productos"} · ${combo.available} disponibles`}
        badge={
          <>
            <StatusChip {...COMBO_STATE_META[combo.state]} />
            {combo.featured && <StatusChip label="Destacado" tone="info" />}
          </>
        }
      >
        <ComboStatusActions comboId={combo.comboId} status={combo.status} hasItems={combo.items.length > 0} />
        <ButtonLink href="/admin/combos" variant="ghost" size="sm">
          Volver a combos
        </ButtonLink>
      </PageHeader>

      {unsellable.length > 0 && (
        <p
          role="status"
          className="flex items-start gap-2.5 rounded-field bg-gold-100 px-4 py-3 text-[13px] leading-[1.5] text-gold-600"
        >
          <AlertTriangle className="mt-0.5 h-4 w-4 flex-none" strokeWidth={2} />
          <span>
            <span className="font-semibold">El combo no se muestra en la tienda:</span>{" "}
            {unsellable.map((i) => i.productName).join(", ")} no se {unsellable.length === 1 ? "vende" : "venden"} ahora
            (variante inactiva o producto sin publicar).
          </span>
        </p>
      )}

      <div className="mx-auto w-full max-w-[760px]">
        {/* key: tras guardar o cambiar de estado, el formulario se remonta con los datos frescos. */}
        <ComboForm key={`${combo.comboId}-${combo.version}-${combo.status}`} combo={combo} variants={variants} currencies={currencies} />
      </div>
    </>
  );
}
