"use client";

import { useCallback, useEffect, useRef, type KeyboardEvent, type ReactNode } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { ProductImage } from "@/components/product-image";
import { cn } from "@/lib/utils";

export interface CarouselImage {
  url: string;
  alt: string;
  /** Rótulo sobre la foto (nombre de la variante retratada). */
  caption?: string | null;
}

interface ImageCarouselProps {
  images: CarouselImage[];
  /** Foto activa, controlada: el padre la cambia al elegir una variante. */
  index: number;
  onIndexChange: (index: number) => void;
  /** Nombre accesible del carrusel ("Fotos de Arroz"). */
  label: string;
  sizes: string;
  /** true cuando la primera foto es el LCP de la pantalla. */
  priority?: boolean;
  /** `dots` sobre la foto (drawer); `thumbs` en una tira debajo (ficha). */
  indicator?: "dots" | "thumbs";
  /** Capa sobre la foto (etiquetas de destacado o descuento). */
  overlay?: ReactNode;
  /** Clases del marco de la foto (radio, sombra). */
  frameClassName?: string;
  className?: string;
}

const ARROW =
  "absolute top-1/2 hidden h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-canvas/90 text-navy-900 shadow-card transition-[opacity,background-color] duration-150 hover:bg-canvas disabled:pointer-events-none disabled:opacity-0 pointer-fine:flex";

function reducedMotion(): ScrollBehavior {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth";
}

/** Carrusel de fotos con scroll nativo (snap): swipe en táctil, flechas y
 *  teclado en escritorio, puntos o miniaturas para saltar. El índice es
 *  controlado para que la ficha pueda llevarlo a la foto de la variante. */
