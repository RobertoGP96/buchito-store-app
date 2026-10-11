import type { Metadata } from "next";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { ScreenHeader } from "@/components/screen-header";
import { CheckoutForm } from "@/modules/cart/components/checkout-form";
import { getActiveZones } from "@/modules/deliveries/queries/zone-queries";
import { getActivePaymentMethods } from "@/modules/payments/queries/payment-queries";
import { getStoreSettings } from "@/modules/settings/queries/settings-queries";

export const metadata: Metadata = { title: "Finalizar compra" };
export const dynamic = "force-dynamic";

export default async function CheckoutPage() {
  const [session, settings, zones, paymentMethods] = await Promise.all([
    auth(),
    getStoreSettings(),
    getActiveZones(),
    getActivePaymentMethods(),
  ]);

  let prefill: { name: string; phone: string; email: string } | null = null;
  if (session?.user) {
    const customer = await db.customer.findUnique({
      where: { userId: session.user.userId },
      select: { name: true, phone: true, email: true },
    });
    prefill = {
      name: customer?.name ?? session.user.fullName,
      phone: customer?.phone ?? "",
      email: customer?.email ?? session.user.email ?? "",
    };
  }

  return (
    <>
      <ScreenHeader eyebrow="Tu compra" title="Finalizar compra" backHref="/carrito" />
      <div className="mx-auto flex w-full max-w-[1120px] flex-1 flex-col px-5 pb-10 md:px-6">
        <CheckoutForm
          zones={zones}
          paymentMethods={paymentMethods}
          defaultShippingFee={settings.defaultShippingFee}
          freeShippingThreshold={settings.freeShippingThreshold}
          allowPickup={settings.allowPickup}
          prefill={prefill}
        />
      </div>
    </>
  );
}
