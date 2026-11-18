import { cn } from "@/lib/utils";

/** `sizes` de la foto de una card dentro de `ProductGrid`. Sigue los cortes de
 *  la retícula (2 columnas, 3 desde md, 4 desde xl) y el tope de 1120px del
 *  contenedor: con otros cortes el navegador pedía fotos más pequeñas que la
 *  celda y salían borrosas. */
export const PRODUCT_GRID_IMAGE_SIZES =
  "(min-width: 1280px) 224px, (min-width: 1120px) 315px, (min-width: 768px) 30vw, 45vw";

/** Retícula de cards elevadas: dos columnas ya en móvil (la card se compacta
 *  sola por debajo de `sm`), tres en tablet y cuatro en desktop. */
export function ProductGrid({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        // `product-grid`: globals.css aplaza el pintado de las cards que nacen
        // fuera de pantalla.
        "product-grid grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 xl:grid-cols-4",
        className
      )}
    >
      {children}
    </div>
  );
}

export function ProductGridCell({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return <div className={cn("min-w-0", className)}>{children}</div>;
}
