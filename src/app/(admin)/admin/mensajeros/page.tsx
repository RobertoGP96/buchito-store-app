import type { Metadata } from "next";
import { Bike } from "lucide-react";
import { EmptyState } from "@/components/empty-state";
import { PageHeader } from "@/components/page-header";

export const metadata: Metadata = { title: "Mensajeros" };
export const dynamic = "force-dynamic";

export default function AdminCouriersPage() {
  return (
    <>
      <PageHeader icon={Bike} title="Mensajeros" description="Usuarios con rol mensajero que reparten pedidos." />
      <div className="rounded-card bg-canvas shadow-card">
        <EmptyState icon={Bike} title="Sin mensajeros" description="Da de alta el primer mensajero." size="compact" />
      </div>
    </>
  );
}
