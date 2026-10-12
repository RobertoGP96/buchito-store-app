import type { Metadata } from "next";
import { HandCoins } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { CourierPaymentList } from "@/modules/deliveries/components/courier-payment-list";
import { getCourierBalances, getCourierPayments } from "@/modules/deliveries/queries/courier-payment-queries";
import { PAYMENT_RANGES, type PaymentRange } from "@/modules/payments/lib/payment-ranges";

export const metadata: Metadata = { title: "Pagos a mensajeros" };
export const dynamic = "force-dynamic";

interface CourierPaymentsPageProps {
  searchParams: Promise<{ range?: string }>;
}

const DEFAULT_RANGE: PaymentRange = "30d";

function rangeStart(range: PaymentRange): Date | undefined {
  if (range === "all") return undefined;
  const days = range === "today" ? 1 : range === "7d" ? 7 : 30;
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  start.setDate(start.getDate() - (days - 1));
  return start;
}

/** Sin `loading.tsx`: filtra por URL y conserva los saldos al cambiar de rango. */
export default async function CourierPaymentsPage({ searchParams }: CourierPaymentsPageProps) {
  const params = await searchParams;
  const range = (PAYMENT_RANGES as readonly string[]).includes(params.range ?? "")
    ? (params.range as PaymentRange)
    : DEFAULT_RANGE;
  const [balances, result] = await Promise.all([getCourierBalances(), getCourierPayments({ from: rangeStart(range) })]);

  return (
    <>
      <PageHeader
        icon={HandCoins}
        title="Pagos a mensajeros"
        description="Cada entrega completada devenga la tarifa del mensajero. Aquí se liquidan y queda el historial de pagos."
      />
      <CourierPaymentList balances={balances} result={result} activeRange={range} />
    </>
  );
}
