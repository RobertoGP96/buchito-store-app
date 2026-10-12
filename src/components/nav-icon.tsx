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
