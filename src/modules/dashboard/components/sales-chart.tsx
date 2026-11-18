"use client";

import { useMemo, useState } from "react";
import { ArrowDownRight, ArrowUpRight, ChartColumn } from "lucide-react";
import { Money } from "@/components/money";
import { cn } from "@/lib/utils";
import { summarizeRange, type SalesDay } from "../lib/sales-series";
import { DashboardCard } from "./dashboard-card";

const RANGES = [7, 30] as const;
type Range = (typeof RANGES)[number];

const DAY_FORMAT = new Intl.DateTimeFormat("es-MX", { day: "numeric", month: "short" });
const WEEKDAY_FORMAT = new Intl.DateTimeFormat("es-MX", { weekday: "short" });

function parseDay(date: string): Date {
  const [y, m, d] = date.split("-").map(Number);
  return new Date(y, m - 1, d);
}

/** Ventas por día en barras. HTML y no SVG: las barras se estiran con la card
 *  sin deformar esquinas ni texto, y cada una es un elemento enfocable con su
 *  cifra. La serie trae el doble del rango para comparar con el periodo
 *  anterior. */
export function SalesChart({ series }: { series: SalesDay[] }) {
  const [range, setRange] = useState<Range>(7);
  const [active, setActive] = useState<number | null>(null);
  const summary = useMemo(() => summarizeRange(series, range), [series, range]);
  const max = Math.max(...summary.days.map((day) => day.total), 0);
  const shown = active != null ? summary.days[active] : null;

  return (
    <DashboardCard
      icon={ChartColumn}
      title="Ventas"
      description="Pedidos no cancelados, en moneda base"
      aside={
        <div role="group" aria-label="Rango de la gráfica" className="flex rounded-full bg-cream-50 p-0.5 ring-1 ring-line">
          {RANGES.map((option) => (
            <button
              key={option}
              type="button"
              aria-pressed={range === option}
              onClick={() => {
                setRange(option);
                setActive(null);
              }}
              className={cn(
                "type-caption rounded-full px-3 py-1.5 font-semibold transition-colors duration-150",
                range === option ? "bg-tostado-700 text-on-tostado" : "text-ink-muted hover:text-tostado-700"
              )}
            >
              {option} días
            </button>
          ))}
        </div>
      }
    >
      <div className="flex flex-wrap items-end justify-between gap-x-4 gap-y-2">
        <div>
          <p className="num-display text-[26px] text-espresso-900 md:text-[30px]">
            <Money value={shown ? shown.total : summary.total} />
          </p>
          <p className="tabular type-caption mt-1.5 text-ink-subtle">
            {shown
              ? `${DAY_FORMAT.format(parseDay(shown.date))} · ${shown.orders} ${shown.orders === 1 ? "pedido" : "pedidos"}`
              : `${summary.orders} ${summary.orders === 1 ? "pedido" : "pedidos"} en ${range} días`}
          </p>
        </div>
        {!shown && summary.delta != null && (
          <p
            className={cn(
              "tabular type-caption inline-flex items-center gap-1 rounded-full px-2.5 py-1 font-semibold",
              summary.delta >= 0 ? "bg-ok-soft text-ok" : "bg-danger-soft text-danger"
            )}
          >
            {summary.delta >= 0 ? (
              <ArrowUpRight className="h-3.5 w-3.5" strokeWidth={2.4} aria-hidden />
            ) : (
              <ArrowDownRight className="h-3.5 w-3.5" strokeWidth={2.4} aria-hidden />
            )}
            {Math.abs(summary.delta)} % frente a los {range} días anteriores
          </p>
        )}
      </div>

      <div className="relative mt-5 h-[168px]" onMouseLeave={() => setActive(null)}>
        {/* Guías a 0, 50 y 100 % del máximo: dan escala sin eje numerado. */}
        <div aria-hidden className="pointer-events-none absolute inset-0 flex flex-col justify-between">
          <span className="border-t border-dashed border-line" />
          <span className="border-t border-dashed border-line" />
          <span className="border-t border-line" />
        </div>
        <ul className={cn("relative flex h-full items-end", range === 7 ? "gap-3 md:gap-5" : "gap-[3px] md:gap-1.5")}>
          {summary.days.map((day, i) => {
            const height = max > 0 ? Math.max((day.total / max) * 100, day.total > 0 ? 3 : 0) : 0;
            const isToday = i === summary.days.length - 1;
            return (
              <li key={day.date} className="flex h-full min-w-0 flex-1 items-end">
                <button
                  type="button"
                  onMouseEnter={() => setActive(i)}
                  onFocus={() => setActive(i)}
                  onBlur={() => setActive(null)}
                  aria-label={`${DAY_FORMAT.format(parseDay(day.date))}: ${day.orders} ${day.orders === 1 ? "pedido" : "pedidos"}`}
                  className="group flex h-full w-full cursor-default items-end rounded-t-[6px]"
                >
                  <span
                    style={{ height: `${height}%` }}
                    className={cn(
                      "block min-h-[3px] w-full rounded-t-[6px] transition-colors duration-150",
                      day.total === 0
                        ? "bg-line"
                        : active === i
                          ? "bg-tostado-600"
                          : isToday
                            ? "bg-tostado-700"
                            : "bg-crema-200 group-hover:bg-tostado-600"
                    )}
                  />
                </button>
              </li>
            );
          })}
        </ul>
      </div>

      <div className="tabular type-micro mt-2 flex justify-between text-ink-subtle">
        {range === 7 ? (
          summary.days.map((day) => (
            <span key={day.date} className="min-w-0 flex-1 text-center capitalize">
              {WEEKDAY_FORMAT.format(parseDay(day.date)).replace(".", "")}
            </span>
          ))
        ) : (
          <>
            <span>{DAY_FORMAT.format(parseDay(summary.days[0].date))}</span>
            <span>{DAY_FORMAT.format(parseDay(summary.days[Math.floor(summary.days.length / 2)].date))}</span>
            <span>Hoy</span>
          </>
        )}
      </div>
    </DashboardCard>
  );
}
