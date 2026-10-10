import type { Metadata } from "next";
import { Wallet } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { getActiveCurrencies } from "@/modules/currency/queries/currency-queries";
import { PaymentMethodList } from "@/modules/payments/components/payment-method-list";
import { getPaymentMethods } from "@/modules/payments/queries/payment-queries";

export const metadata: Metadata = { title: "Métodos de pago" };
export const dynamic = "force-dynamic";

export default async function AdminPaymentMethodsPage() {
  const [rows, currencies] = await Promise.all([getPaymentMethods(), getActiveCurrencies()]);
  return (
    <>
      <PageHeader
        icon={Wallet}
        title="Métodos de pago"
        description="Formas de pago que el cliente elige en el checkout, cada una en su moneda."
      />
      <PaymentMethodList
        rows={rows}
        currencies={currencies.map((c) => ({ value: String(c.currencyId), label: `${c.code} · ${c.name ?? ""}` }))}
      />
    </>
  );
}
