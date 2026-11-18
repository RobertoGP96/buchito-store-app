import Link from "next/link";
import { ChevronLeft, type LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface PageHeadingProps {
  icon: LucideIcon;
  title: string;
  description?: string;
  badge?: ReactNode;
  /** Enlace «volver» sobre el título, para las páginas de detalle. */
  backHref?: string;
  backLabel?: string;
  /** El título es un folio o un número: va en Figtree tabular, no en la serif. */
  numericTitle?: boolean;
}

/** Bloque izquierdo de la cabecera: tesela con icono, título y descripción.
 *  Se exporta suelto para que una page servidor lo pase ya renderizado a una
 *  lista cliente (un icono de lucide no cruza esa frontera como prop). */
export function PageHeading({
  icon: Icon,
  title,
  description,
  badge,
  backHref,
  backLabel = "Volver",
  numericTitle = false,
}: PageHeadingProps) {
  return (
    <div className="min-w-0">
      {backHref && (
        <Link
          href={backHref}
          className="nav-label mb-3 -ml-1 inline-flex items-center gap-0.5 text-ink-muted transition-colors duration-150 hover:text-tostado-700"
        >
          <ChevronLeft className="h-4 w-4" strokeWidth={1.9} />
          {backLabel}
        </Link>
      )}
      <div className="flex min-w-0 items-start gap-3.5">
        <span className="flex h-11 w-11 flex-none items-center justify-center rounded-field bg-crema-100 text-tostado-700">
          <Icon className="h-5 w-5" strokeWidth={1.9} />
        </span>
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1.5">
            <h1
              className={cn(
                "type-title text-balance text-espresso-900",
                numericTitle ? "num-display" : "font-display"
              )}
            >
              {title}
            </h1>
            {badge}
          </div>
          {description && (
            <p className="type-meta mt-1.5 max-w-[560px] text-pretty text-ink-muted">{description}</p>
          )}
        </div>
      </div>
    </div>
  );
}

/** Fila de cabecera: el título a la izquierda y las acciones a la derecha en
 *  desktop, debajo en móvil. Las listas cliente la usan para que su botón
 *  principal quede a la altura del título y no en una fila suelta. */
export function PageHeaderRow({
  heading,
  children,
  className,
}: {
  heading?: ReactNode;
  children?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col gap-4 md:flex-row md:items-end md:gap-8",
        heading ? "md:justify-between" : "md:justify-end",
        className
      )}
    >
      {heading}
      {children && (
        <div className="flex flex-wrap items-center gap-2.5 md:flex-none md:justify-end">{children}</div>
      )}
    </div>
  );
}

interface PageHeaderProps extends PageHeadingProps {
  /** Acciones (botones) a la derecha en desktop, debajo en móvil. */
  children?: ReactNode;
  className?: string;
}

/** Cabecera de página del panel admin y de la app del mensajero. Va siempre
 *  al inicio de cada page; el icono en tesela tintada ancla la sección. */
export function PageHeader({ children, className, ...heading }: PageHeaderProps) {
  return (
    <PageHeaderRow heading={<PageHeading {...heading} />} className={className}>
      {children}
    </PageHeaderRow>
  );
}
