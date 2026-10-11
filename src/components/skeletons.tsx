"use client";

import { unstable_ViewTransition as ViewTransition } from "react";
import { Skeleton } from "@heroui/react";
import { PRODUCT_IMAGE_TRANSITION } from "@/components/product-image";
import { cn } from "@/lib/utils";

/* Esqueletos de carga de las rutas (`loading.tsx`) y de los Suspense internos.
   Reproducen la silueta de la pantalla real para que el cambio al contenido
   no mueva nada: mismas anchuras, mismos paddings. */

export function ProductCardSkeleton() {
  return (
    <div className="flex flex-col gap-3.5 rounded-card bg-canvas p-3 pb-4 shadow-card sm:p-4 sm:pb-5">
      <Skeleton className="aspect-square w-full rounded-field" />
      <Skeleton className="h-2.5 w-16 rounded-full" />
      <Skeleton className="h-3.5 w-3/4 rounded-full" />
      <div className="mt-1 flex items-center justify-between border-t border-line pt-3">
        <Skeleton className="h-4 w-20 rounded-full" />
        <Skeleton className="h-9 w-9 rounded-full sm:w-16" />
      </div>
    </div>
  );
}

export function ProductGridSkeleton({ count = 8, className }: { count?: number; className?: string }) {
  return (
    <div className={cn("grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 xl:grid-cols-4", className)}>
      {Array.from({ length: count }).map((_, i) => (
        <ProductCardSkeleton key={i} />
      ))}
    </div>
  );
}

/** Home de la tienda: hero centrado más la retícula de destacados. */
export function HomeSkeleton() {
  return (
    <>
      <section className="flex flex-col items-center border-b border-line bg-canvas px-5 pt-14 pb-12 md:px-10 md:pt-[72px] md:pb-16">
        <Skeleton className="h-2.5 w-36 rounded-full" />
        <Skeleton className="mt-5 h-8 w-[min(640px,90%)] rounded-full md:h-12" />
        <Skeleton className="mt-5 h-3.5 w-[min(470px,80%)] rounded-full" />
        <div className="mt-8 flex gap-3.5">
          <Skeleton className="h-12 w-36 rounded-full" />
          <Skeleton className="h-12 w-32 rounded-full" />
        </div>
      </section>
      <div className="mx-auto flex w-full max-w-[1120px] flex-1 flex-col px-5 py-10 md:px-6 md:py-11">
        <Skeleton className="h-2.5 w-24 rounded-full" />
        <Skeleton className="mt-3 h-6 w-40 rounded-full" />
        <ProductGridSkeleton className="mt-5" />
      </div>
    </>
  );
}

/** Resultados del catálogo: contador más retícula. */
export function CatalogResultsSkeleton() {
  return (
    <div className="flex flex-col gap-6">
      <Skeleton className="h-3 w-24 rounded-full" />
      <ProductGridSkeleton />
    </div>
  );
}

/** Cabecera de pantalla de la tienda (ScreenHeader) más el contenido que se pase. */
export function StoreScreenSkeleton({
  back = false,
  children,
}: {
  back?: boolean;
  children?: React.ReactNode;
}) {
  return (
    <>
      <div className="mx-auto w-full max-w-[1120px] px-5 pt-7 pb-5 md:px-6 md:pt-9 md:pb-6">
        {back && <Skeleton className="mb-4 h-4 w-16 rounded-full" />}
        <Skeleton className="h-2.5 w-20 rounded-full" />
        <Skeleton className="mt-3 h-7 w-56 rounded-full md:h-8" />
      </div>
      <div className="mx-auto flex w-full max-w-[1120px] flex-1 flex-col gap-4 px-5 pb-10 md:px-6">{children}</div>
    </>
  );
}

export function CardRowsSkeleton({ rows = 3 }: { rows?: number }) {
  return (
    <div className="flex flex-col gap-3">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex items-center gap-4 rounded-card bg-canvas p-4 shadow-card">
          <Skeleton className="h-12 w-12 flex-none rounded-field" />
          <div className="flex flex-1 flex-col gap-2">
            <Skeleton className="h-3.5 w-1/2 rounded-full" />
            <Skeleton className="h-2.5 w-1/3 rounded-full" />
          </div>
          <Skeleton className="h-4 w-16 rounded-full" />
        </div>
      ))}
    </div>
  );
}

