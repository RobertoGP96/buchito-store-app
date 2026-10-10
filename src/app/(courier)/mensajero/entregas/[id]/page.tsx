import { notFound } from "next/navigation";

export const dynamic = "force-dynamic";

interface CourierDeliveryPageProps {
  params: Promise<{ id: string }>;
}

export default async function CourierDeliveryPage({ params }: CourierDeliveryPageProps) {
  await params;
  // Fase E: getDeliveryForCourier + DeliveryDetail.
  notFound();
}
