"use client";

import { Skeleton } from "@heroui/react";
import { LoadingStatus } from "@/components/loading-status";
import { cn } from "@/lib/utils";

/* Esqueletos de carga de las rutas (`loading.tsx`) y de los Suspense internos.
   Reproducen la silueta de la pantalla real para que el cambio al contenido
   no mueva nada: mismas anchuras, mismos paddings. */

export function ProductCardSkeleton() {
  return (
    <div className="flex flex-col overflow-hidden rounded-card bg-canvas shadow-card">
      {/* Solo la foto lleva shimmer: cada barra animada es una capa más del
          compositor y una retícula de 8 cards sumaba 40. */}
      <Skeleton className="aspect-square w-full rounded-none" />
      <div className="flex flex-col gap-2.5 px-3 pt-3.5 sm:px-4">
        <Skeleton animationType="none" className="h-2.5 w-16 rounded-full" />
        <Skeleton animationType="none" className="h-3.5 w-3/4 rounded-full" />
      </div>
      <div className="flex flex-col gap-2.5 p-3 pt-4 sm:p-4">
        <Skeleton animationType="none" className="h-4 w-20 rounded-full" />
        <Skeleton animationType="none" className="h-10 w-full rounded-full pointer-coarse:h-11" />
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

/** Home de la tienda: hero en banda crema, franja de beneficios y la primera
 *  retícula. */
export function HomeSkeleton() {
  return (
    <>
      <LoadingStatus />
      <section className="-mt-7 bg-cream pt-7">
        <div className="mx-auto grid w-full max-w-[1120px] items-center gap-10 px-5 pt-10 pb-16 md:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)] md:px-6 md:pt-14 md:pb-20">
          <div className="flex flex-col items-center md:items-start">
            <Skeleton className="h-2.5 w-36 rounded-full" />
            <Skeleton className="mt-5 h-8 w-[min(420px,90%)] rounded-full md:h-11" />
            <Skeleton className="mt-3 h-8 w-[min(340px,70%)] rounded-full md:h-11" />
            <Skeleton className="mt-5 h-3.5 w-[min(400px,80%)] rounded-full" />
            <div className="mt-7 flex gap-3">
              <Skeleton className="h-12 w-40 rounded-full" />
              <Skeleton className="h-12 w-32 rounded-full" />
            </div>
          </div>
          <Skeleton className="hidden aspect-[5/4] w-full rounded-sheet md:block" />
        </div>
      </section>
      <div className="mx-auto -mt-9 w-full max-w-[1120px] px-5 md:px-6">
        <div className="h-[88px] rounded-card bg-canvas shadow-card sm:h-[76px]" />
      </div>
      <div className="mx-auto flex w-full max-w-[1120px] flex-1 flex-col px-5 py-10 md:px-6 md:py-12">
        <Skeleton className="h-2.5 w-24 rounded-full" />
        <Skeleton className="mt-3 h-6 w-40 rounded-full" />
        <ProductGridSkeleton className="mt-5" />
      </div>
    </>
  );
}

/** Resultados del catálogo: contador más retícula. `announce` se apaga cuando
 *  va dentro de otra silueta que ya anuncia la carga. */
export function CatalogResultsSkeleton({ announce = true }: { announce?: boolean }) {
  return (
    <div className="flex flex-col gap-6">
      {announce && <LoadingStatus />}
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
      <LoadingStatus />
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
        <div className="aspect-square w-full">
          <Skeleton className="h-full w-full rounded-card" />
        </div>
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

/** Ficha de combo: foto y, a la derecha, cabecera, precio y el bloque con
 *  los productos incluidos. */
export function ComboDetailSkeleton() {
  return (
    <StoreScreenSkeleton back>
      <div className="grid gap-6 md:grid-cols-2 md:gap-10">
        <Skeleton className="aspect-square w-full rounded-card" />
        <div className="flex flex-col gap-4">
          <Skeleton className="h-2.5 w-32 rounded-full" />
          <Skeleton className="h-7 w-3/4 rounded-full" />
          <Skeleton className="h-6 w-28 rounded-full" />
          <Skeleton className="h-24 w-full rounded-card" />
          <Skeleton className="mt-2 h-12 w-full rounded-full" />
        </div>
      </div>
    </StoreScreenSkeleton>
  );
}

/** Panel admin y app del mensajero: PageHeader más lista (cards en móvil,
 *  tabla en desktop) o ficha de detalle en dos columnas. */
export function AdminPageSkeleton({ variant = "list" }: { variant?: "list" | "detail" | "dashboard" }) {
  return (
    <>
      <LoadingStatus />
      <div className="flex items-start gap-3.5">
        <Skeleton className="h-11 w-11 flex-none rounded-field" />
        <div className="flex flex-1 flex-col gap-2 pt-1">
          <Skeleton className="h-5 w-40 rounded-full md:h-6" />
          <Skeleton className="h-3 w-64 max-w-full rounded-full" />
        </div>
      </div>
      {variant === "dashboard" ? (
        <>
          {[0, 1].map((group) => (
            <div key={group}>
              <Skeleton className="mb-3 h-2.5 w-20 rounded-full" />
              <div className="grid grid-cols-2 gap-3 md:grid-cols-4 md:gap-4">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="flex min-h-[128px] flex-col justify-between rounded-card bg-canvas p-4 shadow-card">
                    <Skeleton className="h-9 w-9 rounded-chip" />
                    <div>
                      <Skeleton className="h-6 w-24 rounded-full" />
                      <Skeleton animationType="none" className="mt-3 h-3 w-28 rounded-full" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
          <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_360px] lg:items-start">
            <div className="rounded-card bg-canvas p-5 shadow-card">
              <Skeleton className="h-4 w-40 rounded-full" />
              <Skeleton className="mt-5 h-[180px] w-full rounded-field" />
            </div>
            <div className="rounded-card bg-canvas p-5 shadow-card">
              <Skeleton className="h-4 w-32 rounded-full" />
              <CardLinesSkeleton lines={5} />
            </div>
          </div>
        </>
      ) : variant === "list" ? (
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
            <div className="flex gap-6 border-b border-line bg-cream-50 px-5 py-3.5">
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
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_360px] lg:items-start">
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
