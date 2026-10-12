import { cn } from "@/lib/utils";
import { fmtQty, type SaleUnit } from "@/modules/products/lib/units";

export const LOW_STOCK_THRESHOLD = 5;

interface StockLabelProps {
  stock: number;
  /** Unidad de venta: "Quedan 2.5 kg" en vez de "Quedan 2.5 unidades". */
  unit?: SaleUnit;
  threshold?: number;
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
  className,
}: StockLabelProps) {
  const tone =
    stock <= 0
      ? "font-semibold text-danger"
      : stock <= threshold
        ? "font-medium text-gold-600"
        : "font-medium text-ok";

  return (
    <span className={cn("text-[12px] leading-none", tone, className)}>
      {stockText(stock, threshold, unit)}
    </span>
  );
}
