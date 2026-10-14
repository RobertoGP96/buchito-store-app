import Link from "next/link";
import { Camera, ChevronRight, History } from "lucide-react";
import { CHIP_BASE, CHIP_OFF, CHIP_ON } from "@/components/choice-chips";
import { EmptyState } from "@/components/empty-state";
import { Money } from "@/components/money";
import { LinkPending } from "@/components/nav-icon";
import { StatusChip } from "@/components/status-chip";
import { fmtDateTime } from "@/lib/format";
import { cn } from "@/lib/utils";
import { DELIVERY_STATUS_META } from "../lib/labels";
import {
  COURIER_HISTORY_STATUSES,
  type CourierHistoryStatus,
  type DeliveryRow,
} from "../queries/delivery-queries";

interface CourierHistoryProps {
  rows: DeliveryRow[];
  activeStatus: CourierHistoryStatus | null;
}

function closedAt(d: DeliveryRow): string {
  return d.deliveredAt ?? d.failedAt ?? d.createdAt;
}

/** Entregas cerradas del mensajero con filtro por estado en la URL (los
 *  chips conservan la lista y muestran `LinkPending`, sin loading.tsx). */
export function CourierHistory({ rows, activeStatus }: CourierHistoryProps) {
  return (
    <>
      <div className="no-scrollbar -mx-1 flex snap-x gap-2 overflow-x-auto px-1 py-1">
        <Link href="/mensajero/historial" scroll={false} className={cn(CHIP_BASE, activeStatus === null ? CHIP_ON : CHIP_OFF)}>
          Todas
          <LinkPending />
        </Link>
        {COURIER_HISTORY_STATUSES.map((status) => (
          <Link
            key={status}
            href={`/mensajero/historial?status=${status}`}
            scroll={false}
            className={cn(CHIP_BASE, activeStatus === status ? CHIP_ON : CHIP_OFF)}
          >
            {DELIVERY_STATUS_META[status].label}
            <LinkPending />
          </Link>
        ))}
      </div>

      {rows.length === 0 ? (
        <div className="rounded-card bg-canvas shadow-card">
          <EmptyState
            icon={History}
            title="Todavía no hay entregas cerradas"
            description="Aquí quedan las entregas que completaste o que no se pudieron hacer."
            size="compact"
          />
        </div>
      ) : (
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
                    {d.proofPhotoUrl && (
                      <span className="inline-flex items-center gap-1 text-[11.5px] font-semibold text-slate-500">
                        <Camera className="h-3.5 w-3.5" strokeWidth={1.9} />
                        Con foto
                      </span>
                    )}
                  </div>
                  <p className="mt-1.5 text-[14px] text-ink">
                    {d.recipientName}
                    {d.zoneName && <span className="text-slate-400"> · {d.zoneName}</span>}
                  </p>
                  <p className="tabular mt-1 text-[12.5px] text-slate-500">{fmtDateTime(closedAt(d))}</p>
                  {d.failedReason && d.status === "failed" && (
                    <p className="mt-1.5 text-[12.5px] text-danger">{d.failedReason}</p>
                  )}
                </div>
                {d.status === "delivered" && (
                  <div className="flex flex-col items-end gap-0.5 text-right">
                    <Money value={d.courierFee} className="font-semibold text-navy-900" />
                    <span className={cn("text-[11px] font-semibold", d.isPaidToCourier ? "text-ok" : "text-slate-400")}>
                      {d.isPaidToCourier ? "Liquidada" : "Por cobrar"}
                    </span>
                  </div>
                )}
                <ChevronRight className="h-4 w-4 flex-none text-slate-300" strokeWidth={2} />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
