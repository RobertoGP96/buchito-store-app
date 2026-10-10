"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "@heroui/react";
import { FormFooter } from "@/components/form/form-footer";
import { FormSelect, FormSwitch, FormTextArea, FormTextField, type SelectOption } from "@/components/form/fields";
import { ResponsiveFormDialog } from "@/components/responsive-form-dialog";
import { createPaymentMethod, updatePaymentMethod } from "../actions/payment-method-actions";
import { PAYMENT_KIND_LABELS, PAYMENT_KINDS } from "../lib/labels";
import { paymentMethodSchema, type PaymentMethodInput, type PaymentMethodValues } from "../lib/schemas";
import type { PaymentMethodRow } from "../queries/payment-queries";

interface PaymentMethodFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  method: PaymentMethodRow | null;
  currencies: SelectOption[];
}

const FORM_ID = "payment-method-form";

const KIND_OPTIONS: SelectOption[] = PAYMENT_KINDS.map((kind) => ({
  value: kind,
  label: PAYMENT_KIND_LABELS[kind],
}));

export function PaymentMethodForm({ open, onOpenChange, method, currencies }: PaymentMethodFormProps) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { control, handleSubmit } = useForm<PaymentMethodInput, unknown, PaymentMethodValues>({
    resolver: zodResolver(paymentMethodSchema),
    defaultValues: {
      code: method?.code ?? "",
      name: method?.name ?? "",
      kind: method?.kind ?? "cash_on_delivery",
      currencyId: method?.currency.currencyId ?? "",
      instructions: method?.instructions ?? "",
      requiresReference: method?.requiresReference ?? false,
      surchargePercent: method?.surchargePercent ?? "",
      sortOrder: method?.sortOrder ?? 0,
      isActive: method?.isActive ?? true,
    },
  });

  const onSubmit = async (values: PaymentMethodValues) => {
    setIsSubmitting(true);
    try {
      const result = method
        ? await updatePaymentMethod(method.paymentMethodId, method.version, values)
        : await createPaymentMethod(values);
      if (!result.success) {
        toast.danger(result.error);
        return;
      }
      toast.success(method ? "Método actualizado" : "Método creado");
      onOpenChange(false);
      router.refresh();
    } catch (error) {
      console.error("PaymentMethodForm:", error);
      toast.danger("No se pudo guardar el método de pago");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <ResponsiveFormDialog
      open={open}
      onOpenChange={onOpenChange}
      title={method ? `Editar ${method.name}` : "Nuevo método de pago"}
      description="El cliente lo elige en el checkout y paga en la moneda del método, a la tasa del momento."
      footer={
        <FormFooter
          formId={FORM_ID}
          submitLabel={method ? "Guardar" : "Crear método"}
          isSubmitting={isSubmitting}
          onCancel={() => onOpenChange(false)}
        />
      }
    >
      <form id={FORM_ID} onSubmit={handleSubmit(onSubmit)} noValidate className="grid gap-4 sm:grid-cols-2">
        <FormTextField control={control} name="name" label="Nombre" placeholder="Efectivo USD" isRequired />
        <FormTextField
          control={control}
          name="code"
          label="Código"
          placeholder="cash-usd"
          description="Identificador interno, no cambia aunque renombres el método."
          isRequired
        />
        <FormSelect control={control} name="kind" label="Tipo" options={KIND_OPTIONS} isRequired />
        <FormSelect control={control} name="currencyId" label="Moneda en que paga el cliente" options={currencies} isRequired />
        <FormTextArea
          control={control}
          name="instructions"
          label="Instrucciones para el cliente"
          placeholder="Número de cuenta, a quién transferir, qué poner en el concepto…"
          className="sm:col-span-2"
        />
        <FormTextField
          control={control}
          name="surchargePercent"
          label="Recargo"
          description="Vacío = sin recargo."
          type="number"
          step="0.01"
          min={0}
          suffix="%"
        />
        <FormTextField control={control} name="sortOrder" label="Orden" type="number" step="1" min={0} />
        <FormSwitch
          control={control}
          name="requiresReference"
          label="Pide referencia"
          description="El cliente debe escribir el número de transacción al pagar."
        />
        <FormSwitch control={control} name="isActive" label="Activo" description="Solo los activos se ofrecen en el checkout." />
      </form>
    </ResponsiveFormDialog>
  );
}
