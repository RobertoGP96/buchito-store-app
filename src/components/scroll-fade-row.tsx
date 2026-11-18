"use client";

import { Children, useEffect, useRef, type ComponentProps } from "react";
import { cn } from "@/lib/utils";

/** Fila de chips con scroll horizontal y barra oculta. El desvanecido de los
 *  bordes (`.scroll-fade-x` en globals.css) es la única pista de que hay más
 *  chips fuera de la vista. Donde el navegador no tiene animaciones ligadas al
 *  scroll, un IntersectionObserver sobre el primer y el último hijo marca por
 *  qué lado queda contenido.
 *
 *  overflow-x recorta el anillo de foco de los chips: el padding de 4px le da
 *  sitio y el margen negativo lo compensa para que el layout no cambie. */
export function ScrollFadeRow({ className, children, ...rest }: ComponentProps<"div">) {
  const ref = useRef<HTMLDivElement>(null);
  const childCount = Children.count(children);

  useEffect(() => {
    const scroller = ref.current;
    if (!scroller || CSS.supports("animation-timeline", "scroll()")) return;
    const first = scroller.firstElementChild;
    const last = scroller.lastElementChild;
    if (!first || !last) return;

    // rootMargin: con anchos fraccionarios un hijo del borde puede quedarse a
    // una fracción de píxel de «totalmente visible».
    const observer = new IntersectionObserver(
      (entries) => {
        for (const { target, intersectionRatio } of entries) {
          if (target === first) scroller.classList.toggle("more-start", intersectionRatio < 1);
          if (target === last) scroller.classList.toggle("more-end", intersectionRatio < 1);
        }
      },
      { root: scroller, threshold: 1, rootMargin: "1px" }
    );
    observer.observe(first);
    observer.observe(last);
    return () => {
      observer.disconnect();
      scroller.classList.remove("more-start", "more-end");
    };
  }, [childCount]);

  return (
    <div
      ref={ref}
      className={cn("scroll-fade-x no-scrollbar -mx-1 flex snap-x gap-2 overflow-x-auto px-1 py-1", className)}
      {...rest}
    >
      {children}
    </div>
  );
}
