import type { Metadata } from "next";
import { Landmark } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { FinanceProducts } from "@/modules/finance/components/finance-products";
import { FinanceSummaryView } from "@/modules/finance/components/finance-summary";
import { getFinanceSummary } from "@/modules/finance/queries/finance-queries";
import { PAYMENT_RANGES, type PaymentRange } from "@/modules/payments/lib/payment-ranges";

export const metadata: Metadata = { title: "Resultados" };
export const dynamic = "force-dynamic";

interface AdminFinancePageProps {
  searchParams: Promise<{ range?: string }>;
}

const DEFAULT_RANGE: PaymentRange = "30d";

/** Inicio del día (hora del servidor) menos `days - 1` días; "all" = sin límite. */
function rangeStart(range: PaymentRange): Date | undefined {
  if (range === "all") return undefined;
  const days = range === "today" ? 1 : range === "7d" ? 7 : 30;
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  start.setDate(start.getDate() - (days - 1));
  return start;
}

/** Sin `loading.tsx` a propósito: al cambiar de rango la página conserva las
 *  teselas y el chip pulsado muestra su spinner. */
export default async function AdminFinancePage({ searchParams }: AdminFinancePageProps) {
  const params = await searchParams;
  const range = (PAYMENT_RANGES as readonly string[]).includes(params.range ?? "")
    ? (params.range as PaymentRange)
    : DEFAULT_RANGE;
  const summary = await getFinanceSummary(rangeStart(range));

  return (
    <>
      <PageHeader
        icon={Landmark}
        title="Resultados"
        description="Ventas, costo de la mercancía vendida, reparto y ganancia del periodo, en la moneda base. Los pedidos cancelados no cuentan."
      />
      <FinanceSummaryView summary={summary} activeRange={range} />
      <FinanceProducts rows={summary.byProduct} />
    </>
  );
}
