"use client";

import { useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "@heroui/react";
import { FormFooter } from "@/components/form/form-footer";
import { FormSelect, FormTextField, type SelectOption } from "@/components/form/fields";
import { ResponsiveFormDialog } from "@/components/responsive-form-dialog";
import { fmtDateTime } from "@/lib/format";
import { cn } from "@/lib/utils";
import { useCurrency } from "@/modules/currency/store/currency-provider";
import { adjustStock } from "../actions/stock-actions";
import { stockAdjustmentSchema, type StockAdjustmentInput } from "../lib/schemas";
import { fmtQty, fmtQtyNumber } from "../lib/units";
import type { AdminStockMovementType, AdminVariantRow } from "../queries/product-queries";

type StockAdjustmentValues = {
  variantId: number;
  type: AdminStockMovementType;
  quantity: number;
  unitCost?: number | null;
  costCurrencyId?: number | null;
  notes: string | null;
};

export const STOCK_MOVEMENT_TYPE_LABELS: Record<AdminStockMovementType, string> = {
  entry: "Entrada",
  exit: "Salida",
  adjustment: "Recuento",
};

const TYPE_OPTIONS: SelectOption[] = [
  { value: "entry", label: "Entrada", description: "Suma al stock actual." },
  { value: "exit", label: "Salida", description: "Resta del stock; no puede quedar en negativo." },
  { value: "adjustment", label: "Recuento", description: "Escribe el stock real tras contar." },
];

const QUANTITY_LABEL: Record<AdminStockMovementType, string> = {
  entry: "Cantidad que entra",
  exit: "Cantidad que sale",
  adjustment: "Stock real (conteo)",
};

interface StockAdjustFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  variant: AdminVariantRow | null;
}

const FORM_ID = "stock-adjust-form";

/** Signo visual de un movimiento: el recuento no tiene signo, es el stock final. */
function movementDelta(type: AdminStockMovementType, quantity: number): string {
  const n = fmtQtyNumber(quantity);
  if (type === "entry") return `+${n}`;
  if (type === "exit") return `−${n}`;
  return `= ${n}`;
}

export function StockAdjustForm({ open, onOpenChange, variant }: StockAdjustFormProps) {
  const { currencies } = useCurrency();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { control, handleSubmit } = useForm<StockAdjustmentInput, unknown, StockAdjustmentValues>({
    resolver: zodResolver(stockAdjustmentSchema),
    defaultValues: {
      variantId: variant?.variantId ?? 0,
      type: "entry",
      quantity: "",
      unitCost: "",
      costCurrencyId: variant?.costCurrency?.currencyId ?? variant?.priceCurrency.currencyId ?? "",
      notes: "",
    },
  });
  const type = (useWatch({ control, name: "type" }) ?? "entry") as AdminStockMovementType;
  const currencyOptions: SelectOption[] = currencies.map((c) => ({ value: String(c.currencyId), label: c.code }));

  const onSubmit = async (values: StockAdjustmentValues) => {
    setIsSubmitting(true);
    try {
      const result = await adjustStock(values);
      if (!result.success) {
        toast.danger(result.error);
        return;
      }
      toast.success(`Stock actualizado: ${fmtQty(result.data.stockAfter, variant?.unit ?? "unit", true)}`);
      onOpenChange(false);
    } catch (error) {
      console.error("StockAdjustForm:", error);
      toast.danger("No se pudo ajustar el stock");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!variant) return null;

  return (
    <ResponsiveFormDialog
      open={open}
      onOpenChange={onOpenChange}
      title={`Stock de ${variant.name ?? variant.sku}`}
      description={`Stock actual: ${fmtQty(variant.stock, variant.unit, true)} · SKU ${variant.sku}`}
      size="sm"
      footer={
        <FormFooter
          formId={FORM_ID}
          submitLabel="Registrar movimiento"
          isSubmitting={isSubmitting}
          onCancel={() => onOpenChange(false)}
        />
      }
    >
      <form id={FORM_ID} onSubmit={handleSubmit(onSubmit)} noValidate className="flex flex-col gap-4">
        <FormSelect control={control} name="type" label="Tipo de movimiento" options={TYPE_OPTIONS} isRequired />
        <FormTextField
          control={control}
          name="quantity"
          label={`${QUANTITY_LABEL[type]}${variant.unit !== "unit" ? ` (${fmtQty(1, variant.unit).replace(/^1 /, "")})` : ""}`}
          type="number"
          step="any"
          min={0}
          isRequired
          description={
            type === "adjustment"
              ? "Se registra la diferencia con el stock actual. Para dejarlo en cero usa una salida."
              : type === "exit"
                ? `Máximo ${fmtQty(variant.stock, variant.unit)}.`
                : undefined
          }
        />
        {type === "entry" && (
          <div className="grid grid-cols-[minmax(0,1fr)_112px] gap-3">
            <FormTextField
              control={control}
              name="unitCost"
              label="Precio de compra por unidad"
              type="number"
              step="0.01"
              min={0}
              description={
                variant.cost != null && variant.costCurrency
                  ? `Costo actual: ${variant.cost} ${variant.costCurrency.code}. Vacío = no cambiar.`
                  : "Opcional. Pasa a ser el costo de la variante."
              }
            />
            <FormSelect control={control} name="costCurrencyId" label="Moneda" options={currencyOptions} />
          </div>
        )}
        <FormTextField control={control} name="notes" label="Notas (opcional)" placeholder="Compra a proveedor, rotura…" />
      </form>

      {variant.recentMovements.length > 0 && (
        <div className="mt-5 border-t border-line pt-4">
          <p className="eyebrow">Últimos movimientos</p>
          <ul className="mt-2 divide-y divide-line-soft">
            {variant.recentMovements.map((m) => (
              <li key={m.movementId} className="flex items-center justify-between gap-3 py-2 text-[12.5px]">
                <div className="min-w-0">
                  <p className="font-medium text-ink">
                    {STOCK_MOVEMENT_TYPE_LABELS[m.type]}
                    {m.referenceType === "order" && m.referenceId != null && (
                      <span className="text-slate-400"> · pedido #{m.referenceId}</span>
                    )}
                  </p>
                  <p className="tabular truncate text-slate-400">
                    {fmtDateTime(m.createdAt)}
                    {m.createdBy ? ` · ${m.createdBy}` : ""}
                    {m.notes ? ` · ${m.notes}` : ""}
                  </p>
                </div>
                <div className="tabular flex-none text-right">
                  <p className={cn("font-semibold", m.type === "exit" ? "text-danger" : "text-ink")}>
                    {movementDelta(m.type, m.quantity)}
                  </p>
                  <p className="text-[11.5px] text-slate-400">quedan {fmtQty(m.stockAfter, variant.unit)}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </ResponsiveFormDialog>
  );
}
