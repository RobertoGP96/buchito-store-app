"use client";

import { Minus, Plus } from "lucide-react";
import { cn } from "@/lib/utils";

interface QtyStepperProps {
  qty: number;
  onInc: () => void;
  onDec: () => void;
  max?: number;
  size?: "sm" | "lg";
}

export function QtyStepper({ qty, onInc, onDec, max, size = "sm" }: QtyStepperProps) {
  const isLg = size === "lg";
  const btnClass = cn(
    "flex flex-none items-center justify-center rounded-full text-slate-500 transition-colors duration-150 hover:bg-hover hover:text-navy-700 disabled:pointer-events-none disabled:text-disabled",
    isLg ? "h-10 w-10" : "h-8 w-8"
  );
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
          isLg ? "min-w-[34px] text-[15px]" : "min-w-[26px] text-[13px]"
        )}
      >
        {qty}
      </div>
      <button
        type="button"
        onClick={onInc}
        disabled={max != null && qty >= max}
        aria-label="Aumentar cantidad"
        className={btnClass}
      >
        <Plus className="h-4 w-4" strokeWidth={2} />
      </button>
    </div>
  );
}
