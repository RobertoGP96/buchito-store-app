import type { Metadata } from "next";
import { Truck } from "lucide-react";
import { EmptyState } from "@/components/empty-state";
import { PageHeader } from "@/components/page-header";

export const metadata: Metadata = { title: "Entregas" };
export const dynamic = "force-dynamic";

export default function AdminDeliveriesPage() {
  return (
    <>
      <PageHeader icon={Truck} title="Entregas" description="Asignación y seguimiento de entregas a domicilio." />
      <div className="rounded-card bg-canvas shadow-card">
        <EmptyState icon={Truck} title="Sin entregas" description="Cuando un pedido esté listo para entregar aparecerá aquí." size="compact" />
      </div>
    </>
  );
}
