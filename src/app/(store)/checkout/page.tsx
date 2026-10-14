import type { Metadata } from "next";
import { UserRound } from "lucide-react";
import { getSessionCustomer, NO_CUSTOMER_MESSAGE, type SessionCustomer } from "@/lib/auth-guard";
import { EmptyState } from "@/components/empty-state";
import { ScreenHeader } from "@/components/screen-header";
import { CheckoutForm } from "@/modules/cart/components/checkout-form";
import { getActiveZones } from "@/modules/deliveries/queries/zone-queries";
import { getActivePaymentMethods } from "@/modules/payments/queries/payment-queries";
import { getRecipientsForCustomer } from "@/modules/recipients/queries/recipient-queries";
import { getStoreSettings } from "@/modules/settings/queries/settings-queries";
import { buildWhatsappLink } from "@/lib/whatsapp";

export const metadata: Metadata = { title: "Finalizar compra" };
export const dynamic = "force-dynamic";

export default async function CheckoutPage() {
  // La sesión la exige el layout; comprar necesita además ficha de cliente
  // (admin y mensajero no la tienen).
  const customer = await getSessionCustomer();

  return (
    <>
      <ScreenHeader eyebrow="Tu compra" title="Finalizar compra" backHref="/carrito" />
      <div className="mx-auto flex w-full max-w-[1120px] flex-1 flex-col px-5 pb-10 md:px-6">
        {customer ? (
          <CheckoutContent customer={customer} />
        ) : (
          <EmptyState
            icon={UserRound}
            title="Esta cuenta no puede hacer pedidos"
            description={NO_CUSTOMER_MESSAGE}
            ctaLabel="Ir al catálogo"
            ctaHref="/catalogo"
          />
        )}
      </div>
    </>
  );
}

async function CheckoutContent({ customer }: { customer: SessionCustomer }) {
  const [settings, zones, paymentMethods, recipients] = await Promise.all([
    getStoreSettings(),
    getActiveZones(),
    getActivePaymentMethods(),
    getRecipientsForCustomer(customer.customerId),
  ]);

  return (
    <CheckoutForm
      zones={zones}
      paymentMethods={paymentMethods}
      defaultShippingFee={settings.defaultShippingFee}
      freeShippingThreshold={settings.freeShippingThreshold}
      allowPickup={settings.allowPickup}
      whatsappEnabled={buildWhatsappLink(settings.whatsappPhone) !== null}
      customer={{ name: customer.name, phone: customer.phone, email: customer.email }}
      recipients={recipients}
    />
  );
}
