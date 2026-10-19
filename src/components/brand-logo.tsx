import Image from "next/image";
import Link from "next/link";
import { STORE_NAME } from "@/lib/config";
import { cn } from "@/lib/utils";

/** Lockup completo en color (fondos claros) y en crema (fondos oscuros). */
const STACKED_SOURCES = [
  { src: "/brand/logo.png", whenDefault: "dark:hidden", whenInverse: "hidden" },
  { src: "/brand/logo-inverse.png", whenDefault: "hidden dark:block", whenInverse: "block" },
];

type BrandTone = "default" | "inverse" | "on-brand";
type BrandSize = "sm" | "md";

interface BrandMarkProps {
  tone?: BrandTone;
  size?: BrandSize;
  className?: string;
}

/** Isotipo (taza con carrito) en crema sobre la tesela café. Los PNG viven en
 *  `public/brand` y se regeneran con `pnpm brand:assets`. */
export function BrandMark({ tone = "default", size = "md", className }: BrandMarkProps) {
  return (
    <span
      aria-hidden
      className={cn(
        "flex flex-none items-center justify-center bg-brand-tile shadow-card",
        size === "sm" ? "h-8 w-8 rounded-[9px]" : "h-9 w-9 rounded-[10px]",
        tone === "inverse" && "ring-1 ring-white/15",
        tone === "on-brand" && "bg-white/15 shadow-none ring-1 ring-white/20",
        className
      )}
    >
      <Image
        src="/brand/logo-mark-inverse.png"
        alt=""
        width={64}
        height={64}
        className={size === "sm" ? "h-[23px] w-[23px]" : "h-[26px] w-[26px]"}
      />
    </span>
  );
}

interface BrandLogoProps {
  /** `inverse` para fondos oscuros (footer, sidebar admin): la palabra pasa a
   *  blanco. `on-brand` para la barra café: la tesela es del mismo color que el
   *  fondo, así que pasa a un velo claro para no desaparecer. */
  tone?: BrandTone;
  size?: BrandSize;
  /** `stacked` es el logo completo (isotipo y nombre) para pantallas
   *  donde la marca preside, como login y registro. */
  variant?: "inline" | "stacked";
  /** Oculta la palabra por debajo de `sm`: en la barra de la tienda, con la
   *  campana y el carrito, el nombre completo no cabe en 375px. */
  compact?: boolean;
  /** Sin enlace en lugares donde ya se está en la home o dentro de otro <a>. */
  asLink?: boolean;
  href?: string;
  /** Para cerrar el panel o menú desde el que se navega. */
  onClick?: () => void;
  className?: string;
}

/** Lockup de marca: tesela café con el isotipo en crema y el nombre al lado,
 *  en versalitas como el wordmark del logo. Los colores de la tesela son fijos
 *  en ambos temas: son la identidad, no un token semántico. */
export function BrandLogo({
  tone = "default",
  size = "md",
  variant = "inline",
  compact = false,
  asLink = true,
  href = "/",
  onClick,
  className,
}: BrandLogoProps) {
  const content =
    variant === "stacked" ? (
      // En tema oscuro el wordmark café se perdería: se sirve la versión crema.
      // Son dos <img> en vez de un <picture> para no depender del media query
      // cuando el tema se elige a mano (clase .dark).
      STACKED_SOURCES.map((source) => (
        <Image
          key={source.src}
          src={source.src}
          alt={STORE_NAME}
          width={1002}
          height={1090}
          sizes="180px"
          loading="eager"
          className={cn("h-[150px] w-auto", tone === "default" ? source.whenDefault : source.whenInverse)}
        />
      ))
    ) : (
      <>
        <BrandMark tone={tone} size={size} />
        <span
          className={cn(
            "font-display leading-none tracking-[.04em] uppercase",
            compact && "hidden sm:inline",
            size === "sm" ? "text-[15px]" : "text-[17px]",
            tone === "default" ? "text-navy-700" : "text-white"
          )}
        >
          {STORE_NAME}
        </span>
      </>
    );

  const rootClass = cn("inline-flex flex-none items-center gap-2.5", className);

  if (!asLink) {
    return <span className={rootClass}>{content}</span>;
  }

  return (
    <Link
      href={href}
      onClick={onClick}
      aria-label={`${STORE_NAME}, ir al inicio`}
      className={cn(rootClass, "transition-opacity duration-150 hover:opacity-85")}
    >
      {content}
    </Link>
  );
}
