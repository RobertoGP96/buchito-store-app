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
  iconColor = "text-navy-700",
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
      <span
        className={cn(
          "flex items-center justify-center rounded-full bg-tint",
          compact ? "h-11 w-11" : "h-[52px] w-[52px]"
        )}
      >
        <Icon
          className={cn(compact ? "h-5 w-5" : "h-[22px] w-[22px]", iconColor)}
          strokeWidth={1.8}
        />
      </span>
      {eyebrow && <p className="eyebrow mt-5">{eyebrow}</p>}
      <p
        className={cn(
          "font-display mt-3.5 leading-tight text-navy-900",
          compact ? "text-[17px]" : "text-[22px]"
        )}
      >
        {title}
      </p>
      <p className="mt-3 max-w-[380px] text-[13.5px] leading-[1.65] text-pretty text-slate-500">
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
