"use client";

import { Chip } from "@heroui/react";
import { cn } from "@/lib/utils";

export type StatusTone = "neutral" | "info" | "success" | "warning" | "danger";

// `info` no usa el `accent` de HeroUI: ese es el café del CTA y un estado
// informativo se confundía con una acción. Va en azul, por clases.
const COLOR: Record<StatusTone, "default" | "success" | "warning" | "danger"> = {
  neutral: "default",
  info: "default",
  success: "success",
  warning: "warning",
  danger: "danger",
};

export interface StatusMeta {
  label: string;
  tone: StatusTone;
}

interface StatusChipProps {
  label: string;
  tone?: StatusTone;
  size?: "sm" | "md";
  className?: string;
}

/** Píldora de estado (pedido, entrega, pago, activo/inactivo). Los mapas
 *  status → {label, tone} viven en `lib/labels.ts` de cada módulo. */
export function StatusChip({
  label,
  tone = "neutral",
  size = "sm",
  className,
}: StatusChipProps) {
  return (
    <Chip
      color={COLOR[tone]}
      variant="soft"
      size={size}
      className={cn("whitespace-nowrap font-semibold", tone === "info" && "bg-azul-100 text-azul-700", className)}
    >
      {label}
    </Chip>
  );
}
