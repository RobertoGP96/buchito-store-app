import type { Metadata } from "next";
import { Boxes } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { InventoryList } from "@/modules/products/components/inventory-list";
import { getInventory } from "@/modules/products/queries/inventory-queries";
import { getStoreSettings } from "@/modules/settings/queries/settings-queries";

export const metadata: Metadata = { title: "Inventario" };
export const dynamic = "force-dynamic";

interface AdminInventoryPageProps {
  searchParams: Promise<{ q?: string; low?: string }>;
}

export default async function AdminInventoryPage({ searchParams }: AdminInventoryPageProps) {
  const params = await searchParams;
  const q = (params.q ?? "").trim();
  const low = params.low === "1";
  const [rows, settings] = await Promise.all([getInventory({ q: q || undefined, low }), getStoreSettings()]);
  return (
    <>
      <PageHeader
        icon={Boxes}
        title="Inventario"
        description={`Stock por variante activa. Se marca como bajo a partir de ${settings.lowStockThreshold} ${settings.lowStockThreshold === 1 ? "unidad" : "unidades"}.`}
      />
      <InventoryList rows={rows} query={q} lowOnly={low} />
    </>
  );
}
