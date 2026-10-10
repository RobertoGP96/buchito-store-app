import { cn } from "@/lib/utils";

export const LOW_STOCK_THRESHOLD = 5;

interface StockLabelProps {
  stock: number;
  threshold?: number;
  className?: string;
}

export function stockText(stock: number, threshold = LOW_STOCK_THRESHOLD): string {
  if (stock <= 0) return "Agotado";
  if (stock <= threshold) {
    return `Quedan ${stock} ${stock === 1 ? "unidad" : "unidades"}`;
  }
  return "Disponible";
}

export function StockLabel({
  stock,
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
      {stockText(stock, threshold)}
    </span>
  );
}
