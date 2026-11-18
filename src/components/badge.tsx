import { cn } from "@/lib/utils";

type BadgeVariant = "featured" | "discount" | "soldout" | "neutral";

const VARIANTS: Record<BadgeVariant, string> = {
  featured: "bg-caramelo-100 text-caramelo-700",
  discount: "bg-ok-soft text-ok",
  // Agotado es el único estado que debe cortar la lectura de la retícula, así
  // que va en relleno sólido y no en tinte suave como el resto.
  soldout: "bg-danger font-bold text-on-danger",
  neutral: "border border-line bg-canvas font-medium text-ink-muted",
};

interface BadgeProps extends React.ComponentProps<"span"> {
  variant?: BadgeVariant;
}

/** Etiqueta sobre la foto de la card (destacado, descuento, agotado). Para
 *  estados de registros (pedido, pago) está `StatusChip`. */
export function Badge({ className, variant = "neutral", ...props }: BadgeProps) {
  return (
    <span
      data-slot="badge"
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2.5 py-[5px] text-[11px] leading-none font-semibold tracking-[.02em]",
        VARIANTS[variant],
        className
      )}
      {...props}
    />
  );
}
