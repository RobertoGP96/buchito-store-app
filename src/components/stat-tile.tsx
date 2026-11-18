import Link from "next/link";
import { ArrowDownRight, ArrowUpRight, type LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export type StatTone = "default" | "featured" | "warn" | "good" | "bad";

export interface StatTileProps {
  label: string;
  value: ReactNode;
  hint?: ReactNode;
  icon?: LucideIcon;
  /** `featured`: la tesela principal, en café. `warn`/`bad`: el valor pide atención. */
  tone?: StatTone;
  /** Con enlace, toda la tesela navega al módulo. */
  href?: string;
  /** Variación porcentual frente al periodo anterior; `null` si no hay base. */
  delta?: number | null;
  /** `sm` para filas de tres en móvil (app del mensajero). */
  size?: "md" | "sm";
  className?: string;
}

const ICON_TONE: Record<StatTone, string> = {
  default: "bg-crema-100 text-tostado-700",
  featured: "bg-brand-tile-fg/12 text-brand-tile-fg",
  warn: "bg-warn-soft text-warn",
  good: "bg-ok-soft text-ok",
  bad: "bg-danger-soft text-danger",
};

const VALUE_TONE: Record<StatTone, string> = {
  default: "text-espresso-900",
  featured: "text-brand-tile-fg",
  warn: "text-warn",
  good: "text-ok",
  bad: "text-danger",
};

function Delta({ value, featured }: { value: number; featured: boolean }) {
  const up = value >= 0;
  const Arrow = up ? ArrowUpRight : ArrowDownRight;
  return (
    <span
      className={cn(
        "tabular type-micro inline-flex items-center gap-0.5 rounded-full px-1.5 py-1 font-semibold",
        featured
          ? "bg-brand-tile-fg/12 text-brand-tile-fg"
          : up
            ? "bg-ok-soft text-ok"
            : "bg-danger-soft text-danger"
      )}
    >
      <Arrow aria-hidden className="h-3 w-3" strokeWidth={2.2} />
      <span className="sr-only">{up ? "Sube" : "Baja"} </span>
      {Math.abs(value)} %
    </span>
  );
}

/** Tesela de cifra: la única forma de mostrar un KPI en el panel, en finanzas
 *  y en la app del mensajero. La cifra va en Figtree tabular (`num-display`). */
export function StatTile({
  label,
  value,
  hint,
  icon: Icon,
  tone = "default",
  href,
  delta,
  size = "md",
  className,
}: StatTileProps) {
  const featured = tone === "featured";
  const small = size === "sm";

  const body = (
    <>
      {featured && (
        <span
          aria-hidden
          className="pointer-events-none absolute -top-10 -right-10 h-32 w-32 rounded-full bg-brand-tile-fg/8"
        />
      )}
      {(Icon || delta != null || href) && (
        <div className="relative flex items-start justify-between gap-2">
          {Icon ? (
            <span className={cn("flex h-9 w-9 flex-none items-center justify-center rounded-chip", ICON_TONE[tone])}>
              <Icon className="h-[18px] w-[18px]" strokeWidth={1.9} />
            </span>
          ) : (
            <span />
          )}
          {delta != null ? (
            <Delta value={delta} featured={featured} />
          ) : (
            href && (
              <ArrowUpRight
                aria-hidden
                className={cn(
                  "h-4 w-4 opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100",
                  featured ? "text-brand-tile-fg" : "text-ink-subtle"
                )}
                strokeWidth={1.9}
              />
            )
          )}
        </div>
      )}
      <div className="relative min-w-0">
        <p
          className={cn(
            "num-display truncate",
            small ? "text-[20px] sm:text-[22px]" : "text-[24px] md:text-[28px]",
            VALUE_TONE[tone]
          )}
        >
          {value}
        </p>
        <p className={cn("type-meta mt-2 font-medium", featured ? "text-brand-tile-fg/90" : "text-ink-muted")}>
          {label}
        </p>
        {hint && (
          <p
            className={cn(
              "tabular type-caption mt-0.5 flex items-center gap-1.5",
              featured ? "text-brand-tile-fg/70" : "text-ink-subtle"
            )}
          >
            {tone === "warn" && <span aria-hidden className="h-1.5 w-1.5 flex-none rounded-full bg-warn" />}
            <span className="min-w-0">{hint}</span>
          </p>
        )}
      </div>
    </>
  );

  const shell = cn(
    "relative flex flex-col justify-between gap-4 overflow-hidden rounded-card shadow-card",
    small ? "p-3.5 sm:p-4" : "min-h-[128px] p-4",
    featured ? "bg-brand-tile text-brand-tile-fg" : "bg-canvas",
    className
  );

  if (href) {
    return (
      <Link
        href={href}
        className={cn(
          shell,
          "group transition-[transform,box-shadow] duration-200 hover:shadow-float motion-safe:hover:-translate-y-0.5"
        )}
      >
        {body}
      </Link>
    );
  }
  return <div className={shell}>{body}</div>;
}

/** Grupo de teselas con su rótulo: dos columnas en móvil, cuatro en desktop. */
export function StatGroup({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <p className="eyebrow mb-2.5 px-0.5">{label}</p>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4 md:gap-4">{children}</div>
    </div>
  );
}
