import type { Metadata } from "next";
import { UserRound } from "lucide-react";
import { getSessionCustomer, NO_CUSTOMER_MESSAGE } from "@/lib/auth-guard";
import { EmptyState } from "@/components/empty-state";
import { ScreenHeader } from "@/components/screen-header";
import { getActiveZones } from "@/modules/deliveries/queries/zone-queries";
import { RecipientList } from "@/modules/recipients/components/recipient-list";
import { getRecipientsForCustomer } from "@/modules/recipients/queries/recipient-queries";

export const metadata: Metadata = { title: "Mis destinatarios" };
export const dynamic = "force-dynamic";

export default async function RecipientsPage() {
  const customer = await getSessionCustomer();

  return (
    <>
      <ScreenHeader
        eyebrow="Tu cuenta"
        title="Mis destinatarios"
        description="A quién le entregamos tus pedidos. Los eliges al finalizar la compra."
        backHref="/perfil"
      />
      <div className="mx-auto flex w-full max-w-[1120px] flex-1 flex-col px-5 pb-10 md:px-6">
        {customer ? (
          <RecipientsContent customerId={customer.customerId} />
        ) : (
          <EmptyState
            icon={UserRound}
            title="Esta cuenta no tiene destinatarios"
            description={NO_CUSTOMER_MESSAGE}
            ctaLabel="Ir al catálogo"
            ctaHref="/catalogo"
          />
        )}
      </div>
    </>
  );
}

async function RecipientsContent({ customerId }: { customerId: number }) {
  const [recipients, zones] = await Promise.all([getRecipientsForCustomer(customerId), getActiveZones()]);
  return <RecipientList recipients={recipients} zones={zones} />;
}
