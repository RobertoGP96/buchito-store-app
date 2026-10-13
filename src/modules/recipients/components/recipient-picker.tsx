"use client";

import { Check, Plus } from "lucide-react";
import { StatusChip } from "@/components/status-chip";
import { cn } from "@/lib/utils";
import type { RecipientRow } from "../queries/recipient-queries";
import { RecipientAddress } from "./recipient-address";

interface RecipientPickerProps {
  recipients: RecipientRow[];
  /** Id del destinatario elegido; null = escribir uno nuevo. */
  value: number | null;
  onChange: (addressId: number | null) => void;
  labelledBy: string;
}

const CARD = "flex items-start gap-3 rounded-field border-[1.5px] p-3.5 text-left transition-colors duration-150";
const RADIO = "mt-0.5 flex h-5 w-5 flex-none items-center justify-center rounded-full border-[1.5px]";

/** Cards radio con los destinatarios guardados y una última para añadir otro
 *  (mismo patrón que el selector de método de pago). */
export function RecipientPicker({ recipients, value, onChange, labelledBy }: RecipientPickerProps) {
  const isNew = value == null;
  return (
    <div role="radiogroup" aria-labelledby={labelledBy} className="grid gap-2.5 sm:grid-cols-2">
      {recipients.map((r) => {
        const checked = r.addressId === value;
        return (
          <button
            key={r.addressId}
            type="button"
            role="radio"
            aria-checked={checked}
            onClick={() => onChange(r.addressId)}
            className={cn(CARD, checked ? "border-navy-700 bg-tint" : "border-line bg-canvas hover:border-navy-700")}
          >
            <span className={cn(RADIO, checked ? "border-navy-700 bg-navy-700 text-on-brand" : "border-line")}>
              {checked && <Check className="h-3 w-3" strokeWidth={3} />}
            </span>
            <span className="min-w-0">
              <span className="flex flex-wrap items-center gap-2">
                <span className="text-[14px] font-semibold text-ink">{r.name}</span>
                {r.isDefault && <StatusChip label="Principal" tone="info" />}
              </span>
              <span className="tabular mt-0.5 block text-[12.5px] text-slate-500">{r.phone}</span>
              <RecipientAddress address={r} className="mt-1 block text-[12.5px] leading-[1.55] text-slate-500" />
            </span>
          </button>
        );
      })}
      <button
        type="button"
        role="radio"
        aria-checked={isNew}
        onClick={() => onChange(null)}
        className={cn(CARD, isNew ? "border-navy-700 bg-tint" : "border-dashed border-line bg-canvas hover:border-navy-700")}
      >
        <span className={cn(RADIO, isNew ? "border-navy-700 bg-navy-700 text-on-brand" : "border-line")}>
          {isNew ? <Check className="h-3 w-3" strokeWidth={3} /> : <Plus className="h-3 w-3" strokeWidth={3} />}
        </span>
        <span className="min-w-0">
          <span className="block text-[14px] font-semibold text-ink">Nuevo destinatario</span>
          <span className="mt-0.5 block text-[12.5px] text-slate-500">
            Otra persona u otra dirección. Se guarda para la próxima vez.
          </span>
        </span>
      </button>
    </div>
  );
}
