import type { Metadata } from "next";
import { Truck } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { DeliveryList } from "@/modules/deliveries/components/delivery-list";
import { DELIVERY_STATUSES, type DeliveryStatus } from "@/modules/deliveries/lib/labels";
import { getActiveCouriers } from "@/modules/deliveries/queries/courier-queries";
import { getDeliveries } from "@/modules/deliveries/queries/delivery-queries";

export const metadata: Metadata = { title: "Entregas" };
export const dynamic = "force-dynamic";

interface AdminDeliveriesPageProps {
  searchParams: Promise<{ status?: string }>;
}

export default async function AdminDeliveriesPage({ searchParams }: AdminDeliveriesPageProps) {
  const params = await searchParams;
  const status = (DELIVERY_STATUSES as readonly string[]).includes(params.status ?? "")
    ? (params.status as DeliveryStatus)
    : null;
  const [rows, couriers] = await Promise.all([getDeliveries({ status: status ?? undefined }), getActiveCouriers()]);
  return (
    <>
      <PageHeader icon={Truck} title="Entregas" description="Asignación y seguimiento de entregas a domicilio." />
      <DeliveryList rows={rows} couriers={couriers} activeStatus={status} />
    </>
  );
}
