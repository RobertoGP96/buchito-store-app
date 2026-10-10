import Link from "next/link";
import { cn } from "@/lib/utils";

/** Un CTA que navega es un enlace, no un botón. HeroUI `Button` queda para
 *  acciones (`onPress`); esto evita anidar un <button> dentro de un <a> solo
 *  por heredar el estilo. `soft` es la acción secundaria del sistema; `solid`
 *  el CTA primario; `outline`/`ghost` terciarias. */
export type ButtonLinkVariant = "soft" | "solid" | "outline" | "ghost";
export type ButtonLinkSize = "default" | "sm" | "lg";

const VARIANTS: Record<ButtonLinkVariant, string> = {
  soft: "bg-tint text-navy-900 hover:bg-tint-strong",
  solid: "bg-navy-700 text-on-brand hover:bg-navy-600",
  outline:
    "border-[1.5px] border-line bg-transparent text-navy-700 hover:border-tint-strong hover:bg-tint",
  ghost: "text-slate-500 hover:text-navy-700",
};

const SIZES: Record<ButtonLinkSize, string> = {
  sm: "text-[13px]",
  default: "text-[14px]",
  lg: "text-[15px]",
};

const BOX_PADDING: Record<ButtonLinkSize, string> = {
  sm: "px-4 py-2",
  default: "px-[22px] py-3",
  lg: "px-[30px] py-3.5",
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
    variant !== "ghost" && BOX_PADDING[size],
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
