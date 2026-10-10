"use client";

import { Table } from "@heroui/react";
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
  ariaLabel,
  empty,
  className,
}: ResponsiveListProps<Row>) {
  if (rows.length === 0) return <>{empty}</>;

  return (
    <div className={className}>
      <ul className="flex flex-col gap-3 md:hidden">
        {rows.map((row) => (
          <li key={rowKey(row)}>{renderCard(row)}</li>
        ))}
      </ul>

      <div className="hidden md:block">
        <Table>
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
                {rows.map((row) => (
                  <Table.Row key={rowKey(row)} id={String(rowKey(row))}>
                    {columns.map((column) => (
                      <Table.Cell
                        key={column.id}
                        className={cn(column.align === "right" && "text-right", column.className)}
                      >
                        {column.cell(row)}
                      </Table.Cell>
                    ))}
                  </Table.Row>
                ))}
              </Table.Body>
            </Table.Content>
          </Table.ScrollContainer>
        </Table>
      </div>
    </div>
  );
}

/** Card de fila en móvil: título + chip + filas clave/valor. */
export function ListCard({
  title,
  subtitle,
  badge,
  rows,
  actions,
  className,
}: {
  title: ReactNode;
  subtitle?: ReactNode;
  badge?: ReactNode;
  rows?: { label: string; value: ReactNode }[];
  actions?: ReactNode;
  className?: string;
}) {
  return (
    <article className={cn("rounded-card bg-canvas p-4 shadow-card", className)}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-[14.5px] font-semibold text-ink">{title}</p>
          {subtitle && <p className="mt-0.5 truncate text-[12.5px] text-slate-400">{subtitle}</p>}
        </div>
        {badge}
      </div>
      {rows && rows.length > 0 && (
        <dl className="mt-3 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 text-[13px]">
          {rows.map((row) => (
            <div key={row.label} className="contents">
              <dt className="text-slate-400">{row.label}</dt>
              <dd className="text-right font-medium text-ink">{row.value}</dd>
            </div>
          ))}
        </dl>
      )}
      {actions && <div className="mt-3 flex flex-wrap justify-end gap-2 border-t border-line pt-3">{actions}</div>}
    </article>
  );
}
