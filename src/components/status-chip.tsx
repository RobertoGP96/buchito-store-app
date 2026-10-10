import { Chip } from "@heroui/react";
import { cn } from "@/lib/utils";

export type StatusTone = "neutral" | "info" | "success" | "warning" | "danger";

const COLOR: Record<StatusTone, "default" | "accent" | "success" | "warning" | "danger"> = {
  neutral: "default",
  info: "accent",
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
      className={cn("whitespace-nowrap font-semibold", className)}
    >
      {label}
    </Chip>
  );
}
