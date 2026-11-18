import { cn } from "@/lib/utils";

type BadgeVariant = "featured" | "discount" | "combo" | "soldout" | "neutral";

const VARIANTS: Record<BadgeVariant, string> = {
  featured: "bg-caramelo-100 text-caramelo-700",
  // La rebaja es la promoción más fuerte de la card: caramelo en relleno, no
  // el verde suave de «todo va bien».
  discount: "bg-caramelo-500 font-bold text-on-caramelo",
  combo: "bg-crema-100 text-tostado-700",
  // Agotado es el único estado que debe cortar la lectura de la retícula, así
  // que va en relleno sólido y no en tinte suave como el resto.
  soldout: "bg-danger font-bold text-on-danger",
  neutral: "border border-line bg-canvas font-medium text-ink-muted",
};

interface BadgeProps extends React.ComponentProps<"span"> {
  variant?: BadgeVariant;
}

/** Etiqueta sobre la foto de la card (destacado, descuento, combo, agotado). Para
 *  estados de registros (pedido, pago) está `StatusChip`. */
export function Badge({ className, variant = "neutral", ...props }: BadgeProps) {
  return (
    <span
      data-slot="badge"
      className={cn(
        "inline-flex items-center gap-1 type-micro rounded-full px-2.5 py-[5px] leading-none font-semibold tracking-[.02em]",
        VARIANTS[variant],
        className
      )}
      {...props}
    />
  );
}
