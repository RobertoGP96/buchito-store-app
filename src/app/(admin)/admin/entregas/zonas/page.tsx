import type { Metadata } from "next";
import { MapPin } from "lucide-react";
import { EmptyState } from "@/components/empty-state";
import { PageHeader } from "@/components/page-header";

export const metadata: Metadata = { title: "Zonas de entrega" };
export const dynamic = "force-dynamic";

export default function AdminZonesPage() {
  return (
    <>
      <PageHeader icon={MapPin} title="Zonas de entrega" description="Zonas con su tarifa de envío y tiempo estimado." />
      <div className="rounded-card bg-canvas shadow-card">
        <EmptyState icon={MapPin} title="Sin zonas" description="Crea la primera zona de entrega." size="compact" />
      </div>
    </>
  );
}
