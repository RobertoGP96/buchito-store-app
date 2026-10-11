"use client";

import { useState } from "react";
import { Button } from "@heroui/react";
import { MapPin, Pencil, Plus } from "lucide-react";
import { EmptyState } from "@/components/empty-state";
import { Money } from "@/components/money";
import { ListCard, ResponsiveList, type ListColumn } from "@/components/responsive-list";
import { StatusChip } from "@/components/status-chip";
import { ZoneForm } from "./zone-form";
import type { ZoneRow } from "../queries/zone-queries";

export function ZoneList({ rows }: { rows: ZoneRow[] }) {
  const [editing, setEditing] = useState<ZoneRow | null>(null);
  const [open, setOpen] = useState(false);

  const openNew = () => {
    setEditing(null);
    setOpen(true);
  };
  const openEdit = (row: ZoneRow) => {
    setEditing(row);
    setOpen(true);
  };

  const columns: ListColumn<ZoneRow>[] = [
    {
      id: "name",
      header: "Zona",
      isRowHeader: true,
      cell: (r) => (
        <div className="min-w-0">
          <p className="font-semibold text-ink">{r.name}</p>
          {r.description && <p className="text-[12px] text-slate-400">{r.description}</p>}
        </div>
      ),
    },
    { id: "fee", header: "Tarifa", align: "right", cell: (r) => <Money value={r.fee} /> },
    {
      id: "free",
      header: "Gratis desde",
      align: "right",
      cell: (r) => (r.freeShippingThreshold == null ? <span className="text-slate-400">General</span> : <Money value={r.freeShippingThreshold} />),
    },
    { id: "eta", header: "Tiempo", cell: (r) => r.etaLabel ?? "—" },
    { id: "orders", header: "Pedidos", align: "right", cell: (r) => <span className="tabular">{r.orderCount}</span> },
    { id: "status", header: "Estado", cell: (r) => <StatusChip label={r.active ? "Activa" : "Inactiva"} tone={r.active ? "success" : "neutral"} /> },
    {
      id: "actions",
      header: "",
      align: "right",
      cell: (r) => (
        <Button variant="ghost" size="sm" isIconOnly aria-label={`Editar ${r.name}`} onPress={() => openEdit(r)}>
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
          Nueva zona
        </Button>
      </div>

      <ResponsiveList
        rows={rows}
        rowKey={(r) => r.zoneId}
        columns={columns}
        ariaLabel="Zonas de entrega"
        empty={
          <div className="rounded-card bg-canvas shadow-card">
            <EmptyState icon={MapPin} title="Sin zonas" description="Crea la primera zona de entrega." size="compact" />
          </div>
        }
        renderCard={(r) => (
          <ListCard
            title={r.name}
            subtitle={r.etaLabel ?? r.description ?? undefined}
            badge={<StatusChip label={r.active ? "Activa" : "Inactiva"} tone={r.active ? "success" : "neutral"} />}
            rows={[
              { label: "Tarifa", value: <Money value={r.fee} /> },
              { label: "Gratis desde", value: r.freeShippingThreshold == null ? "General" : <Money value={r.freeShippingThreshold} /> },
              { label: "Pedidos", value: r.orderCount },
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

      <ZoneForm key={editing?.zoneId ?? "new"} open={open} onOpenChange={setOpen} zone={editing} />
    </>
  );
}
