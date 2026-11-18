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
import { ScrollFadeRow } from "@/components/scroll-fade-row";

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
      <ScrollFadeRow>
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
      </ScrollFadeRow>

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
                      <span className="inline-flex items-center gap-1 type-caption font-semibold text-ink-muted">
                        <Camera className="h-3.5 w-3.5" strokeWidth={1.9} />
                        Con foto
                      </span>
                    )}
                  </div>
                  <p className="mt-1.5 type-body text-ink">
                    {d.recipientName}
                    {d.zoneName && <span className="text-ink-subtle"> · {d.zoneName}</span>}
                  </p>
                  <p className="tabular mt-1 type-meta text-ink-muted">{fmtDateTime(closedAt(d))}</p>
                  {d.failedReason && d.status === "failed" && (
                    <p className="mt-1.5 type-meta text-danger">{d.failedReason}</p>
                  )}
                </div>
                {d.status === "delivered" && (
                  <div className="flex flex-col items-end gap-0.5 text-right">
                    <Money value={d.courierFee} className="font-semibold text-espresso-900" />
                    <span className={cn("type-micro font-semibold", d.isPaidToCourier ? "text-ok" : "text-ink-subtle")}>
                      {d.isPaidToCourier ? "Liquidada" : "Por cobrar"}
                    </span>
                  </div>
                )}
                <ChevronRight className="h-4 w-4 flex-none text-ink-faint" strokeWidth={1.9} />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
