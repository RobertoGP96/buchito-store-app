import type { Metadata } from "next";
import { ScreenHeader } from "@/components/screen-header";
import { PaymentInfo } from "@/modules/payments/components/payment-info";
import { getActivePaymentMethods } from "@/modules/payments/queries/payment-queries";

export const metadata: Metadata = { title: "Formas de pago" };
export const dynamic = "force-dynamic";

export default async function PaymentsInfoPage() {
  const methods = await getActivePaymentMethods();
  return (
    <>
      <ScreenHeader
        eyebrow="Pagos"
        title="Formas de pago y monedas"
        description="Qué métodos aceptamos, en qué moneda se paga cada uno y a qué tasa se convierten los precios."
      />
      <div className="mx-auto flex w-full max-w-[1120px] flex-1 flex-col px-5 pb-10 md:px-6">
        <PaymentInfo methods={methods} />
      </div>
    </>
  );
}
