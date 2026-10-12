"use client";

import { Minus, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { fmtQtyNumber, SALE_UNIT_SHORT, type SaleUnit } from "@/modules/products/lib/units";

interface QtyStepperProps {
  qty: number;
  onInc: () => void;
  onDec: () => void;
  max?: number;
  /** Paso de la variante (1 unidad, 0.25 kg): el botón "menos" se bloquea en un paso. */
  step?: number;
  /** Se muestra junto a la cantidad cuando no se vende por unidades ("0.5 kg"). */
  unit?: SaleUnit;
  size?: "sm" | "lg";
}

export function QtyStepper({ qty, onInc, onDec, max, step = 1, unit = "unit", size = "sm" }: QtyStepperProps) {
  const isLg = size === "lg";
  const btnClass = cn(
    "flex flex-none items-center justify-center rounded-full text-slate-500 transition-colors duration-150 hover:bg-hover hover:text-navy-700 disabled:pointer-events-none disabled:text-disabled",
    isLg ? "h-10 w-10" : "h-8 w-8"
  );
  const showUnit = unit !== "unit";
  // Con tolerancia: 0.1 + 0.2 nunca es exactamente 0.3 en coma flotante.
  const atMax = max != null && qty + step > max + 1e-9;
  return (
    <div className="inline-flex items-center rounded-full border-[1.5px] border-line bg-canvas p-0.5">
      <button
        type="button"
        onClick={onDec}
        aria-label="Disminuir cantidad"
        className={btnClass}
      >
        <Minus className="h-4 w-4" strokeWidth={2} />
      </button>
      <div
        className={cn(
          "tabular text-center font-semibold text-navy-900",
          isLg ? "min-w-[34px] text-[15px]" : "min-w-[26px] text-[13px]",
          showUnit && "px-1.5"
        )}
      >
        {fmtQtyNumber(qty)}
        {showUnit && <span className="ml-0.5 text-[0.8em] font-medium text-slate-400">{SALE_UNIT_SHORT[unit]}</span>}
      </div>
      <button
        type="button"
        onClick={onInc}
        disabled={atMax}
        aria-label="Aumentar cantidad"
        className={btnClass}
      >
        <Plus className="h-4 w-4" strokeWidth={2} />
      </button>
    </div>
  );
}