export function ProductDetailSkeleton() {
  return (
    <StoreScreenSkeleton back>
      <div className="grid gap-6 md:grid-cols-2 md:gap-10">
        {/* Mismo nombre que la foto de la card pulsada y que la de la ficha:
            la foto aterriza aquí y luego la real se funde encima. */}
        <ViewTransition name={PRODUCT_IMAGE_TRANSITION} enter="none" exit="none" default="none" share="product-image">
          <div className="aspect-square w-full">
            <Skeleton className="h-full w-full rounded-card" />
          </div>
        </ViewTransition>
        <div className="flex flex-col gap-4">
          <Skeleton className="h-2.5 w-20 rounded-full" />
          <Skeleton className="h-7 w-3/4 rounded-full" />
          <Skeleton className="h-6 w-28 rounded-full" />
          <Skeleton className="h-3 w-full rounded-full" />
          <Skeleton className="h-3 w-5/6 rounded-full" />
          <div className="mt-2 flex gap-2">
            <Skeleton className="h-10 w-20 rounded-full" />
            <Skeleton className="h-10 w-20 rounded-full" />
          </div>
          <Skeleton className="mt-2 h-12 w-full rounded-full" />
        </div>
      </div>
    </StoreScreenSkeleton>
  );
}

/** Panel admin y app del mensajero: PageHeader más lista (cards en móvil,
 *  tabla en desktop) o ficha de detalle en dos columnas. */
export function AdminPageSkeleton({ variant = "list" }: { variant?: "list" | "detail" }) {
  return (
    <>
      <div className="flex items-start gap-3.5">
        <Skeleton className="h-11 w-11 flex-none rounded-field" />
        <div className="flex flex-1 flex-col gap-2 pt-1">
          <Skeleton className="h-5 w-40 rounded-full md:h-6" />
          <Skeleton className="h-3 w-64 max-w-full rounded-full" />
        </div>
      </div>
      {variant === "list" ? (
        <>
          <div className="flex gap-2">
            <Skeleton className="h-10 w-20 rounded-full" />
            <Skeleton className="h-10 w-24 rounded-full" />
            <Skeleton className="h-10 w-24 rounded-full" />
          </div>
          <div className="flex flex-col gap-3 md:hidden">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="rounded-card bg-canvas p-4 shadow-card">
                <div className="flex items-start justify-between gap-3">
                  <Skeleton className="h-4 w-1/2 rounded-full" />
                  <Skeleton className="h-5 w-16 rounded-full" />
                </div>
                <Skeleton className="mt-2 h-3 w-1/3 rounded-full" />
                <Skeleton className="mt-4 h-3 w-full rounded-full" />
              </div>
            ))}
          </div>
          <div className="hidden overflow-hidden rounded-card bg-canvas shadow-card md:block">
            <div className="flex gap-6 border-b border-line px-5 py-3.5">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-3 w-20 rounded-full" />
              ))}
            </div>
            {Array.from({ length: 7 }).map((_, i) => (
              <div key={i} className="flex gap-6 border-b border-line-soft px-5 py-4 last:border-0">
                <Skeleton className="h-3.5 w-24 rounded-full" />
                <Skeleton className="h-3.5 w-40 rounded-full" />
                <Skeleton className="h-3.5 w-20 rounded-full" />
                <Skeleton className="h-3.5 w-16 rounded-full" />
                <Skeleton className="ml-auto h-5 w-20 rounded-full" />
              </div>
            ))}
          </div>
        </>
      ) : (
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_340px] lg:items-start">
          <div className="flex flex-col gap-4">
            <div className="rounded-card bg-canvas p-5 shadow-card">
              <Skeleton className="h-4 w-32 rounded-full" />
              <CardLinesSkeleton lines={4} />
            </div>
            <div className="rounded-card bg-canvas p-5 shadow-card">
              <Skeleton className="h-4 w-40 rounded-full" />
              <CardLinesSkeleton lines={3} />
            </div>
          </div>
          <div className="rounded-card bg-canvas p-5 shadow-card">
            <Skeleton className="h-4 w-28 rounded-full" />
            <CardLinesSkeleton lines={5} />
          </div>
        </div>
      )}
    </>
  );
}

function CardLinesSkeleton({ lines }: { lines: number }) {
  return (
    <div className="mt-4 flex flex-col gap-3">
      {Array.from({ length: lines }).map((_, i) => (
        <div key={i} className="flex justify-between gap-4">
          <Skeleton className="h-3 w-24 rounded-full" />
          <Skeleton className="h-3 w-32 rounded-full" />
        </div>
      ))}
    </div>
  );
}
