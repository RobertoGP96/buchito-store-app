"use client";

import { Table } from "@heroui/react";
import { useRouter } from "next/navigation";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export interface ListColumn<Row> {
  id: string;
  header: string;
  cell: (row: Row) => ReactNode;
  /** Columna que identifica la fila para lectores de pantalla. */
  isRowHeader?: boolean;
  align?: "left" | "right";
  className?: string;
}

interface ResponsiveListProps<Row> {
  rows: Row[];
  rowKey: (row: Row) => string | number;
  columns: ListColumn<Row>[];
  /** Card de móvil por fila; la tabla es solo para ≥md. */
  renderCard: (row: Row) => ReactNode;
  /** Filas de la tabla cuando difieren de las cards (p. ej. sub-filas
   *  desplegadas que en móvil van dentro de la card). Por defecto `rows`. */
  tableRows?: Row[];
  /** Clases extra por fila de la tabla (p. ej. resaltar sub-filas). */
  rowClassName?: (row: Row) => string | undefined;
  /** Detalle de la fila: toda la fila de la tabla navega a él. La celda que
   *  identifica la fila debe seguir llevando su `Link` (abrir en otra pestaña). */
  rowHref?: (row: Row) => string | undefined;
  ariaLabel: string;
  empty: ReactNode;
  className?: string;
}

/** Lista con dos vistas: cards en móvil, tabla HeroUI en desktop. */
export function ResponsiveList<Row>({
  rows,
  rowKey,
  columns,
  renderCard,
  tableRows = rows,
  rowClassName,
  rowHref,
  ariaLabel,
  empty,
  className,
}: ResponsiveListProps<Row>) {
  const router = useRouter();

  if (rows.length === 0) return <>{empty}</>;

  return (
    <div className={className}>
      <ul className="responsive-cards flex flex-col gap-3 md:hidden">
        {rows.map((row) => (
          <li key={rowKey(row)}>{renderCard(row)}</li>
        ))}
      </ul>

      <div className="data-table hidden overflow-hidden rounded-card bg-canvas shadow-card md:block">
        <Table variant="secondary">
          <Table.ScrollContainer>
            <Table.Content aria-label={ariaLabel}>
              <Table.Header>
                {columns.map((column) => (
                  <Table.Column
                    key={column.id}
                    id={column.id}
                    isRowHeader={column.isRowHeader}
                    className={cn(column.align === "right" && "text-right", column.className)}
                  >
                    {column.header}
                  </Table.Column>
                ))}
              </Table.Header>
              <Table.Body>
                {tableRows.map((row) => {
                  const href = rowHref?.(row);
                  return (
                  <Table.Row
                    key={rowKey(row)}
                    id={String(rowKey(row))}
                    className={rowClassName?.(row)}
                    data-href={href}
                    // `onAction` y no `href`: el `href` de react-aria navega con
                    // recarga completa si no hay un RouterProvider montado.
                    onAction={href ? () => router.push(href) : undefined}
                  >
                    {columns.map((column) => (
                      <Table.Cell
                        key={column.id}
                        className={cn(column.align === "right" && "text-right", column.className)}
                      >
                        {column.cell(row)}
                      </Table.Cell>
                    ))}
                  </Table.Row>
                  );
                })}
              </Table.Body>
            </Table.Content>
          </Table.ScrollContainer>
        </Table>
      </div>
    </div>
  );
}

/** Card de fila en móvil: título + chip + filas clave/valor. `children` va
 *  entre las filas y las acciones (p. ej. un desplegable con sub-elementos). */
export function ListCard({
  title,
  subtitle,
  badge,
  rows,
  actions,
  className,
  children,
}: {
  title: ReactNode;
  subtitle?: ReactNode;
  badge?: ReactNode;
  rows?: { label: string; value: ReactNode }[];
  actions?: ReactNode;
  className?: string;
  children?: ReactNode;
}) {
  return (
    <article className={cn("h-full rounded-card bg-canvas p-4 shadow-card", className)}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="type-subheading truncate font-semibold text-ink">{title}</p>
          {subtitle && <p className="type-meta mt-0.5 truncate text-ink-subtle">{subtitle}</p>}
        </div>
        {badge}
      </div>
      {rows && rows.length > 0 && (
        <dl className="type-meta mt-3 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5">
          {rows.map((row) => (
            <div key={row.label} className="contents">
              <dt className="text-ink-subtle">{row.label}</dt>
              <dd className="text-right font-medium text-ink">{row.value}</dd>
            </div>
          ))}
        </dl>
      )}
      {children}
      {actions && <div className="mt-3 flex flex-wrap justify-end gap-2 border-t border-line pt-3">{actions}</div>}
    </article>
  );
}