export function ImageCarousel({
  images,
  index,
  onIndexChange,
  label,
  sizes,
  priority = false,
  indicator = "dots",
  overlay,
  frameClassName,
  className,
}: ImageCarouselProps) {
  const scrollerRef = useRef<HTMLDivElement>(null);
  const thumbsRef = useRef<HTMLDivElement>(null);
  // Índice al que se está desplazando por programa: hasta que el scroll se
  // detenga, los eventos intermedios no cuentan como cambio del usuario (si
  // no, pasar de la foto 0 a la 3 devolvería 1 y 2 por el camino y el padre
  // lo frenaría a medias).
  const pendingRef = useRef<number | null>(null);
  const settleTimer = useRef<number | undefined>(undefined);
  // Último índice que salió de aquí por scroll del usuario: cuando el padre lo
  // devuelve como prop no hay que volver a desplazar (el snap ya lo remata y
  // un scrollTo pelearía con el dedo que sigue arrastrando).
  const reportedRef = useRef<number | null>(null);
  const firstSync = useRef(true);
  const onIndexChangeRef = useRef(onIndexChange);
  const count = images.length;
  const clamp = useCallback((i: number) => Math.min(Math.max(i, 0), Math.max(count - 1, 0)), [count]);

  useEffect(() => {
    onIndexChangeRef.current = onIndexChange;
  }, [onIndexChange]);

  const clearPending = useCallback(() => {
    pendingRef.current = null;
    window.clearTimeout(settleTimer.current);
  }, []);

  useEffect(() => clearPending, [clearPending]);

  const report = useCallback(
    (i: number) => {
      reportedRef.current = clamp(i);
      onIndexChangeRef.current(clamp(i));
    },
    [clamp]
  );

  // Lleva el scroll al índice controlado cuando cambia desde fuera (variante
  // elegida, miniatura, flecha, teclado).
  useEffect(() => {
    const el = scrollerRef.current;
    if (!el || count === 0) return;
    if (reportedRef.current === index) {
      reportedRef.current = null;
      return;
    }
    const target = Math.round(clamp(index) * el.clientWidth);
    const instant = firstSync.current;
    firstSync.current = false;
    if (Math.abs(el.scrollLeft - target) < 2) return;
    pendingRef.current = clamp(index);
    window.clearTimeout(settleTimer.current);
    el.scrollTo({ left: target, behavior: instant ? "auto" : reducedMotion() });
  }, [index, count, clamp]);

  // La miniatura activa se centra en su tira.
  useEffect(() => {
    const strip = thumbsRef.current;
    const thumb = strip?.children[index] as HTMLElement | undefined;
    if (!strip || !thumb) return;
    const left = thumb.offsetLeft - strip.clientWidth / 2 + thumb.clientWidth / 2;
    strip.scrollTo({ left, behavior: reducedMotion() });
  }, [index]);

  const handleScroll = () => {
    const el = scrollerRef.current;
    if (!el || el.clientWidth === 0) return;
    if (pendingRef.current !== null) {
      // Mientras dura el desplazamiento programado solo importa dónde para:
      // cuando cesan los eventos de scroll se mira la foto alcanzada y, si no
      // es la pedida (alguien lo interrumpió), se avisa al padre.
      window.clearTimeout(settleTimer.current);
      settleTimer.current = window.setTimeout(() => {
        const pending = pendingRef.current;
        pendingRef.current = null;
        const node = scrollerRef.current;
        if (pending === null || !node || node.clientWidth === 0) return;
        const landed = Math.round(node.scrollLeft / node.clientWidth);
        if (landed !== pending) report(landed);
      }, 150);
      return;
    }
    const current = Math.round(el.scrollLeft / el.clientWidth);
    if (current !== index) report(current);
  };

  const go = (delta: number) => onIndexChange(clamp(index + delta));

  const handleKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (count < 2) return;
    if (e.key === "ArrowRight") {
      e.preventDefault();
      go(1);
    } else if (e.key === "ArrowLeft") {
      e.preventDefault();
      go(-1);
    } else if (e.key === "Home") {
      e.preventDefault();
      onIndexChange(0);
    } else if (e.key === "End") {
      e.preventDefault();
      onIndexChange(count - 1);
    }
  };

  if (count === 0) {
    return (
      <div className={cn("relative aspect-square w-full overflow-hidden bg-cream", frameClassName, className)}>
        <span className="absolute inset-0 flex items-center justify-center">
          <ProductImage src={null} alt="" sizes={sizes} label="Sin fotos" />
        </span>
        {overlay}
      </div>
    );
  }

  return (
    <div className={cn("flex flex-col gap-3", className)}>
      <div className={cn("relative overflow-hidden bg-cream", frameClassName)}>
        <div
          ref={scrollerRef}
          role="group"
          aria-roledescription="carrusel"
          aria-label={label}
          tabIndex={count > 1 ? 0 : -1}
          onScroll={handleScroll}
          onPointerDown={clearPending}
          onWheel={clearPending}
          onKeyDown={handleKeyDown}
          className="no-scrollbar flex snap-x snap-mandatory overflow-x-auto overscroll-x-contain outline-none"
        >
          {images.map((image, i) => (
            <div
              key={image.url}
              role="group"
              aria-roledescription="foto"
              aria-label={`${i + 1} de ${count}`}
              className="relative aspect-square w-full flex-none snap-start snap-always"
            >
              <span className="absolute inset-0 flex items-center justify-center">
                <ProductImage src={image.url} alt={image.alt} sizes={sizes} priority={priority && i === 0} />
              </span>
              {image.caption && (
                <span className="pointer-events-none absolute bottom-3 left-3 max-w-[55%] truncate rounded-full bg-canvas/90 px-2.5 py-1.5 text-[11px] leading-none font-semibold text-ink shadow-card">
                  {image.caption}
                </span>
              )}
            </div>
          ))}
        </div>

        {overlay}

        {count > 1 && (
          <>
            <button
              type="button"
              onClick={() => go(-1)}
              disabled={index <= 0}
              aria-label="Foto anterior"
              className={cn(ARROW, "left-3")}
            >
              <ChevronLeft className="h-[18px] w-[18px]" strokeWidth={2.2} aria-hidden />
            </button>
            <button
              type="button"
              onClick={() => go(1)}
              disabled={index >= count - 1}
              aria-label="Foto siguiente"
              className={cn(ARROW, "right-3")}
            >
              <ChevronRight className="h-[18px] w-[18px]" strokeWidth={2.2} aria-hidden />
            </button>
            {indicator === "dots" && (
              <div className="absolute right-3 bottom-3 flex items-center rounded-full bg-scrim px-1.5 py-0.5 backdrop-blur-sm">
                {images.map((image, i) => (
                  <button
                    key={image.url}
                    type="button"
                    onClick={() => onIndexChange(i)}
                    aria-label={`Ir a la foto ${i + 1}`}
                    aria-current={i === index ? "true" : undefined}
                    className="flex h-5 min-w-4 items-center justify-center px-0.5"
                  >
                    <span
                      className={cn(
                        "block h-1.5 rounded-full bg-on-brand transition-[width,opacity] duration-200",
                        i === index ? "w-4" : "w-1.5 opacity-50"
                      )}
                    />
                  </button>
                ))}
              </div>
            )}
          </>
        )}
        <span className="sr-only" aria-live="polite">
          Foto {index + 1} de {count}
        </span>
      </div>

      {indicator === "thumbs" && count > 1 && (
        <div ref={thumbsRef} className="no-scrollbar relative -mx-1 flex gap-2 overflow-x-auto px-1 py-1">
          {images.map((image, i) => (
            <button
              key={image.url}
              type="button"
              onClick={() => onIndexChange(i)}
              aria-label={`Ir a la foto ${i + 1}`}
              aria-current={i === index ? "true" : undefined}
              className={cn(
                "relative h-16 w-16 flex-none overflow-hidden rounded-field border-2 bg-cream transition-colors duration-150",
                i === index ? "border-navy-700" : "border-transparent hover:border-rule"
              )}
            >
              <span className="absolute inset-0 flex items-center justify-center">
                <ProductImage src={image.url} alt="" sizes="64px" />
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
