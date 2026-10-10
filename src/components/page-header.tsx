import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface PageHeaderProps {
  icon: LucideIcon;
  title: string;
  description?: string;
  badge?: ReactNode;
  /** Acciones (botones) a la derecha en desktop, debajo en móvil. */
  children?: ReactNode;
  className?: string;
}

/** Cabecera de página del panel admin y de la app del mensajero. Va siempre
 *  al inicio de cada page; el icono en tesela tintada ancla la sección. */
export function PageHeader({
  icon: Icon,
  title,
  description,
  badge,
  children,
  className,
}: PageHeaderProps) {
  return (
    <div
      className={cn(
        "flex flex-col gap-4 md:flex-row md:items-center md:justify-between md:gap-8",
        className
      )}
    >
      <div className="flex min-w-0 items-start gap-3.5">
        <span className="flex h-11 w-11 flex-none items-center justify-center rounded-field bg-tint text-navy-700">
          <Icon className="h-5 w-5" strokeWidth={1.9} />
        </span>
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2.5">
            <h1 className="font-display text-[22px] leading-[1.1] text-navy-900 md:text-[26px]">
              {title}
            </h1>
            {badge}
          </div>
          {description && (
            <p className="mt-1.5 max-w-[560px] text-[13px] leading-[1.6] text-pretty text-slate-500">
              {description}
            </p>
          )}
        </div>
      </div>
      {children && (
        <div className="flex flex-wrap items-center gap-2.5 md:flex-none md:justify-end">
          {children}
        </div>
      )}
    </div>
  );
}
