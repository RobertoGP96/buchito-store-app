"use client";

import { useLinkStatus } from "next/link";
import { LoaderCircle, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface NavIconProps {
  icon: LucideIcon;
  className?: string;
  strokeWidth?: number;
}

/** Icono de un enlace de navegación: mientras la ruta destino carga se
 *  sustituye por un spinner, con retardo para no parpadear cuando la
 *  navegación es instantánea. Debe renderizarse dentro de un <Link>. */
export function NavIcon({ icon: Icon, className, strokeWidth }: NavIconProps) {
  const { pending } = useLinkStatus();
  if (pending) {
    return <LoaderCircle className={cn(className, "nav-spinner")} strokeWidth={strokeWidth} aria-hidden />;
  }
  return <Icon className={className} strokeWidth={strokeWidth} />;
}

/** Spinner al final de un chip o enlace de texto mientras su ruta carga. */
export function LinkPending({ className }: { className?: string }) {
  const { pending } = useLinkStatus();
  if (!pending) return null;
  return (
    <LoaderCircle
      className={cn("nav-spinner ml-1.5 h-3.5 w-3.5 flex-none", className)}
      strokeWidth={2.2}
      aria-hidden
    />
  );
}

interface NavPendingSkeletonProps {
  /** Solo el cuadro del icono (sidebar contraído a iconos). */
  iconOnly?: boolean;
  /** Fondo opaco que tapa el enlace y padding horizontal: los del contenedor. */
  className?: string;
  /** Color de las barras. */
  barClassName?: string;
}

/** Esqueleto de un enlace de navegación mientras su ruta carga: se superpone
 *  al enlace pulsado (que debe ser `relative`) con la silueta icono + texto,
 *  con el mismo retardo que el spinner. Debe renderizarse dentro de un <Link>. */
export function NavPendingSkeleton({ iconOnly = false, className, barClassName }: NavPendingSkeletonProps) {
  const { pending } = useLinkStatus();
  if (!pending) return null;
  const bar = cn("nav-skeleton-bar rounded-full", barClassName ?? "bg-white/15");
  return (
    <span
      aria-hidden
      className={cn(
        "nav-skeleton absolute inset-0 flex items-center gap-3 rounded-[inherit]",
        iconOnly ? "justify-center" : "px-3",
        className ?? "bg-footer"
      )}
    >
      <span className={cn(bar, "h-4 w-4 flex-none rounded-[5px]")} />
      {!iconOnly && <span className={cn(bar, "h-2.5 w-[58%]")} />}
    </span>
  );
}
