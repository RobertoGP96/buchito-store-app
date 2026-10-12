import type { Metadata } from "next";
import { Truck, UserX } from "lucide-react";
import { getSessionCourierId } from "@/lib/auth-guard";
import { EmptyState } from "@/components/empty-state";
import { Money } from "@/components/money";
import { PageHeader } from "@/components/page-header";
import { CourierToday } from "@/modules/deliveries/components/courier-today";
import { getCourierEarnings } from "@/modules/deliveries/queries/courier-payment-queries";
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

  const [rows, earnings] = await Promise.all([getCourierOpenDeliveries(courierId), getCourierEarnings(courierId)]);
  const stats = [
    { label: "Entregas completadas", value: <span className="tabular">{earnings.deliveredCount}</span> },
    {
      label: "Por cobrar",
      value: <Money value={earnings.pendingFees} />,
      hint: `${earnings.pendingCount} ${earnings.pendingCount === 1 ? "entrega" : "entregas"} sin liquidar`,
    },
    { label: "Cobrado", value: <Money value={earnings.paidTotal} /> },
  ];

  return (
    <>
      <PageHeader
        icon={Truck}
        title="Mis entregas"
        description={rows.length === 0 ? "Nada pendiente por ahora." : `${rows.length} ${rows.length === 1 ? "entrega" : "entregas"} en curso.`}
      />
      <div className="grid grid-cols-3 gap-3">
        {stats.map((stat) => (
          <div key={stat.label} className="rounded-card bg-canvas p-3.5 shadow-card sm:p-4">
            <p className="font-display truncate text-[18px] leading-none text-navy-900 sm:text-[22px]">{stat.value}</p>
            <p className="mt-2 text-[11.5px] font-medium text-slate-500 sm:text-[12.5px]">{stat.label}</p>
            {stat.hint && <p className="mt-0.5 hidden text-[11.5px] text-slate-400 sm:block">{stat.hint}</p>}
          </div>
        ))}
      </div>
      <CourierToday rows={rows} />
    </>
  );
}
