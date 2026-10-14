import type { Metadata } from "next";
import { Wallet } from "lucide-react";
import { auth } from "@/lib/auth";
import { PageHeader } from "@/components/page-header";
import { CourierEarnings } from "@/modules/deliveries/components/courier-earnings";
import { CourierInactive } from "@/modules/deliveries/components/courier-inactive";
import { getCourierEarnings, getCourierPaymentsFor } from "@/modules/deliveries/queries/courier-payment-queries";
import { getCourierProfile } from "@/modules/deliveries/queries/courier-queries";
import { getCourierUnpaidDeliveries } from "@/modules/deliveries/queries/delivery-queries";

export const metadata: Metadata = { title: "Mis ganancias" };
export const dynamic = "force-dynamic";

export default async function CourierEarningsPage() {
  const session = await auth();
  const profile = session?.user ? await getCourierProfile(session.user.userId) : null;
  if (!profile?.active) return <CourierInactive />;

  const [earnings, unpaid, payments] = await Promise.all([
    getCourierEarnings(profile.courierId),
    getCourierUnpaidDeliveries(profile.courierId),
    getCourierPaymentsFor(profile.courierId),
  ]);

  return (
    <>
      <PageHeader
        icon={Wallet}
        title="Mis ganancias"
        description="Lo que la tienda te paga por cada entrega completada y las liquidaciones que ya recibiste."
      />
      <CourierEarnings earnings={earnings} deliveryFee={profile.deliveryFee} unpaid={unpaid} payments={payments} />
    </>
  );
}
