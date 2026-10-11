import Link from "next/link";
import { ArrowRight, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface DashboardCardProps {
  icon: LucideIcon;
  title: string;
  /** Una línea bajo el título: qué muestra la card o cómo está ordenada. */
  description?: string;
  /** Contador o chip junto al título (`DashboardCount`). */
  badge?: React.ReactNode;
  /** Enlace a la pantalla completa del módulo. */
  href?: string;
  hrefLabel?: string;
  /** Pie fijo separado del contenido por una línea: resumen + acción. */
  footer?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}

/** Card del panel: cabecera con icono en tesela, título, contador opcional y
 *  enlace "ver todo"; contenido flexible; pie opcional. */
export function DashboardCard({
  icon: Icon,
  title,
  description,
  badge,
  href,
  hrefLabel = "Ver todo",
  footer,
  children,
  className,
}: DashboardCardProps) {
  return (
    <section className={cn("flex flex-col rounded-card bg-canvas shadow-card", className)}>
      <header className="flex items-center gap-3 px-5 pt-5 pb-3">
        <span className="flex h-9 w-9 flex-none items-center justify-center rounded-chip bg-tint text-navy-700">
          <Icon className="h-4 w-4" strokeWidth={1.9} />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-[14.5px] leading-tight font-semibold text-navy-900">{title}</h2>
            {badge}
          </div>
          {description && <p className="mt-0.5 hidden truncate text-[12px] text-slate-400 sm:block">{description}</p>}
        </div>
        {href && (
          <Link
            href={href}
            className="group inline-flex flex-none items-center gap-1 rounded-full bg-tint px-3 py-1.5 text-[12.5px] font-semibold text-navy-700 transition-colors hover:bg-tint-strong"
          >
            {hrefLabel}
            <ArrowRight
              className="h-3.5 w-3.5 transition-transform motion-safe:group-hover:translate-x-0.5"
              strokeWidth={2}
            />
          </Link>
        )}
      </header>
      <div className={cn("flex flex-1 flex-col px-5", footer ? "pb-3" : "pb-5")}>{children}</div>
      {footer && (
        <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-line-soft px-5 py-3.5">
          {footer}
        </footer>
      )}
    </section>
  );
}

/** Contador junto al título de la card; `tone="warn"` cuando pide atención. */
export function DashboardCount({ value, tone }: { value: number; tone?: "warn" | "danger" }) {
  return (
    <span
      className={cn(
        "tabular inline-flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-[11.5px] font-semibold",
        tone === "danger"
          ? "bg-danger-soft text-danger"
          : tone === "warn"
            ? "bg-gold-100 text-gold-600"
            : "bg-tint text-navy-700"
      )}
    >
      {value}
    </span>
  );
}

interface DashboardRowProps {
  href: string;
  className?: string;
  children: React.ReactNode;
}

/** Fila enlazada dentro de una card: hover suave y margen negativo para que
 *  el área clicable llegue al borde del contenido. */
export function DashboardRow({ href, className, children }: DashboardRowProps) {
  return (
    <Link
      href={href}
      className={cn(
        "-mx-2 flex items-center gap-3 rounded-field px-2 py-2.5 transition-colors hover:bg-hover",
        className
      )}
    >
      {children}
    </Link>
  );
}
