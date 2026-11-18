"use client";

import Link from "next/link";
import { CHIP_BASE, CHIP_OFF, CHIP_ON } from "@/components/choice-chips";
import { LinkPending } from "@/components/nav-icon";
import { ScrollFadeRow } from "@/components/scroll-fade-row";
import { cn } from "@/lib/utils";

interface StatusFilterProps<Status extends string> {
  /** Ruta del listado; el estado viaja en `?status=`. */
  basePath: string;
  allLabel: string;
  statuses: readonly Status[];
  labels: Record<Status, string>;
  counts: Record<Status, number>;
  active: Status | null;
  /** Filas que muestra el listado con el filtro actual. */
  resultCount: number;
  /** Singular y plural de lo que se lista: `["pedido", "pedidos"]`. */
  noun: [string, string];
}

/** Franja de filtros por estado de un listado del panel: chips con su conteo
 *  y, al lado, cuántas filas hay a la vista. El filtro vive en la URL, así que
 *  cada chip es un enlace (sin `loading.tsx`: el chip pulsado muestra
 *  `LinkPending` y la lista se conserva mientras llega la nueva). */
export function StatusFilter<Status extends string>({
  basePath,
  allLabel,
  statuses,
  labels,
  counts,
  active,
  resultCount,
  noun,
}: StatusFilterProps<Status>) {
  const total = statuses.reduce((sum, status) => sum + counts[status], 0);
  const count = (value: number, on: boolean) =>
    value > 0 ? (
      <span className={cn("tabular type-micro ml-1.5 font-semibold", on ? "opacity-80" : "text-ink-subtle")}>{value}</span>
    ) : null;

  return (
    <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between md:gap-4">
      <ScrollFadeRow className="min-w-0">
        <Link href={basePath} scroll={false} className={cn(CHIP_BASE, active === null ? CHIP_ON : CHIP_OFF)}>
          {allLabel}
          {count(total, active === null)}
          <LinkPending />
        </Link>
        {statuses.map((status) => (
          <Link
            key={status}
            href={`${basePath}?status=${status}`}
            scroll={false}
            className={cn(CHIP_BASE, active === status ? CHIP_ON : CHIP_OFF)}
          >
            {labels[status]}
            {count(counts[status], active === status)}
            <LinkPending />
          </Link>
        ))}
      </ScrollFadeRow>
      <p role="status" className="tabular type-meta flex-none text-ink-subtle">
        {resultCount} {resultCount === 1 ? noun[0] : noun[1]}
      </p>
    </div>
  );
}
