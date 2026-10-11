import Link from "next/link";
import { Bike, MapPin, Truck } from "lucide-react";
import { EmptyState } from "@/components/empty-state";
import { StatusChip } from "@/components/status-chip";
import { DELIVERY_STATUS_META } from "@/modules/deliveries/lib/labels";
import type { ActiveDeliveryRow } from "../queries/dashboard-queries";
import { DashboardCard } from "./dashboard-card";

export function ActiveDeliveries({ rows }: { rows: ActiveDeliveryRow[] }) {
  return (
    <DashboardCard title="Entregas activas" href="/admin/entregas">
      {rows.length === 0 ? (
        <EmptyState
          icon={Truck}
          title="Sin entregas activas"
          description="No hay entregas pendientes, asignadas ni en camino."
          size="compact"
        />
      ) : (
        <ul className="divide-y divide-line-soft">
          {rows.map((d) => (
            <li key={d.deliveryId}>
              <Link
                href={`/admin/pedidos/${d.orderId}`}
                className="-mx-2 flex items-center gap-3 rounded-chip px-2 py-2.5 transition-colors hover:bg-tint"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                    <span className="tabular text-[13.5px] font-semibold text-ink">{d.orderNo}</span>
                    <StatusChip {...DELIVERY_STATUS_META[d.status]} />
                  </div>
                  <p className="mt-1 truncate text-[13px] text-slate-500">{d.customerName}</p>
                  <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-[12px] text-slate-400">
                    {d.zoneName && (
                      <span className="inline-flex items-center gap-1">
                        <MapPin className="h-3.5 w-3.5" strokeWidth={1.9} />
                        {d.zoneName}
                      </span>
                    )}
                    <span className={d.courierName ? "inline-flex items-center gap-1" : "inline-flex items-center gap-1 text-warn"}>
                      <Bike className="h-3.5 w-3.5" strokeWidth={1.9} />
                      {d.courierName ?? "Sin asignar"}
                    </span>
                  </p>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </DashboardCard>
  );
}
