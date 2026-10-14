import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Truck } from "lucide-react";
import { getSessionCourierId } from "@/lib/auth-guard";
import { ButtonLink } from "@/components/button-link";
import { PageHeader } from "@/components/page-header";
import { DeliveryDetail } from "@/modules/deliveries/components/delivery-detail";
import { getDeliveryForCourier } from "@/modules/deliveries/queries/delivery-queries";

export const dynamic = "force-dynamic";

interface CourierDeliveryPageProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: CourierDeliveryPageProps): Promise<Metadata> {
  const { id } = await params;
  return { title: `Entrega #${id}` };
}

export default async function CourierDeliveryPage({ params }: CourierDeliveryPageProps) {
  const { id } = await params;
  const deliveryId = Number(id);
  if (!Number.isInteger(deliveryId)) notFound();

  const courierId = await getSessionCourierId();
  // El mensajero solo ve las entregas suyas.
  const delivery = courierId != null ? await getDeliveryForCourier(deliveryId, courierId) : null;
  if (!delivery) notFound();

  const isOpen = delivery.status === "assigned" || delivery.status === "in_transit";
  const back = isOpen ? { href: "/mensajero", label: "Mis entregas" } : { href: "/mensajero/historial", label: "Historial" };

  return (
    <>
      <PageHeader
        icon={Truck}
        title={delivery.orderNo}
        description={[delivery.recipientName, delivery.zoneName].filter(Boolean).join(" · ")}
      >
        <ButtonLink href={back.href} variant="ghost" size="sm">
          {back.label}
        </ButtonLink>
      </PageHeader>
      <DeliveryDetail
        delivery={delivery}
        isAssignedCourier={delivery.courierId === courierId}
      />
    </>
  );
}
