import Link from "next/link";
import { ChevronRight, MapPin, Phone, Truck } from "lucide-react";
import { EmptyState } from "@/components/empty-state";
import { StatusChip } from "@/components/status-chip";
import { fmtDateTime } from "@/lib/format";
import { DELIVERY_STATUS_META } from "../lib/labels";
import type { DeliveryRow } from "../queries/delivery-queries";

function DeliveryCard({ d }: { d: DeliveryRow }) {
  const since = d.status === "in_transit" ? d.pickedUpAt : d.assignedAt;
  return (
    <li>
      <Link
        href={`/mensajero/entregas/${d.deliveryId}`}
        className="flex items-center gap-4 rounded-card bg-canvas p-4 shadow-card transition-shadow duration-200 hover:shadow-float"
      >
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="font-semibold text-ink">{d.orderNo}</p>
            <StatusChip {...DELIVERY_STATUS_META[d.status]} />
            {d.attempts > 0 && (
              <span className="text-[11.5px] font-semibold text-warning">Reintento {d.attempts + 1}</span>
            )}
          </div>
          <p className="mt-2 text-[15px] font-semibold text-ink">{d.recipientName}</p>
          {d.addressLine && (
            <p className="mt-1 flex items-start gap-1.5 text-[13px] leading-[1.5] text-slate-600">
              <MapPin className="mt-0.5 h-3.5 w-3.5 flex-none text-navy-700" strokeWidth={1.9} />
              <span>
                {d.addressLine}
                {d.zoneName && <span className="text-slate-400"> · {d.zoneName}</span>}
              </span>
            </p>
          )}
          <p className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[12.5px] text-slate-500">
            <span className="inline-flex items-center gap-1">
              <Phone className="h-3.5 w-3.5" strokeWidth={1.9} />
              <span className="tabular">{d.recipientPhone}</span>
            </span>
            {since && (
              <span className="tabular">
                {d.status === "in_transit" ? "En camino desde" : "Asignada"} {fmtDateTime(since)}
              </span>
            )}
          </p>
        </div>
        <ChevronRight className="h-5 w-5 flex-none text-slate-300" strokeWidth={2} />
      </Link>
    </li>
  );
}

function Group({ title, rows }: { title: string; rows: DeliveryRow[] }) {
  if (rows.length === 0) return null;
  return (
    <section>
      <p className="eyebrow mb-2.5">
        {title} <span className="tabular text-slate-400">· {rows.length}</span>
      </p>
      <ul className="flex flex-col gap-3">
        {rows.map((d) => (
          <DeliveryCard key={d.deliveryId} d={d} />
        ))}
      </ul>
    </section>
  );
}

/** Lista del mensajero: lo que lleva encima primero, después lo que tiene
 *  que recoger. Cards grandes y tocables con lo justo para orientarse. */
export function CourierToday({ rows }: { rows: DeliveryRow[] }) {
  if (rows.length === 0) {
    return (
      <div className="rounded-card bg-canvas shadow-card">
        <EmptyState
          icon={Truck}
          title="Sin entregas asignadas"
          description="Cuando te asignen una entrega aparecerá aquí."
          size="compact"
        />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5">
      <Group title="En camino" rows={rows.filter((d) => d.status === "in_transit")} />
      <Group title="Por recoger" rows={rows.filter((d) => d.status === "assigned")} />
    </div>
  );
}
