import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface SectionCardProps {
  title: string;
  /** Icono en tesela a la izquierda del título. */
  icon?: LucideIcon;
  /** Número de paso en lugar del icono (checkout). */
  step?: number;
  description?: ReactNode;
  /** Lado derecho de la cabecera: chip de estado, enlace o importe. */
  aside?: ReactNode;
  /** Pie separado del contenido por una línea. */
  footer?: ReactNode;
  children: ReactNode;
  className?: string;
  bodyClassName?: string;
}

/** Card con cabecera: el contenedor de cualquier bloque con título en detalles,
 *  formularios y panel. El título es un `h2` real en la serif de titulares. */
export function SectionCard({
  title,
  icon: Icon,
  step,
  description,
  aside,
  footer,
  children,
  className,
  bodyClassName,
}: SectionCardProps) {
  return (
    <section className={cn("flex flex-col rounded-card bg-canvas shadow-card", className)}>
      <header className="flex items-center gap-3 px-5 pt-5">
        {step != null ? (
          <span
            aria-hidden
            className="tabular type-meta flex h-7 w-7 flex-none items-center justify-center rounded-full bg-tostado-700 font-bold text-on-tostado"
          >
            {step}
          </span>
        ) : (
          Icon && (
            <span className="flex h-9 w-9 flex-none items-center justify-center rounded-chip bg-crema-100 text-tostado-700">
              <Icon className="h-[18px] w-[18px]" strokeWidth={1.9} />
            </span>
          )
        )}
        <div className="min-w-0 flex-1">
          <h2 className="font-display type-subheading text-espresso-900">{title}</h2>
          {description && <p className="type-caption mt-0.5 text-ink-subtle">{description}</p>}
        </div>
        {aside && <div className="flex flex-none items-center gap-2">{aside}</div>}
      </header>
      <div className={cn("flex-1 px-5 pt-4", footer ? "pb-4" : "pb-5", bodyClassName)}>{children}</div>
      {footer && (
        <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-line-soft px-5 py-3.5">
          {footer}
        </footer>
      )}
    </section>
  );
}

/** Par etiqueta/valor dentro de una `SectionCard` (va en un `<dl>`). */
export function DetailRow({ label, value, className }: { label: ReactNode; value: ReactNode; className?: string }) {
  return (
    <div className={cn("type-body flex items-center justify-between gap-4", className)}>
      <dt className="text-ink-muted">{label}</dt>
      <dd className="text-right font-medium text-ink">{value}</dd>
    </div>
  );
}

export interface TimelineStep {
  /** Clave propia cuando una etiqueta puede repetirse (historial de eventos). */
  id?: string | number;
  label: string;
  /** Línea secundaria bajo la etiqueta: quién lo hizo, motivo. */
  note?: ReactNode;
  /** Texto ya formateado (fecha y hora); sin él, el paso aún no ocurrió. */
  at?: string | null;
  tone?: "default" | "danger";
}

/** Línea de tiempo vertical: punto relleno y fecha en lo ocurrido, punto hueco
 *  en lo que falta; el último paso ocurrido es el actual. */
export function Timeline({ steps, className }: { steps: TimelineStep[]; className?: string }) {
  const lastDone = steps.reduce((acc, step, i) => (step.at ? i : acc), -1);
  return (
    <ol className={cn("flex flex-col", className)}>
      {steps.map((step, i) => {
        const done = Boolean(step.at);
        const current = i === lastDone;
        const danger = step.tone === "danger";
        return (
          <li key={step.id ?? step.label} className="relative flex gap-3 pb-4 last:pb-0">
            {i < steps.length - 1 && (
              <span
                aria-hidden
                className={cn("absolute top-3.5 bottom-0 left-[6.5px] w-px", i < lastDone ? "bg-tostado-700/40" : "bg-line")}
              />
            )}
            <span
              aria-hidden
              className={cn(
                "relative mt-[3px] h-3.5 w-3.5 flex-none rounded-full border-2",
                !done && "border-rule bg-canvas",
                done && !danger && "border-tostado-700 bg-tostado-700",
                done && danger && "border-danger bg-danger",
                current && !danger && "ring-4 ring-crema-100",
                current && danger && "ring-4 ring-danger-soft"
              )}
            />
            <div className="type-meta flex min-w-0 flex-1 items-baseline justify-between gap-3">
              <span className="min-w-0">
                <span
                  className={cn(
                    "block",
                    done ? "text-ink" : "text-ink-subtle",
                    current && "font-semibold",
                    done && danger && "text-danger"
                  )}
                >
                  {step.label}
                </span>
                {step.note && <span className="type-caption block text-ink-subtle">{step.note}</span>}
              </span>
              <span className="tabular type-caption flex-none text-ink-subtle">{step.at ?? "Pendiente"}</span>
            </div>
          </li>
        );
      })}
    </ol>
  );
}

/** Título numerado de un paso (checkout). Es el `h2` de la sección: acepta `id`
 *  para que el grupo de controles lo use de etiqueta. */
export function StepHeading({ step, id, children }: { step: number; id?: string; children: ReactNode }) {
  return (
    <h2 id={id} className="flex items-center gap-2.5">
      <span
        aria-hidden
        className="tabular type-meta flex h-7 w-7 flex-none items-center justify-center rounded-full bg-tostado-700 font-bold text-on-tostado"
      >
        {step}
      </span>
      <span className="font-display type-subheading text-espresso-900">{children}</span>
    </h2>
  );
}
