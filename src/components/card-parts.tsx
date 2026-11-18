import { Money } from "@/components/money";
import { cn } from "@/lib/utils";

/* Piezas comunes de las cards de la retícula (producto y combo): una sola
   silueta, un solo precio y un solo botón. La foto va a sangre y el pie es
   siempre precio arriba y botón a todo el ancho debajo, así el alto de la card
   no depende de lo largo del importe («≈ 12 345,00 CUP») ni del ancho de la
   columna. */

export const CARD_SHELL =
  "group relative flex h-full flex-col overflow-hidden rounded-card bg-canvas shadow-card transition-[box-shadow,transform] duration-200 hover:shadow-float motion-safe:hover:-translate-y-0.5";

export const CARD_MEDIA = "relative aspect-square w-full overflow-hidden bg-cream";

/** Envoltorio de la foto: el zoom suave al pasar el cursor va aquí y no en la
 *  card, para que los badges no se muevan con ella. */
export const CARD_MEDIA_ZOOM =
  "absolute inset-0 flex items-center justify-center transition-transform duration-500 ease-out motion-safe:group-hover:scale-[1.05]";

export const CARD_BODY = "flex min-w-0 flex-col gap-1.5 px-3 pt-3 sm:px-4 sm:pt-3.5";

export const CARD_TITLE = "line-clamp-2 text-[14.5px] leading-[1.3] font-semibold text-ink sm:text-[15px]";

export const CARD_FOOT = "mt-auto flex flex-col gap-2.5 p-3 sm:p-4 sm:pt-3";

const CTA_BASE =
  "relative z-10 flex min-h-10 w-full items-center justify-center gap-1.5 rounded-full px-4 type-meta font-semibold transition-[background-color,transform] duration-150 motion-safe:active:scale-[.98] pointer-coarse:min-h-11";

const CTA_KIND = {
  solid: "bg-tostado-700 text-on-tostado hover:bg-tostado-600",
  soft: "bg-crema-100 text-espresso-900 hover:bg-crema-200",
  disabled: "cursor-not-allowed bg-cream text-disabled",
} as const;

export function cardCtaClasses(kind: keyof typeof CTA_KIND, pressed = false) {
  return cn(CTA_BASE, CTA_KIND[kind], pressed && "scale-[.98]");
}

interface CardPriceProps {
  price: number;
  /** Precio anterior; se tacha solo si es mayor que el actual. */
  compareAt?: number | null;
  /** «desde», cuando hay variantes con precios distintos. */
  prefix?: string;
  /** «/ kg» y similares. */
  suffix?: string | null;
}

export function CardPrice({ price, compareAt, prefix, suffix }: CardPriceProps) {
  const hasCompare = compareAt != null && compareAt > price;
  return (
    <div className="flex min-w-0 flex-wrap items-baseline gap-x-1.5 gap-y-0.5">
      {prefix && <span className="type-micro font-medium text-ink-subtle">{prefix}</span>}
      <span className="num-display text-[16px] leading-tight text-espresso-900 sm:text-[17px]">
        <Money value={price} className="break-words whitespace-normal" />
      </span>
      {suffix && <span className="type-micro font-medium text-ink-subtle">{suffix}</span>}
      {hasCompare && (
        <span className="type-caption font-medium text-ink-subtle line-through">
          <Money value={compareAt} className="break-words whitespace-normal" />
        </span>
      )}
    </div>
  );
}
