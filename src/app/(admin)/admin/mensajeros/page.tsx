import type { Metadata } from "next";
import { Bike } from "lucide-react";
import { PageHeading } from "@/components/page-header";
import { CourierList } from "@/modules/deliveries/components/courier-list";
import { getCouriers } from "@/modules/deliveries/queries/courier-queries";

export const metadata: Metadata = { title: "Mensajeros" };
export const dynamic = "force-dynamic";

export default async function AdminCouriersPage() {
  const rows = await getCouriers();
  return (
    <>
      <CourierList
        heading={<PageHeading icon={Bike} title="Mensajeros" description="Usuarios con rol mensajero que reparten pedidos." />}
        rows={rows} />
    </>
  );
}
