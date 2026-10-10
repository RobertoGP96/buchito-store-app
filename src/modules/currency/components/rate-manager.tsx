"use client";

import { useState } from "react";
import { Button } from "@heroui/react";
import { Pencil, TrendingUp } from "lucide-react";
import { EmptyState } from "@/components/empty-state";
import { fmtDateTime } from "@/lib/format";
import { RateForm } from "./rate-form";
import { RateHistoryList } from "./rate-history-list";
import type { RatesOverview, RateOverviewRow } from "../queries/rate-queries";

/** Una card por moneda (no base): tasa vigente, última actualización e
 *  historial. Pocas monedas y mucho contexto por fila: cards en todas las
 *  anchuras, no tabla. */
export function RateManager({ overview }: { overview: RatesOverview }) {
  const [editing, setEditing] = useState<RateOverviewRow | null>(null);
  const [open, setOpen] = useState(false);

  if (!overview.base) {
    return (
      <div className="rounded-card bg-canvas shadow-card">
        <EmptyState
          icon={TrendingUp}
          title="Falta la moneda base"
          description="Elige la moneda base en Configuración antes de definir tasas."
          ctaLabel="Ir a configuración"
          ctaHref="/admin/configuracion"
          size="compact"
        />
      </div>
    );
  }

  if (overview.rows.length === 0) {
    return (
      <div className="rounded-card bg-canvas shadow-card">
        <EmptyState
          icon={TrendingUp}
          title="Solo existe la moneda base"
          description="Crea otra moneda activa para poder fijar su tasa de cambio."
          ctaLabel="Ir a monedas"
          ctaHref="/admin/monedas"
          size="compact"
        />
      </div>
    );
  }

  const base = overview.base;

  return (
    <>
      <div className="grid gap-4 lg:grid-cols-2">
        {overview.rows.map((row) => (
          <article key={row.currency.currencyId} className="rounded-card bg-canvas p-5 shadow-card">
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <p className="eyebrow">{row.currency.name ?? row.currency.code}</p>
                <p className="tabular font-display mt-2 text-[22px] leading-none text-navy-900">
                  1 {row.currency.code} ={" "}
                  {row.rate == null ? (
                    <span className="text-warn">sin tasa</span>
                  ) : (
                    <>
                      {row.rate.toLocaleString("es-MX", { maximumFractionDigits: 4 })} {base.code}
                    </>
                  )}
                </p>
                {row.updatedAt && (
                  <p className="tabular mt-2 text-[12px] text-slate-400">
                    Actualizada {fmtDateTime(row.updatedAt)}
                    {row.isInverse && " · guardada como par inverso"}
                  </p>
                )}
              </div>
              <Button
                variant={row.rate == null ? "primary" : "outline"}
                size="sm"
                className="rounded-full"
                onPress={() => {
                  setEditing(row);
                  setOpen(true);
                }}
              >
                <Pencil className="h-3.5 w-3.5" strokeWidth={1.9} />
                {row.rate == null ? "Fijar tasa" : "Actualizar"}
              </Button>
            </div>
            <div className="mt-4 border-t border-line pt-3">
              <p className="eyebrow mb-1">Historial</p>
              <RateHistoryList history={row.history} baseCode={base.code} />
            </div>
          </article>
        ))}
      </div>

      <RateForm
        key={editing?.currency.currencyId ?? "none"}
        open={open}
        onOpenChange={setOpen}
        row={editing}
        base={base}
      />
    </>
  );
}
