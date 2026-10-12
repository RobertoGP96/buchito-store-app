"use client";

import Link from "next/link";
import { Gift, Pencil, Plus } from "lucide-react";
import { ButtonLink } from "@/components/button-link";
import { EmptyState } from "@/components/empty-state";
import { Money } from "@/components/money";
import { ProductImage } from "@/components/product-image";
import { ListCard, ResponsiveList, type ListColumn } from "@/components/responsive-list";
import { StatusChip } from "@/components/status-chip";
import { fmtDate } from "@/lib/format";
import { COMBO_STATE_META, comboItemsSummary } from "../lib/labels";
import type { AdminComboRow } from "../queries/combo-queries";

function itemsSummary(row: AdminComboRow): string {
  return comboItemsSummary(row.items);
}

function PriceCell({ row }: { row: AdminComboRow }) {
  return (
    <div className="flex flex-col items-end">
      <span className="font-semibold text-ink">
        <Money value={row.price} currency={row.priceCurrency} />
      </span>
      {row.regularPriceBase != null && row.regularPriceBase > (row.priceBase ?? 0) && (
        <span className="text-[11.5px] text-slate-400">
          <span className="line-through">
            <Money value={row.regularPriceBase} />
          </span>
          {row.savingsPct > 0 && <span className="ml-1 font-semibold text-ok">−{row.savingsPct}%</span>}
        </span>
      )}
      {row.priceBase == null && <span className="text-[11.5px] font-medium text-warn">Sin tasa</span>}
    </div>
  );
}

function Validity({ row }: { row: AdminComboRow }) {
  if (!row.startsAt && !row.endsAt) return <span className="text-slate-400">Siempre</span>;
  return (
    <span className="tabular whitespace-nowrap">
      {row.startsAt ? fmtDate(row.startsAt) : "…"} – {row.endsAt ? fmtDate(row.endsAt) : "…"}
    </span>
  );
}

function Availability({ row }: { row: AdminComboRow }) {
  const out = row.available <= 0;
  return (
    <span className={out ? "tabular font-semibold text-danger" : "tabular font-semibold text-ink"}>
      {row.available}
      {out && <span className="ml-1.5 text-[11px] font-medium">Agotado</span>}
    </span>
  );
}

function Chips({ row }: { row: AdminComboRow }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      <StatusChip {...COMBO_STATE_META[row.state]} />
      {row.featured && <StatusChip label="Destacado" tone="info" />}
    </div>
  );
}

export function ComboList({ rows }: { rows: AdminComboRow[] }) {
  const columns: ListColumn<AdminComboRow>[] = [
    {
      id: "name",
      header: "Combo",
      isRowHeader: true,
      cell: (r) => (
        <div className="flex min-w-0 items-center gap-3">
          <span className="relative h-11 w-11 flex-none overflow-hidden rounded-field bg-cream">
            <span className="absolute inset-0 flex items-center justify-center">
              <ProductImage src={r.imageUrl} alt="" sizes="44px" />
            </span>
          </span>
          <div className="min-w-0">
            <Link href={`/admin/combos/${r.comboId}`} className="font-semibold text-ink hover:text-navy-700">
              {r.name}
            </Link>
            <p className="line-clamp-1 text-[12px] text-slate-400">{itemsSummary(r)}</p>
          </div>
        </div>
      ),
    },
    { id: "items", header: "Productos", align: "right", cell: (r) => <span className="tabular">{r.items.length}</span> },
    { id: "price", header: "Precio", align: "right", cell: (r) => <PriceCell row={r} /> },
    { id: "available", header: "Disponibles", align: "right", cell: (r) => <Availability row={r} /> },
    { id: "validity", header: "Vigencia", cell: (r) => <Validity row={r} /> },
    { id: "state", header: "Estado", cell: (r) => <Chips row={r} /> },
    {
      id: "actions",
      header: "",
      align: "right",
      cell: (r) => (
        <Link
          href={`/admin/combos/${r.comboId}`}
          aria-label={`Editar ${r.name}`}
          className="inline-flex h-8 w-8 items-center justify-center rounded-full text-slate-500 hover:bg-hover hover:text-navy-700"
        >
          <Pencil className="h-4 w-4" strokeWidth={1.9} />
        </Link>
      ),
    },
  ];

  return (
    <>
      <div className="flex justify-end">
        <ButtonLink href="/admin/combos/nuevo" variant="solid" size="sm">
          <Plus className="h-4 w-4" strokeWidth={2.2} />
          Nuevo combo
        </ButtonLink>
      </div>

      <ResponsiveList
        rows={rows}
        rowKey={(r) => r.comboId}
        columns={columns}
        ariaLabel="Combos"
        empty={
          <div className="rounded-card bg-canvas shadow-card">
            <EmptyState
              icon={Gift}
              title="Sin combos"
              description="Agrupa varios productos con sus cantidades y ofrécelos a un precio cerrado."
              ctaLabel="Crear combo"
              ctaHref="/admin/combos/nuevo"
              size="compact"
            />
          </div>
        }
        renderCard={(r) => (
          <ListCard
            title={r.name}
            subtitle={itemsSummary(r)}
            badge={<Chips row={r} />}
            rows={[
              { label: "Precio", value: <PriceCell row={r} /> },
              { label: "Disponibles", value: <Availability row={r} /> },
              { label: "Vigencia", value: <Validity row={r} /> },
            ]}
            actions={
              <ButtonLink href={`/admin/combos/${r.comboId}`} variant="outline" size="sm">
                <Pencil className="h-3.5 w-3.5" strokeWidth={1.9} />
                Editar
              </ButtonLink>
            }
          />
        )}
      />
    </>
  );
}
