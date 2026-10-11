"use client";

import { useState } from "react";
import { Button } from "@heroui/react";
import { Pencil, Plus, TicketPercent } from "lucide-react";
import { EmptyState } from "@/components/empty-state";
import { Money } from "@/components/money";
import { ListCard, ResponsiveList, type ListColumn } from "@/components/responsive-list";
import { StatusChip } from "@/components/status-chip";
import { fmtDate } from "@/lib/format";
import { CouponForm } from "./coupon-form";
import { COUPON_STATE_META } from "../lib/labels";
import type { CouponRow } from "../queries/coupon-queries";

function Discount({ row }: { row: CouponRow }) {
  if (row.kind === "percent") return <span className="tabular">{row.value} %</span>;
  return <Money value={row.value} />;
}

function Validity({ row }: { row: CouponRow }) {
  if (!row.startsAt && !row.endsAt) return <span className="text-slate-400">Siempre</span>;
  return (
    <span className="tabular whitespace-nowrap">
      {row.startsAt ? fmtDate(row.startsAt) : "…"} – {row.endsAt ? fmtDate(row.endsAt) : "…"}
    </span>
  );
}

function Uses({ row }: { row: CouponRow }) {
  return (
    <span className="tabular">
      {row.usedCount}
      <span className="text-slate-400"> / {row.maxUses ?? "∞"}</span>
    </span>
  );
}

export function CouponList({ rows }: { rows: CouponRow[] }) {
  const [editing, setEditing] = useState<CouponRow | null>(null);
  const [open, setOpen] = useState(false);

  const openNew = () => {
    setEditing(null);
    setOpen(true);
  };
  const openEdit = (row: CouponRow) => {
    setEditing(row);
    setOpen(true);
  };

  const columns: ListColumn<CouponRow>[] = [
    {
      id: "code",
      header: "Código",
      isRowHeader: true,
      cell: (r) => <span className="tabular font-semibold text-ink">{r.code}</span>,
    },
    { id: "discount", header: "Descuento", align: "right", cell: (r) => <Discount row={r} /> },
    {
      id: "min",
      header: "Compra mínima",
      align: "right",
      cell: (r) => (r.minSubtotal == null ? <span className="text-slate-400">—</span> : <Money value={r.minSubtotal} />),
    },
    { id: "uses", header: "Usos", align: "right", cell: (r) => <Uses row={r} /> },
    { id: "validity", header: "Vigencia", cell: (r) => <Validity row={r} /> },
    { id: "state", header: "Estado", cell: (r) => <StatusChip {...COUPON_STATE_META[r.state]} /> },
    {
      id: "actions",
      header: "",
      align: "right",
      cell: (r) => (
        <Button variant="ghost" size="sm" isIconOnly aria-label={`Editar ${r.code}`} onPress={() => openEdit(r)}>
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
          Nuevo cupón
        </Button>
      </div>

      <ResponsiveList
        rows={rows}
        rowKey={(r) => r.couponId}
        columns={columns}
        ariaLabel="Cupones"
        empty={
          <div className="rounded-card bg-canvas shadow-card">
            <EmptyState
              icon={TicketPercent}
              title="Sin cupones"
              description="Crea el primer código de descuento para el checkout."
              size="compact"
            />
          </div>
        }
        renderCard={(r) => (
          <ListCard
            title={r.code}
            subtitle={<Validity row={r} />}
            badge={<StatusChip {...COUPON_STATE_META[r.state]} />}
            rows={[
              { label: "Descuento", value: <Discount row={r} /> },
              { label: "Compra mínima", value: r.minSubtotal == null ? "—" : <Money value={r.minSubtotal} /> },
              { label: "Usos", value: <Uses row={r} /> },
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

      <CouponForm key={editing?.couponId ?? "new"} open={open} onOpenChange={setOpen} coupon={editing} />
    </>
  );
}
