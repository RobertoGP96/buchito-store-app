"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "@heroui/react";
import { FormFooter } from "@/components/form/form-footer";
import { FormSwitch, FormTextField } from "@/components/form/fields";
import { ResponsiveFormDialog } from "@/components/responsive-form-dialog";
import { createCurrency, updateCurrency } from "../actions/currency-actions";
import { currencySchema, type CurrencyInput, type CurrencyValues } from "../lib/schemas";
import type { CurrencyRow } from "../queries/currency-queries";

interface CurrencyFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** null = alta. */
  currency: CurrencyRow | null;
}

const FORM_ID = "currency-form";

export function CurrencyForm({ open, onOpenChange, currency }: CurrencyFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { control, handleSubmit } = useForm<CurrencyInput, unknown, CurrencyValues>({
    resolver: zodResolver(currencySchema),
    defaultValues: {
      code: currency?.code ?? "",
      name: currency?.name ?? "",
      symbol: currency?.symbol ?? "",
      decimalPlaces: currency?.decimalPlaces ?? 2,
      sortOrder: currency?.sortOrder ?? 0,
      isActive: currency?.isActive ?? true,
    },
  });

  const onSubmit = async (values: CurrencyValues) => {
    setIsSubmitting(true);
    try {
      const result = currency
        ? await updateCurrency(currency.currencyId, values)
        : await createCurrency(values);
      if (!result.success) {
        toast.danger(result.error);
        return;
      }
      toast.success(currency ? "Moneda actualizada" : "Moneda creada");
      onOpenChange(false);
    } catch (error) {
      console.error("CurrencyForm:", error);
      toast.danger("No se pudo guardar la moneda");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <ResponsiveFormDialog
      open={open}
      onOpenChange={onOpenChange}
      title={currency ? `Editar ${currency.code}` : "Nueva moneda"}
      description="El código es el que se muestra junto a los montos (4 750 CUP)."
      footer={
        <FormFooter
          formId={FORM_ID}
          submitLabel={currency ? "Guardar" : "Crear moneda"}
          isSubmitting={isSubmitting}
          onCancel={() => onOpenChange(false)}
        />
      }
    >
      <form id={FORM_ID} onSubmit={handleSubmit(onSubmit)} noValidate className="grid gap-4 sm:grid-cols-2">
        <FormTextField control={control} name="code" label="Código" placeholder="USD" isRequired />
        <FormTextField control={control} name="symbol" label="Símbolo" placeholder="$" isRequired />
        <FormTextField control={control} name="name" label="Nombre" placeholder="Dólar estadounidense" isRequired className="sm:col-span-2" />
        <FormTextField control={control} name="decimalPlaces" label="Decimales" type="number" step="1" min={0} isRequired />
        <FormTextField control={control} name="sortOrder" label="Orden" type="number" step="1" min={0} />
        <FormSwitch
          control={control}
          name="isActive"
          label="Activa"
          description="Las monedas inactivas no se ofrecen en la tienda ni en métodos de pago."
          className="sm:col-span-2"
        />
      </form>
    </ResponsiveFormDialog>
  );
}
