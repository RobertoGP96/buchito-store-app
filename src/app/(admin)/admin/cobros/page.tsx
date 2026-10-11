import type { Metadata } from "next";
import { Receipt } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { OrderPaymentList } from "@/modules/payments/components/order-payment-list";
import { PAYMENT_RANGES, type PaymentRange } from "@/modules/payments/lib/payment-ranges";
import { getOrderPayments } from "@/modules/payments/queries/order-payment-queries";

export const metadata: Metadata = { title: "Cobros" };
export const dynamic = "force-dynamic";

interface AdminPaymentsPageProps {
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

export default async function AdminPaymentsPage({ searchParams }: AdminPaymentsPageProps) {
  const params = await searchParams;
  const range = (PAYMENT_RANGES as readonly string[]).includes(params.range ?? "")
    ? (params.range as PaymentRange)
    : DEFAULT_RANGE;
  const result = await getOrderPayments({ from: rangeStart(range) });
  return (
    <>
      <PageHeader
        icon={Receipt}
        title="Cobros"
        description="Pagos registrados en los pedidos. Los totales se muestran en la moneda base y por moneda recibida."
      />
      <OrderPaymentList result={result} activeRange={range} />
    </>
  );
}
