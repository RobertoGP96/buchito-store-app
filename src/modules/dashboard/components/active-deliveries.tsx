import { Bike, Clock, MapPin, Truck, type LucideIcon } from "lucide-react";
import { EmptyState } from "@/components/empty-state";
import { StatusChip } from "@/components/status-chip";
import { cn } from "@/lib/utils";
import { DELIVERY_STATUS_META, type DeliveryStatus } from "@/modules/deliveries/lib/labels";
import type { ActiveDeliveryRow } from "../queries/dashboard-queries";
import { DashboardCard, DashboardCount, DashboardRow } from "./dashboard-card";

/** Icono por estado activo; sin mensajero va en dorado porque pide acción. */
const STATUS_ICON: Partial<Record<DeliveryStatus, LucideIcon>> = {
  pending: Clock,
  assigned: Bike,
  in_transit: Truck,
};

interface ActiveDeliveriesProps {
  rows: ActiveDeliveryRow[];
  total: number;
}

export function ActiveDeliveries({ rows, total }: ActiveDeliveriesProps) {
  return (
    <DashboardCard
      icon={Truck}
      title="Entregas activas"
      description="Las más antiguas primero"
      badge={total > 0 ? <DashboardCount value={total} /> : undefined}
      href="/admin/entregas"
    >
      {rows.length === 0 ? (
        <EmptyState
          icon={Truck}
          title="Sin entregas activas"
          description="No hay entregas pendientes, asignadas ni en camino."
          size="compact"
        />
      ) : (
        <ul className="divide-y divide-line-soft">
          {rows.map((d) => {
            const Icon = STATUS_ICON[d.status] ?? Truck;
            const unassigned = !d.courierName;
            return (
              <li key={d.deliveryId}>
                <DashboardRow href={`/admin/pedidos/${d.orderId}`}>
                  <span
                    className={cn(
                      "flex h-9 w-9 flex-none items-center justify-center rounded-chip",
                      unassigned ? "bg-gold-100 text-gold-600" : "bg-tint text-navy-700"
                    )}
                  >
                    <Icon className="h-4 w-4" strokeWidth={1.9} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                      <span className="tabular text-[13.5px] font-semibold text-ink">{d.orderNo}</span>
                      <span className="truncate text-[13px] text-slate-500">{d.customerName}</span>
                    </div>
                    <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-[12px] text-slate-400">
                      {d.zoneName && (
                        <span className="inline-flex items-center gap-1">
                          <MapPin className="h-3.5 w-3.5" strokeWidth={1.9} />
                          {d.zoneName}
                        </span>
                      )}
                      <span className={cn("inline-flex items-center gap-1", unassigned && "font-medium text-warn")}>
                        <Bike className="h-3.5 w-3.5" strokeWidth={1.9} />
                        {d.courierName ?? "Sin asignar"}
                      </span>
                    </p>
                  </div>
                  <StatusChip {...DELIVERY_STATUS_META[d.status]} className="flex-none" />
                </DashboardRow>
              </li>
            );
          })}
        </ul>
      )}
    </DashboardCard>
  );
}
