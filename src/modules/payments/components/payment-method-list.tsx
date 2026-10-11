"use client";

import { lazyDialog } from "@/components/lazy-dialog";
import { useState } from "react";
import { Button } from "@heroui/react";
import { Pencil, Plus, Wallet } from "lucide-react";
import { EmptyState } from "@/components/empty-state";
import type { SelectOption } from "@/components/form/fields";
import { ListCard, ResponsiveList, type ListColumn } from "@/components/responsive-list";
import { StatusChip } from "@/components/status-chip";
import { PAYMENT_KIND_LABELS } from "../lib/labels";
import type { PaymentMethodRow } from "../queries/payment-queries";

const PaymentMethodForm = lazyDialog(() => import("./payment-method-form").then((m) => m.PaymentMethodForm));

interface PaymentMethodListProps {
  rows: PaymentMethodRow[];
  currencies: SelectOption[];
}

export function PaymentMethodList({ rows, currencies }: PaymentMethodListProps) {
  const [editing, setEditing] = useState<PaymentMethodRow | null>(null);
  const [open, setOpen] = useState(false);

  const openNew = () => {
    setEditing(null);
    setOpen(true);
  };
  const openEdit = (row: PaymentMethodRow) => {
    setEditing(row);
    setOpen(true);
  };

  const columns: ListColumn<PaymentMethodRow>[] = [
    {
      id: "name",
      header: "Método",
      isRowHeader: true,
      cell: (r) => (
        <div className="min-w-0">
          <p className="font-semibold text-ink">{r.name}</p>
          <p className="text-[12px] text-slate-400">{r.code}</p>
        </div>
      ),
    },
    { id: "kind", header: "Tipo", cell: (r) => PAYMENT_KIND_LABELS[r.kind] },
    { id: "currency", header: "Moneda", cell: (r) => <span className="tabular font-medium">{r.currency.code}</span> },
    {
      id: "surcharge",
      header: "Recargo",
      align: "right",
      cell: (r) => <span className="tabular">{r.surchargePercent == null ? "—" : `${r.surchargePercent} %`}</span>,
    },
    { id: "reference", header: "Referencia", cell: (r) => (r.requiresReference ? "Obligatoria" : "No") },
    {
      id: "status",
      header: "Estado",
      cell: (r) => <StatusChip label={r.isActive ? "Activo" : "Inactivo"} tone={r.isActive ? "success" : "neutral"} />,
    },
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
          Nuevo método
        </Button>
      </div>

      <ResponsiveList
        rows={rows}
        rowKey={(r) => r.paymentMethodId}
        columns={columns}
        ariaLabel="Métodos de pago"
        empty={
          <div className="rounded-card bg-canvas shadow-card">
            <EmptyState icon={Wallet} title="Sin métodos de pago" description="Crea el primer método de pago." size="compact" />
          </div>
        }
        renderCard={(r) => (
          <ListCard
            title={r.name}
            subtitle={`${PAYMENT_KIND_LABELS[r.kind]} · ${r.code}`}
            badge={<StatusChip label={r.isActive ? "Activo" : "Inactivo"} tone={r.isActive ? "success" : "neutral"} />}
            rows={[
              { label: "Moneda", value: r.currency.code },
              { label: "Recargo", value: r.surchargePercent == null ? "—" : `${r.surchargePercent} %` },
              { label: "Referencia", value: r.requiresReference ? "Obligatoria" : "No" },
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

      <PaymentMethodForm
        key={editing?.paymentMethodId ?? "new"}
        open={open}
        onOpenChange={setOpen}
        method={editing}
        currencies={currencies}
      />
    </>
  );
}
