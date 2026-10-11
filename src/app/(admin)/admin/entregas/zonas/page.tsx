import type { Metadata } from "next";
import { MapPin } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { ZoneList } from "@/modules/deliveries/components/zone-list";
import { getZones } from "@/modules/deliveries/queries/zone-queries";

export const metadata: Metadata = { title: "Zonas de entrega" };
export const dynamic = "force-dynamic";

export default async function AdminZonesPage() {
  const rows = await getZones();
  return (
    <>
      <PageHeader icon={MapPin} title="Zonas de entrega" description="Zonas con su tarifa de envío y tiempo estimado." />
      <ZoneList rows={rows} />
    </>
  );
}
