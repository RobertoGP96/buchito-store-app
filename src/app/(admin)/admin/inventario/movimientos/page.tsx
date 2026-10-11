import type { Metadata } from "next";
import { History } from "lucide-react";
import { ButtonLink } from "@/components/button-link";
import { PageHeader } from "@/components/page-header";
import { StockMovementList } from "@/modules/products/components/stock-movement-list";
import { getStockMovements } from "@/modules/products/queries/inventory-queries";

export const metadata: Metadata = { title: "Movimientos de stock" };
export const dynamic = "force-dynamic";

interface AdminStockMovementsPageProps {
  searchParams: Promise<{ variantId?: string }>;
}

function parseVariantId(value: string | undefined): number | null {
  if (!value) return null;
  const id = Number(value);
  return Number.isInteger(id) && id > 0 ? id : null;
}

export default async function AdminStockMovementsPage({ searchParams }: AdminStockMovementsPageProps) {
  const params = await searchParams;
  const variantId = parseVariantId(params.variantId);
  const rows = await getStockMovements({ variantId: variantId ?? undefined });
  return (
    <>
      <PageHeader
        icon={History}
        title="Movimientos de stock"
        description="Kardex: entradas, salidas y recuentos, del más reciente al más antiguo."
      >
        <ButtonLink href="/admin/inventario" variant="ghost" size="sm">
          Volver al inventario
        </ButtonLink>
      </PageHeader>
      <StockMovementList rows={rows} variantId={variantId} />
    </>
  );
}
