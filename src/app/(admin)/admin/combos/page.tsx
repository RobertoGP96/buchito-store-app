import type { Metadata } from "next";
import { Gift } from "lucide-react";
import { PageHeading } from "@/components/page-header";
import { ComboList } from "@/modules/combos/components/combo-list";
import { getAdminCombos } from "@/modules/combos/queries/combo-queries";

export const metadata: Metadata = { title: "Combos" };
export const dynamic = "force-dynamic";

export default async function AdminCombosPage() {
  const rows = await getAdminCombos();
  return (
    <>
      <ComboList
        heading={<PageHeading icon={Gift} title="Combos" description="Paquetes de productos con cantidades a un precio cerrado. El stock y el costo siguen siendo los de cada producto." />}
        rows={rows} />
    </>
  );
}
