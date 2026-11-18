import Link from "next/link";
import type { ReactNode } from "react";
import { ChevronLeft } from "lucide-react";
import { cn } from "@/lib/utils";

interface ScreenHeaderProps {
  title: string;
  eyebrow?: string;
  description?: string;
  backHref?: string;
  /** El título es un folio o un número: va en Figtree tabular, no en la serif. */
  numericTitle?: boolean;
  children?: ReactNode;
}

/** Cabecera de pantalla de la tienda. Va dentro del ancho de página (1120px)
 *  y sin fondo propio: el titular en serif es lo que abre la pantalla. */
export function ScreenHeader({
  title,
  eyebrow,
  description,
  backHref,
  numericTitle = false,
  children,
}: ScreenHeaderProps) {
  return (
    <div className="mx-auto w-full max-w-[1120px] px-5 pt-7 pb-5 md:px-6 md:pt-9 md:pb-6">
      {backHref && (
        <Link
          href={backHref}
          className="nav-label -ml-1 inline-flex items-center gap-0.5 text-ink-muted transition-colors duration-150 hover:text-tostado-700"
        >
          <ChevronLeft className="h-4 w-4" strokeWidth={2} />
          Volver
        </Link>
      )}

      <div
        className={cn(
          "flex flex-col gap-4 md:flex-row md:items-end md:justify-between md:gap-8",
          backHref && "mt-4"
        )}
      >
        <div className="min-w-0">
          {eyebrow && <p className="eyebrow">{eyebrow}</p>}
          <h1
            className={cn(
              "type-title text-balance text-espresso-900",
              numericTitle ? "num-display" : "font-display",
              eyebrow && "mt-2"
            )}
          >
            {title}
          </h1>
          {description && (
            <p className="type-body mt-2.5 max-w-[560px] text-pretty text-ink-muted">
              {description}
            </p>
          )}
        </div>
        {children && (
          <div className="flex flex-wrap items-center gap-3 md:justify-end">
            {children}
          </div>
        )}
      </div>
    </div>
  );
}
