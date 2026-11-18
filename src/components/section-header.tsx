import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface SectionHeaderProps {
  eyebrow?: string;
  /** Icono pequeño junto al rótulo. */
  icon?: LucideIcon;
  title: string;
  description?: string;
  /** Lado derecho: enlace «Ver todo» o un contador. */
  action?: ReactNode;
  className?: string;
}

/** Cabecera de una sección de la tienda (retícula de productos, bloque de la
 *  portada): rótulo, titular en serif y acción alineada a la base. */
export function SectionHeader({ eyebrow, icon: Icon, title, description, action, className }: SectionHeaderProps) {
  return (
    <div className={cn("flex items-end justify-between gap-4", className)}>
      <div className="min-w-0">
        {eyebrow && (
          <p className="eyebrow inline-flex items-center gap-1.5 text-tostado-700">
            {Icon && <Icon className="h-3.5 w-3.5" strokeWidth={2.2} aria-hidden />}
            {eyebrow}
          </p>
        )}
        <h2 className={cn("font-display type-heading text-balance text-espresso-900", eyebrow && "mt-2")}>{title}</h2>
        {description && <p className="type-body mt-1.5 max-w-[520px] text-pretty text-ink-muted">{description}</p>}
      </div>
      {action && <div className="flex-none">{action}</div>}
    </div>
  );
}
