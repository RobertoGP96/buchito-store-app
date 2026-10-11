import type { Metadata } from "next";
import { Truck, UserX } from "lucide-react";
import { getSessionCourierId } from "@/lib/auth-guard";
import { EmptyState } from "@/components/empty-state";
import { PageHeader } from "@/components/page-header";
import { CourierToday } from "@/modules/deliveries/components/courier-today";
import { getCourierOpenDeliveries } from "@/modules/deliveries/queries/delivery-queries";

export const metadata: Metadata = { title: "Mis entregas" };
export const dynamic = "force-dynamic";

export default async function CourierHomePage() {
  const courierId = await getSessionCourierId();

  if (courierId == null) {
    return (
      <div className="rounded-card bg-canvas shadow-card">
        <EmptyState
          icon={UserX}
          title="Tu cuenta de mensajero no está activa"
          description="Pide al administrador que active tu perfil de mensajero para ver tus entregas."
          size="compact"
        />
      </div>
    );
  }

  const rows = await getCourierOpenDeliveries(courierId);
  return (
    <>
      <PageHeader
        icon={Truck}
        title="Mis entregas"
        description={rows.length === 0 ? "Nada pendiente por ahora." : `${rows.length} ${rows.length === 1 ? "entrega" : "entregas"} en curso.`}
      />
      <CourierToday rows={rows} />
    </>
  );
}
