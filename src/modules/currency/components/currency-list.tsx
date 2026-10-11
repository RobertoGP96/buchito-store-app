"use client";

import { useState } from "react";
import { Button } from "@heroui/react";
import { Coins, Pencil, Plus } from "lucide-react";
import { EmptyState } from "@/components/empty-state";
import { ListCard, ResponsiveList, type ListColumn } from "@/components/responsive-list";
import { StatusChip } from "@/components/status-chip";
import { CurrencyForm } from "./currency-form";
import { SetBaseCurrencyButton } from "./set-base-currency-button";
import type { CurrencyRow } from "../queries/currency-queries";

function RateCell({ row, baseCode }: { row: CurrencyRow; baseCode: string | null }) {
  if (row.isBase) return <span className="text-slate-400">Base</span>;
  if (row.rateToBase == null) return <span className="font-medium text-warn">Sin tasa</span>;
  return (
    <span className="tabular">
      1 {row.code} = {row.rateToBase.toLocaleString("es-MX", { maximumFractionDigits: 4 })} {baseCode}
    </span>
  );
}

export function CurrencyList({ rows }: { rows: CurrencyRow[] }) {
  const [editing, setEditing] = useState<CurrencyRow | null>(null);
  const [open, setOpen] = useState(false);
  const baseCode = rows.find((r) => r.isBase)?.code ?? null;

  const openNew = () => {
    setEditing(null);
    setOpen(true);
  };
  const openEdit = (row: CurrencyRow) => {
    setEditing(row);
    setOpen(true);
  };

  const columns: ListColumn<CurrencyRow>[] = [
    { id: "code", header: "Código", isRowHeader: true, cell: (r) => <span className="font-semibold text-ink">{r.code}</span> },
    { id: "name", header: "Nombre", cell: (r) => r.name },
    { id: "symbol", header: "Símbolo", cell: (r) => r.symbol },
    { id: "decimals", header: "Decimales", align: "right", cell: (r) => <span className="tabular">{r.decimalPlaces}</span> },
    { id: "rate", header: "Tasa a base", cell: (r) => <RateCell row={r} baseCode={baseCode} /> },
    {
      id: "status",
      header: "Estado",
      cell: (r) =>
        r.isBase ? (
          <StatusChip label="Moneda base" tone="info" />
        ) : (
          <StatusChip label={r.isActive ? "Activa" : "Inactiva"} tone={r.isActive ? "success" : "neutral"} />
        ),
    },
    {
      id: "actions",
      header: "",
      align: "right",
      cell: (r) => (
        <div className="flex items-center justify-end gap-1.5">
          {!r.isBase && r.isActive && <SetBaseCurrencyButton currency={r} currentBaseCode={baseCode} />}
          <Button variant="ghost" size="sm" isIconOnly aria-label={`Editar ${r.code}`} onPress={() => openEdit(r)}>
            <Pencil className="h-4 w-4" strokeWidth={1.9} />
          </Button>
        </div>
      ),
    },
  ];

  return (
    <>
      <div className="flex justify-end">
        <Button variant="primary" className="rounded-full" onPress={openNew}>
          <Plus className="h-4 w-4" strokeWidth={2.2} />
          Nueva moneda
        </Button>
      </div>

      <ResponsiveList
        rows={rows}
        rowKey={(r) => r.currencyId}
        columns={columns}
        ariaLabel="Monedas"
        empty={
          <div className="rounded-card bg-canvas shadow-card">
            <EmptyState icon={Coins} title="Sin monedas" description="Crea la moneda base de la tienda." size="compact" />
          </div>
        }
        renderCard={(r) => (
          <ListCard
            title={`${r.code} · ${r.name}`}
            subtitle={`Símbolo ${r.symbol} · ${r.decimalPlaces} decimales`}
            badge={
              r.isBase ? (
                <StatusChip label="Base" tone="info" />
              ) : (
                <StatusChip label={r.isActive ? "Activa" : "Inactiva"} tone={r.isActive ? "success" : "neutral"} />
              )
            }
            rows={[{ label: "Tasa a base", value: <RateCell row={r} baseCode={baseCode} /> }]}
            actions={
              <>
                {!r.isBase && r.isActive && <SetBaseCurrencyButton currency={r} currentBaseCode={baseCode} />}
                <Button variant="outline" size="sm" className="rounded-full" onPress={() => openEdit(r)}>
                  <Pencil className="h-3.5 w-3.5" strokeWidth={1.9} />
                  Editar
                </Button>
              </>
            }
          />
        )}
      />

      {/* key: el formulario se remonta por moneda para resetear los valores. */}
      <CurrencyForm key={editing?.currencyId ?? "new"} open={open} onOpenChange={setOpen} currency={editing} />
    </>
  );
}
