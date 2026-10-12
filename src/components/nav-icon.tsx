"use client";

import { useLinkStatus } from "next/link";
import { LoaderCircle } from "lucide-react";
import { cn } from "@/lib/utils";

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
