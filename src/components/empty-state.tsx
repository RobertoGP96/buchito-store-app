import type { LucideIcon } from "lucide-react";
import { ButtonLink } from "@/components/button-link";
import { cn } from "@/lib/utils";

interface EmptyStateProps {
  icon: LucideIcon;
  iconColor?: string;
  eyebrow?: string;
  title: string;
  description: string;
  ctaLabel?: string;
  ctaHref?: string;
  /** Acción no navegable (botón HeroUI, etc.) en lugar del enlace. */
  action?: React.ReactNode;
  /** `compact` para vacíos dentro de una card o tabla. */
  size?: "default" | "compact";
  className?: string;
}

export function EmptyState({
  icon: Icon,
  iconColor = "text-tostado-700",
  eyebrow,
  title,
  description,
  ctaLabel,
  ctaHref,
  action,
  size = "default",
  className,
}: EmptyStateProps) {
  const compact = size === "compact";
  return (
    <div
      className={cn(
        "anim-fade-up flex flex-1 flex-col items-center justify-center text-center",
        compact ? "px-4 py-10" : "px-5 py-20 md:px-10",
        className
      )}
    >
      {/* Doble anillo: el icono solo, en un círculo pálido, se perdía en una
          pantalla vacía. */}
      <span
        className={cn(
          "flex items-center justify-center rounded-full bg-cream-50 ring-1 ring-line",
          compact ? "h-14 w-14" : "h-[84px] w-[84px]"
        )}
      >
        <span
          className={cn(
            "flex items-center justify-center rounded-full bg-crema-100",
            compact ? "h-10 w-10" : "h-[60px] w-[60px]"
          )}
        >
          <Icon className={cn(compact ? "h-5 w-5" : "h-7 w-7", iconColor)} strokeWidth={1.7} />
        </span>
      </span>
      {eyebrow && <p className="eyebrow mt-6 text-tostado-700">{eyebrow}</p>}
      <p
        className={cn(
          "font-display leading-tight text-balance text-espresso-900",
          compact ? "type-subheading mt-3.5" : "type-heading mt-5"
        )}
      >
        {title}
      </p>
      <p className={cn("type-body max-w-[380px] text-pretty text-ink-muted", compact ? "mt-2" : "mt-3")}>
        {description}
      </p>
      {ctaLabel && ctaHref && (
        <ButtonLink href={ctaHref} variant="solid" className="mt-6">
          {ctaLabel}
        </ButtonLink>
      )}
      {action && <div className="mt-6">{action}</div>}
    </div>
  );
}
