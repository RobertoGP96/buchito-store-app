import { cn } from "@/lib/utils";

/* Piezas de las barras que comparten la tienda, el panel y la app del
   mensajero. Viven aparte de top-nav.tsx para que el panel y el mensajero no
   arrastren el store del carrito al importarlas. */

/** Controles de la barra sobre el fondo café: texto claro que se aviva al hover. */
export const NAV_CONTROL =
  "text-nav-muted transition-colors duration-150 hover:bg-nav-hover hover:text-nav-fg data-[pressed]:bg-nav-active data-[pressed]:text-nav-fg";

/** Acción de icono del header: círculo de 36px que se tiñe al hover. */
export const ICON_ACTION = cn("relative inline-flex h-9 w-9 items-center justify-center rounded-full", NAV_CONTROL);

/** El contador se ancla al icono, no al flujo: en píldora caramelo con un anillo
 *  del color de la barra se lee como marca sobre el icono y no desplaza la fila.
 *  En cabeceras claras se pasa `ring-canvas`. El número lo anuncia el
 *  `aria-label` del control, no la píldora. */
export function CountBadge({ count, className }: { count: number; className?: string }) {
  if (count <= 0) return null;
  return (
    <span
      key={count}
      aria-hidden
      className={cn(
        "pop-in tabular absolute -top-0.5 -right-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-gold-500 px-1 text-[9.5px] leading-none font-bold text-navy-950 ring-2 ring-nav",
        className
      )}
    >
      {count > 99 ? "99+" : count}
    </span>
  );
}
