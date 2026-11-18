import { cn } from "@/lib/utils";
import { fmtQty, type SaleUnit } from "@/modules/products/lib/units";

export const LOW_STOCK_THRESHOLD = 5;

interface StockLabelProps {
  stock: number;
  /** Unidad de venta: "Quedan 2.5 kg" en vez de "Quedan 2.5 unidades". */
  unit?: SaleUnit;
  threshold?: number;
  /** En las cards: no dice nada mientras hay stock de sobra. «Disponible» en
   *  verde en cada card de la retícula era ruido. */
  quiet?: boolean;
  className?: string;
}

export function stockText(stock: number, threshold = LOW_STOCK_THRESHOLD, unit: SaleUnit = "unit"): string {
  if (stock <= 0) return "Agotado";
  if (stock <= threshold) return `Quedan ${fmtQty(stock, unit, true)}`;
  return "Disponible";
}

export function StockLabel({
  stock,
  unit = "unit",
  threshold = LOW_STOCK_THRESHOLD,
  quiet = false,
  className,
}: StockLabelProps) {
  if (quiet && stock > threshold) return null;

  const tone =
    stock <= 0
      ? "font-semibold text-danger"
      : stock <= threshold
        ? "font-medium text-caramelo-700"
        : "font-medium text-ok";

  return (
    <span className={cn("type-caption leading-none", tone, className)}>
      {stockText(stock, threshold, unit)}
    </span>
  );
}
