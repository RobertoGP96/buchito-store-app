"use client";

import { lazyDialog } from "@/components/lazy-dialog";
import { useState } from "react";
import { Button } from "@heroui/react";
import { Bike, Pencil, Plus } from "lucide-react";
import { DeleteButton } from "@/components/delete-button";
import { EmptyState } from "@/components/empty-state";
import { ListCard, ResponsiveList, type ListColumn } from "@/components/responsive-list";
import { StatusChip } from "@/components/status-chip";
import { deleteCourier } from "../actions/courier-actions";
import { VEHICLE_LABELS } from "../lib/labels";
import type { CourierRow } from "../queries/courier-queries";

const CourierForm = lazyDialog(() => import("./courier-form").then((m) => m.CourierForm));

function DeleteCourierButton({ row, appearance }: { row: CourierRow; appearance: "icon" | "button" }) {
  return (
    <DeleteButton
      appearance={appearance}
      itemLabel={row.fullName}
      description={`Se eliminará el mensajero ${row.fullName} y su cuenta de acceso (${row.email}).`}
      blockedReason={
        row.deliveryCount > 0
          ? `Tiene ${row.deliveryCount} ${row.deliveryCount === 1 ? "entrega registrada" : "entregas registradas"}. Desactívalo en su lugar.`
          : null
      }
      successMessage={`Mensajero ${row.fullName} eliminado`}
      onConfirm={() => deleteCourier(row.courierId)}
    />
  );
}

export function CourierList({ rows }: { rows: CourierRow[] }) {
  const [editing, setEditing] = useState<CourierRow | null>(null);
  const [open, setOpen] = useState(false);

  const openNew = () => {
    setEditing(null);
    setOpen(true);
  };
  const openEdit = (row: CourierRow) => {
    setEditing(row);
    setOpen(true);
  };

  const columns: ListColumn<CourierRow>[] = [
    {
      id: "name",
      header: "Mensajero",
      isRowHeader: true,
      cell: (r) => (
        <div className="min-w-0">
          <p className="font-semibold text-ink">{r.fullName}</p>
          <p className="text-[12px] text-slate-400">{r.email}</p>
        </div>
      ),
    },
    { id: "phone", header: "Teléfono", cell: (r) => <span className="tabular">{r.phone}</span> },
    { id: "vehicle", header: "Vehículo", cell: (r) => VEHICLE_LABELS[r.vehicle] },
    { id: "open", header: "En curso", align: "right", cell: (r) => <span className="tabular">{r.openDeliveries}</span> },
    { id: "delivered", header: "Entregadas", align: "right", cell: (r) => <span className="tabular">{r.deliveredCount}</span> },
    { id: "status", header: "Estado", cell: (r) => <StatusChip label={r.active ? "Activo" : "Inactivo"} tone={r.active ? "success" : "neutral"} /> },
    {
      id: "actions",
      header: "",
      align: "right",
      cell: (r) => (
        <div className="flex items-center justify-end gap-1">
          <Button variant="ghost" size="sm" isIconOnly aria-label={`Editar ${r.fullName}`} onPress={() => openEdit(r)}>
            <Pencil className="h-4 w-4" strokeWidth={1.9} />
          </Button>
          <DeleteCourierButton row={r} appearance="icon" />
        </div>
      ),
    },
  ];

  return (
    <>
      <div className="flex justify-end">
        <Button variant="primary" className="rounded-full" onPress={openNew}>
          <Plus className="h-4 w-4" strokeWidth={2.2} />
          Nuevo mensajero
        </Button>
      </div>

      <ResponsiveList
        rows={rows}
        rowKey={(r) => r.courierId}
        columns={columns}
        ariaLabel="Mensajeros"
        empty={
          <div className="rounded-card bg-canvas shadow-card">
            <EmptyState icon={Bike} title="Sin mensajeros" description="Da de alta el primer mensajero." size="compact" />
          </div>
        }
        renderCard={(r) => (
          <ListCard
            title={r.fullName}
            subtitle={`${VEHICLE_LABELS[r.vehicle]} · ${r.phone}`}
            badge={<StatusChip label={r.active ? "Activo" : "Inactivo"} tone={r.active ? "success" : "neutral"} />}
            rows={[
              { label: "En curso", value: r.openDeliveries },
              { label: "Entregadas", value: r.deliveredCount },
            ]}
            actions={
              <>
                <Button variant="outline" size="sm" className="rounded-full" onPress={() => openEdit(r)}>
                  <Pencil className="h-3.5 w-3.5" strokeWidth={1.9} />
                  Editar
                </Button>
                <DeleteCourierButton row={r} appearance="button" />
              </>
            }
          />
        )}
      />

      <CourierForm key={editing?.courierId ?? "new"} open={open} onOpenChange={setOpen} courier={editing} />
    </>
  );
}
