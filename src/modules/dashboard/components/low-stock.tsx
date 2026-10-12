import { Boxes, PackageCheck } from "lucide-react";
import { ButtonLink } from "@/components/button-link";
import { EmptyState } from "@/components/empty-state";
import { cn } from "@/lib/utils";
import { fmtQty } from "@/modules/products/lib/units";
import type { LowStockVariantRow } from "../queries/dashboard-queries";
import { DashboardCard, DashboardCount, DashboardRow } from "./dashboard-card";

interface LowStockProps {
  rows: LowStockVariantRow[];
  total: number;
  threshold: number;
}

export function LowStock({ rows, total, threshold }: LowStockProps) {
  const hasRows = rows.length > 0;
  const outOfStock = rows.filter((v) => v.stock <= 0).length;

  return (
    <DashboardCard
      icon={Boxes}
      title="Stock bajo"
      description={`Hasta ${threshold} uds.`}
      badge={total > 0 ? <DashboardCount value={total} tone={outOfStock > 0 ? "danger" : "warn"} /> : undefined}
      href="/admin/inventario"
      hrefLabel="Inventario"
      footer={
        hasRows ? (
          <>
            <p className="tabular text-[12.5px] text-slate-500">
              {total} {total === 1 ? "variante" : "variantes"} en total
              {outOfStock > 0 && (
                <>
                  <span className="text-slate-400"> · </span>
                  <span className="font-medium text-danger">
                    {outOfStock} {outOfStock === 1 ? "agotada" : "agotadas"}
                  </span>
                </>
              )}
            </p>
            <ButtonLink href="/admin/inventario" size="sm">
              Ir al inventario
            </ButtonLink>
          </>
        ) : undefined
      }
    >
      {!hasRows ? (
        <EmptyState
          icon={PackageCheck}
          title="Stock en orden"
          description={`Ninguna variante activa está en ${threshold} unidades o menos.`}
          size="compact"
        />
      ) : (
        <ul className="divide-y divide-line-soft">
          {rows.map((v) => {
            const out = v.stock <= 0;
            // Fracción del umbral que queda: la barra se vacía al agotarse.
            const fill = threshold > 0 ? Math.max(0, Math.min(100, (v.stock / threshold) * 100)) : 0;
            return (
              <li key={v.variantId}>
                <DashboardRow href={`/admin/productos/${v.productId}`}>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[13.5px] font-medium text-ink">{v.productName}</p>
                    <p className="mt-0.5 truncate text-[12px] text-slate-400">
                      {v.variantName ? `${v.variantName} · ` : ""}
                      <span className="tabular">{v.sku}</span>
                    </p>
                    <div className="mt-2 h-1 w-full overflow-hidden rounded-full bg-line-soft" aria-hidden>
                      <span
                        className={cn("block h-full rounded-full", out ? "bg-danger" : "bg-warn")}
                        style={{ width: `${out ? 100 : fill}%` }}
                      />
                    </div>
                  </div>
                  <span
                    className={cn(
                      "tabular flex-none rounded-full px-2.5 py-1 text-[12.5px] font-semibold",
                      out ? "bg-danger-soft text-danger" : "bg-gold-100 text-gold-600"
                    )}
                  >
                    {out ? "Agotado" : fmtQty(v.stock, v.unit)}
                  </span>
                </DashboardRow>
              </li>
            );
          })}
        </ul>
      )}
    </DashboardCard>
  );
}
