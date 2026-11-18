import type { Metadata } from "next";
import { Truck } from "lucide-react";
import { getSessionCourierId } from "@/lib/auth-guard";
import { ButtonLink } from "@/components/button-link";
import { Money } from "@/components/money";
import { PageHeader } from "@/components/page-header";
import { CourierInactive } from "@/modules/deliveries/components/courier-inactive";
import { CourierToday } from "@/modules/deliveries/components/courier-today";
import { getCourierEarnings } from "@/modules/deliveries/queries/courier-payment-queries";
import { getCourierOpenDeliveries } from "@/modules/deliveries/queries/delivery-queries";
import { StatTile } from "@/components/stat-tile";

export const metadata: Metadata = { title: "Mis entregas" };
export const dynamic = "force-dynamic";

export default async function CourierHomePage() {
  const courierId = await getSessionCourierId();
  if (courierId == null) return <CourierInactive />;

  const [rows, earnings] = await Promise.all([getCourierOpenDeliveries(courierId), getCourierEarnings(courierId)]);
  const inTransit = rows.filter((d) => d.status === "in_transit").length;
  const stats = [
    { label: "En curso", value: <span className="tabular">{rows.length}</span>, hint: `${inTransit} en camino` },
    {
      label: "Por cobrar",
      value: <Money value={earnings.pendingFees} />,
      hint: `${earnings.pendingCount} ${earnings.pendingCount === 1 ? "entrega" : "entregas"} sin liquidar`,
    },
    { label: "Completadas", value: <span className="tabular">{earnings.deliveredCount}</span>, hint: "en total" },
  ];

  return (
    <>
      <PageHeader
        icon={Truck}
        title="Mis entregas"
        description={
          rows.length === 0
            ? "Nada pendiente por ahora."
            : `${rows.length} ${rows.length === 1 ? "entrega" : "entregas"} en curso. Toca una para ver la dirección y marcar el siguiente paso.`
        }
      >
        <ButtonLink href="/mensajero/ganancias" variant="soft" size="sm">
          Ver ganancias
        </ButtonLink>
      </PageHeader>
      {/* En móvil, dos columnas y el último dato a lo ancho: tres no dejan sitio al monto. */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {stats.map((stat) => (
          <StatTile key={stat.label} size="sm" className="last:col-span-2 sm:last:col-span-1" {...stat} />
        ))}
      </div>
      <CourierToday rows={rows} />
    </>
  );
}
