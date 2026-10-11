"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "@heroui/react";
import { FormFooter } from "@/components/form/form-footer";
import { FormTextField } from "@/components/form/fields";
import { ResponsiveFormDialog } from "@/components/responsive-form-dialog";
import type { CurrencyInfo } from "@/lib/format";
import { upsertRate } from "../actions/rate-actions";
import { rateSchema, type RateInput, type RateValues } from "../lib/schemas";
import type { RateOverviewRow } from "../queries/rate-queries";

interface RateFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  row: RateOverviewRow | null;
  base: CurrencyInfo;
}

const FORM_ID = "rate-form";

export function RateForm({ open, onOpenChange, row, base }: RateFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { control, handleSubmit } = useForm<RateInput, unknown, RateValues>({
    resolver: zodResolver(rateSchema),
    defaultValues: {
      currencyId: row?.currency.currencyId ?? "",
      rate: row?.rate ?? "",
      note: "",
      version: row?.version ?? undefined,
    },
  });

  const onSubmit = async (values: RateValues) => {
    setIsSubmitting(true);
    try {
      const result = await upsertRate(values);
      if (!result.success) {
        toast.danger(result.error);
        return;
      }
      toast.success("Tasa guardada");
      onOpenChange(false);
    } catch (error) {
      console.error("RateForm:", error);
      toast.danger("No se pudo guardar la tasa");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!row) return null;

  return (
    <ResponsiveFormDialog
      open={open}
      onOpenChange={onOpenChange}
      title={`Tasa ${row.currency.code} → ${base.code}`}
      description={`Cuántos ${base.code} vale 1 ${row.currency.code}. El cambio queda en el historial y aplica a los precios al instante.`}
      size="sm"
      footer={
        <FormFooter
          formId={FORM_ID}
          submitLabel="Guardar tasa"
          isSubmitting={isSubmitting}
          onCancel={() => onOpenChange(false)}
        />
      }
    >
      <form id={FORM_ID} onSubmit={handleSubmit(onSubmit)} noValidate className="flex flex-col gap-4">
        <FormTextField
          control={control}
          name="rate"
          label={`1 ${row.currency.code} =`}
          type="number"
          step="0.0001"
          min={0}
          suffix={base.code}
          isRequired
        />
        <FormTextField control={control} name="note" label="Nota" placeholder="Fuente o motivo del cambio" />
      </form>
    </ResponsiveFormDialog>
  );
}
