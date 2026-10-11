import Link from "next/link";
import { ChevronRight, MapPin, Phone, Truck } from "lucide-react";
import { EmptyState } from "@/components/empty-state";
import { StatusChip } from "@/components/status-chip";
import { fmtDateTime } from "@/lib/format";
import { DELIVERY_STATUS_META } from "../lib/labels";
import type { DeliveryRow } from "../queries/delivery-queries";

/** Lista del mensajero: una card por entrega, grande y tocable. */
export function CourierToday({ rows }: { rows: DeliveryRow[] }) {
  if (rows.length === 0) {
    return (
      <div className="rounded-card bg-canvas shadow-card">
        <EmptyState icon={Truck} title="Sin entregas asignadas" description="Cuando te asignen una entrega aparecerá aquí." size="compact" />
      </div>
    );
  }

  return (
    <ul className="flex flex-col gap-3">
      {rows.map((d) => (
        <li key={d.deliveryId}>
          <Link
            href={`/mensajero/entregas/${d.deliveryId}`}
            className="flex items-center gap-4 rounded-card bg-canvas p-4 shadow-card transition-shadow duration-200 hover:shadow-float"
          >
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <p className="font-semibold text-ink">{d.orderNo}</p>
                <StatusChip {...DELIVERY_STATUS_META[d.status]} />
              </div>
              <p className="mt-1.5 text-[14px] text-ink">{d.customerName}</p>
              <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-[12.5px] text-slate-500">
                <span className="inline-flex items-center gap-1">
                  <Phone className="h-3.5 w-3.5" strokeWidth={1.9} />
                  <span className="tabular">{d.customerPhone}</span>
                </span>
                {d.zoneName && (
                  <span className="inline-flex items-center gap-1">
                    <MapPin className="h-3.5 w-3.5" strokeWidth={1.9} />
                    {d.zoneName}
                  </span>
                )}
                {d.assignedAt && <span className="tabular">Asignada {fmtDateTime(d.assignedAt)}</span>}
              </p>
            </div>
            <ChevronRight className="h-5 w-5 flex-none text-slate-300" strokeWidth={2} />
          </Link>
        </li>
      ))}
    </ul>
  );
}
