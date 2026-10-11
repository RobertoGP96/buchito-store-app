"use client";

import Link from "next/link";
import { useState } from "react";
import { Button, ListBox, Select, toast } from "@heroui/react";
import { Truck } from "lucide-react";
import { CHIP_BASE, CHIP_OFF, CHIP_ON } from "@/components/choice-chips";
import { EmptyState } from "@/components/empty-state";
import { Money } from "@/components/money";
import { LinkPending } from "@/components/nav-icon";
import { ListCard, ResponsiveList, type ListColumn } from "@/components/responsive-list";
import { StatusChip } from "@/components/status-chip";
import { fmtDateTime } from "@/lib/format";
import { assignCourier, unassignCourier } from "../actions/delivery-actions";
import { DELIVERY_STATUS_META, DELIVERY_STATUSES, VEHICLE_LABELS, type DeliveryStatus } from "../lib/labels";
import type { CourierRow } from "../queries/courier-queries";
import type { DeliveryRow } from "../queries/delivery-queries";
import { cn } from "@/lib/utils";

interface DeliveryListProps {
  rows: DeliveryRow[];
  couriers: Pick<CourierRow, "courierId" | "fullName" | "vehicle" | "openDeliveries">[];
  activeStatus: DeliveryStatus | null;
}

function AssignControl({
  delivery,
  couriers,
}: {
  delivery: DeliveryRow;
  couriers: DeliveryListProps["couriers"];
}) {
  const [courierId, setCourierId] = useState<string | null>(delivery.courierId ? String(delivery.courierId) : null);
  const [pending, setPending] = useState(false);
  const canAssign = delivery.status === "pending" || delivery.status === "failed";
  const canUnassign = delivery.status === "assigned";

  if (!canAssign && !canUnassign) return <span className="text-[12.5px] text-slate-400">{delivery.courierName ?? "—"}</span>;

  const run = async () => {
    setPending(true);
    try {
      const result = canUnassign
        ? await unassignCourier(delivery.deliveryId, delivery.version)
        : await assignCourier({ deliveryId: delivery.deliveryId, version: delivery.version, courierId: courierId ?? "" });
      if (!result.success) {
        toast.danger(result.error);
        return;
      }
      toast.success(canUnassign ? "Mensajero desasignado" : "Mensajero asignado");
    } catch (error) {
      console.error("AssignControl:", error);
      toast.danger("No se pudo actualizar la entrega");
    } finally {
      setPending(false);
    }
  };

  return (
    <div className="flex items-center gap-2">
      {canAssign && (
        <Select
          aria-label="Mensajero"
          placeholder="Elegir mensajero"
          selectedKey={courierId}
          onSelectionChange={(key) => setCourierId(key == null ? null : String(key))}
          className="min-w-[180px]"
        >
          <Select.Trigger>
            <Select.Value />
            <Select.Indicator />
          </Select.Trigger>
          <Select.Popover>
            <ListBox>
              {couriers.map((c) => (
                <ListBox.Item key={c.courierId} id={String(c.courierId)} textValue={c.fullName}>
                  {c.fullName}
                  <span className="ml-2 text-[12px] text-slate-400">
                    {VEHICLE_LABELS[c.vehicle]} · {c.openDeliveries} en curso
                  </span>
                  <ListBox.ItemIndicator />
                </ListBox.Item>
              ))}
            </ListBox>
          </Select.Popover>
        </Select>
      )}
      <Button
        variant={canUnassign ? "outline" : "primary"}
        size="sm"
        className="rounded-full"
        isPending={pending}
        isDisabled={pending || (canAssign && !courierId)}
        onPress={() => void run()}
      >
        {canUnassign ? "Desasignar" : "Asignar"}
      </Button>
    </div>
  );
}

export function DeliveryList({ rows, couriers, activeStatus }: DeliveryListProps) {
  const columns: ListColumn<DeliveryRow>[] = [
    {
      id: "order",
      header: "Pedido",
      isRowHeader: true,
      cell: (r) => (
        <div className="min-w-0">
          <Link href={`/admin/pedidos/${r.orderId}`} className="font-semibold text-navy-700 hover:underline">
            {r.orderNo}
          </Link>
          <p className="text-[12px] text-slate-400">
            {r.customerName} · <span className="tabular">{r.customerPhone}</span>
          </p>
        </div>
      ),
    },
    { id: "zone", header: "Zona", cell: (r) => r.zoneName ?? "—" },
    { id: "fee", header: "Tarifa", align: "right", cell: (r) => <Money value={r.fee} /> },
    { id: "status", header: "Estado", cell: (r) => <StatusChip {...DELIVERY_STATUS_META[r.status]} /> },
    { id: "courier", header: "Mensajero", cell: (r) => <AssignControl delivery={r} couriers={couriers} /> },
    { id: "date", header: "Creada", cell: (r) => <span className="tabular text-slate-500">{fmtDateTime(r.createdAt)}</span> },
  ];

  return (
    <>
      <div className="no-scrollbar -mx-1 flex snap-x gap-2 overflow-x-auto px-1 py-1">
        <Link href="/admin/entregas" scroll={false} className={cn(CHIP_BASE, activeStatus === null ? CHIP_ON : CHIP_OFF)}>
          Todas
          <LinkPending />
        </Link>
        {DELIVERY_STATUSES.map((status) => (
          <Link
            key={status}
            href={`/admin/entregas?status=${status}`}
            scroll={false}
            className={cn(CHIP_BASE, activeStatus === status ? CHIP_ON : CHIP_OFF)}
          >
            {DELIVERY_STATUS_META[status].label}
            <LinkPending />
          </Link>
        ))}
      </div>

      <ResponsiveList
        rows={rows}
        rowKey={(r) => r.deliveryId}
        columns={columns}
        ariaLabel="Entregas"
        empty={
          <div className="rounded-card bg-canvas shadow-card">
            <EmptyState icon={Truck} title="Sin entregas" description="Cuando un pedido a domicilio esté listo, su entrega aparecerá aquí." size="compact" />
          </div>
        }
        renderCard={(r) => (
          <ListCard
            title={`${r.orderNo} · ${r.customerName}`}
            subtitle={`${r.zoneName ?? "Sin zona"} · ${fmtDateTime(r.createdAt)}`}
            badge={<StatusChip {...DELIVERY_STATUS_META[r.status]} />}
            rows={[
              { label: "Teléfono", value: <span className="tabular">{r.customerPhone}</span> },
              { label: "Tarifa", value: <Money value={r.fee} /> },
              ...(r.failedReason ? [{ label: "Motivo", value: r.failedReason }] : []),
            ]}
            actions={<AssignControl delivery={r} couriers={couriers} />}
          />
        )}
      />
    </>
  );
}
