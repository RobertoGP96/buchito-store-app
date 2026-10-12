"use client";

import { useEffect, useRef } from "react";
import { cn } from "@/lib/utils";

// La carga inicial llega pintada del servidor: animar ahí solo retrasaría el
// primer frame. A partir del primer montaje, cada navegación remonta el
// template y la entrada se repite sola.
let hasMountedOnce = false;

/** Cada navegación remonta el `template.tsx` de su grupo (Next lo keyea por
 *  segmento), así que el contenido entrante reproduce `route-enter` solo.
 *  Sin View Transitions API: nada se captura ni se pinta por encima de las
 *  barras fijas, ningún toque se pierde y el revelado del skeleton no espera
 *  a ninguna animación. */
export function RouteTransition({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  const animate = useRef(hasMountedOnce).current;
  useEffect(() => {
    hasMountedOnce = true;
  }, []);
  return <div className={cn(animate && "route-enter", className)}>{children}</div>;
}
