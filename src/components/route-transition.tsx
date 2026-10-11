"use client";

import { unstable_ViewTransition as ViewTransition } from "react";

/** Cada navegación remonta el `template.tsx` de su grupo: el contenido que
 *  sale y el que entra se animan con la View Transitions API (clase `route`
 *  en globals.css). Sin soporte del navegador simplemente no hay animación. */
export function RouteTransition({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <ViewTransition enter="route" exit="route" default="none">
      <div className={className}>{children}</div>
    </ViewTransition>
  );
}
