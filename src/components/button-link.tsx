import Link from "next/link";
import { cn } from "@/lib/utils";

/** Un CTA que navega es un enlace, no un botón. HeroUI `Button` queda para
 *  acciones (`onPress`); esto evita anidar un <button> dentro de un <a> solo
 *  por heredar el estilo. `soft` es la acción secundaria del sistema; `solid`
 *  el CTA primario; `outline`/`ghost` terciarias. */
export type ButtonLinkVariant = "soft" | "solid" | "outline" | "ghost";
export type ButtonLinkSize = "default" | "sm" | "lg";

const VARIANTS: Record<ButtonLinkVariant, string> = {
  soft: "bg-crema-100 text-espresso-900 hover:bg-crema-200",
  solid: "bg-tostado-700 text-on-tostado hover:bg-tostado-600",
  outline:
    "border-[1.5px] border-line bg-transparent text-tostado-700 hover:border-crema-200 hover:bg-crema-100",
  ghost: "text-ink-muted hover:bg-crema-100 hover:text-tostado-700",
};

// Mismas alturas que el `Button` de HeroUI (40/36px, y 36/32px en `sm`) para
// que un enlace y un botón vecinos midan igual. `lg` es el CTA de la tienda.
const SIZES: Record<ButtonLinkSize, string> = {
  sm: "h-9 px-3.5 text-[13px] md:h-8",
  default: "h-10 px-4 text-[14px] md:h-9",
  lg: "h-12 px-7 text-[15px]",
};

export function buttonLinkClasses(
  variant: ButtonLinkVariant = "soft",
  size: ButtonLinkSize = "default",
  className?: string
) {
  return cn(
    "inline-flex items-center justify-center gap-2 rounded-full font-semibold leading-[1.2] whitespace-nowrap transition-[background-color,color,border-color,transform] duration-150 motion-safe:active:scale-[.98]",
    VARIANTS[variant],
    SIZES[size],
    className
  );
}

interface ButtonLinkProps extends React.ComponentProps<typeof Link> {
  variant?: ButtonLinkVariant;
  size?: ButtonLinkSize;
}

export function ButtonLink({
  className,
  variant = "soft",
  size = "default",
  ...props
}: ButtonLinkProps) {
  return (
    <Link
      data-slot="button-link"
      className={buttonLinkClasses(variant, size, className)}
      {...props}
    />
  );
}
