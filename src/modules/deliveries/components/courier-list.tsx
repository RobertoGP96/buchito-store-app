"use client";

import { lazyDialog } from "@/components/lazy-dialog";
import { useState } from "react";
import { Button } from "@heroui/react";
import { Bike, Pencil, Plus } from "lucide-react";
import { EmptyState } from "@/components/empty-state";
import { Money } from "@/components/money";
import { ListCard, ResponsiveList, type ListColumn } from "@/components/responsive-list";
import { StatusChip } from "@/components/status-chip";
import { VEHICLE_LABELS } from "../lib/labels";
import type { CourierRow } from "../queries/courier-queries";

const CourierForm = lazyDialog(() => import("./courier-form").then((m) => m.CourierForm));

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
    { id: "fee", header: "Por entrega", align: "right", cell: (r) => <Money value={r.deliveryFee} /> },
    {
      id: "pending",
      header: "Por pagar",
      align: "right",
      cell: (r) => <Money value={r.pendingFees} className={r.pendingFees > 0 ? "font-semibold text-warn" : "text-slate-400"} />,
    },
    { id: "status", header: "Estado", cell: (r) => <StatusChip label={r.active ? "Activo" : "Inactivo"} tone={r.active ? "success" : "neutral"} /> },
    {
      id: "actions",
      header: "",
      align: "right",
      cell: (r) => (
        <Button variant="ghost" size="sm" isIconOnly aria-label={`Editar ${r.fullName}`} onPress={() => openEdit(r)}>
          <Pencil className="h-4 w-4" strokeWidth={1.9} />
        </Button>
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
              { label: "Por entrega", value: <Money value={r.deliveryFee} /> },
              { label: "Por pagar", value: <Money value={r.pendingFees} /> },
            ]}
            actions={
              <Button variant="outline" size="sm" className="rounded-full" onPress={() => openEdit(r)}>
                <Pencil className="h-3.5 w-3.5" strokeWidth={1.9} />
                Editar
              </Button>
            }
          />
        )}
      />

      <CourierForm key={editing?.courierId ?? "new"} open={open} onOpenChange={setOpen} courier={editing} />
    </>
  );
}
