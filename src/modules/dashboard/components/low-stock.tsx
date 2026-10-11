import Link from "next/link";
import { PackageCheck } from "lucide-react";
import { ButtonLink } from "@/components/button-link";
import { EmptyState } from "@/components/empty-state";
import { cn } from "@/lib/utils";
import type { LowStockVariantRow } from "../queries/dashboard-queries";
import { DashboardCard } from "./dashboard-card";

interface LowStockProps {
  rows: LowStockVariantRow[];
  total: number;
  threshold: number;
}

export function LowStock({ rows, total, threshold }: LowStockProps) {
  return (
    <DashboardCard title="Stock bajo" href="/admin/inventario" hrefLabel="Inventario">
      {rows.length === 0 ? (
        <EmptyState
          icon={PackageCheck}
          title="Stock en orden"
          description={`Ninguna variante activa está en ${threshold} unidades o menos.`}
          size="compact"
        />
      ) : (
        <>
          <ul className="divide-y divide-line-soft">
            {rows.map((v) => (
              <li key={v.variantId}>
                <Link
                  href={`/admin/productos/${v.productId}`}
                  className="-mx-2 flex items-center gap-3 rounded-chip px-2 py-2.5 transition-colors hover:bg-tint"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[13.5px] font-medium text-ink">{v.productName}</p>
                    <p className="mt-0.5 truncate text-[12px] text-slate-400">
                      {v.variantName ? `${v.variantName} · ` : ""}
                      <span className="tabular">{v.sku}</span>
                    </p>
                  </div>
                  <span
                    className={cn(
                      "tabular flex-none rounded-chip px-2 py-1 text-[13px] font-semibold",
                      v.stock <= 0 ? "bg-danger-soft text-danger" : "bg-tint text-warn"
                    )}
                  >
                    {v.stock} {v.stock === 1 ? "ud." : "uds."}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
          <div className="mt-3 flex flex-wrap items-center justify-between gap-3 border-t border-line pt-3">
            <p className="tabular text-[12.5px] text-slate-500">
              {total} {total === 1 ? "variante" : "variantes"} con stock ≤ {threshold}
            </p>
            <ButtonLink href="/admin/inventario" size="sm">
              Ir al inventario
            </ButtonLink>
          </div>
        </>
      )}
    </DashboardCard>
  );
}
