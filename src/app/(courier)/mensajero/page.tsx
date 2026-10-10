import type { Metadata } from "next";
import { Truck } from "lucide-react";
import { EmptyState } from "@/components/empty-state";
import { PageHeader } from "@/components/page-header";

export const metadata: Metadata = { title: "Mis entregas" };
export const dynamic = "force-dynamic";

export default function CourierHomePage() {
  return (
    <>
      <PageHeader icon={Truck} title="Mis entregas" description="Entregas asignadas para hoy." />
      <div className="rounded-card bg-canvas shadow-card">
        <EmptyState icon={Truck} title="Sin entregas asignadas" description="Cuando te asignen una entrega aparecerá aquí." size="compact" />
      </div>
    </>
  );
}
