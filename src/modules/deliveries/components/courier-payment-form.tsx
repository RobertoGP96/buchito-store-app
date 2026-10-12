"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "@heroui/react";
import { FormFooter } from "@/components/form/form-footer";
import { FormSelect, FormTextField, type SelectOption } from "@/components/form/fields";
import { Money } from "@/components/money";
import { ResponsiveFormDialog } from "@/components/responsive-form-dialog";
import { useCurrency } from "@/modules/currency/store/currency-provider";
import { createCourierPayment } from "../actions/courier-payment-actions";
import { courierPaymentSchema, type CourierPaymentInput, type CourierPaymentValues } from "../lib/schemas";
import type { CourierBalanceRow } from "../queries/courier-payment-queries";

interface CourierPaymentFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  balances: CourierBalanceRow[];
  /** Mensajero preseleccionado (botón "Pagar" de su tarjeta). */
  courierId: number | null;
}

const FORM_ID = "courier-payment-form";

export function CourierPaymentForm({ open, onOpenChange, balances, courierId }: CourierPaymentFormProps) {
  const { base } = useCurrency();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const payable = useMemo(() => balances.filter((b) => b.pendingCount > 0), [balances]);
  const options = useMemo<SelectOption[]>(
    () =>
      payable.map((b) => ({
        value: String(b.courierId),
        label: b.fullName,
        description: `${b.pendingCount} ${b.pendingCount === 1 ? "entrega pendiente" : "entregas pendientes"}`,
      })),
    [payable]
  );
  const initial = payable.find((b) => b.courierId === courierId) ?? payable[0] ?? null;

  const { control, handleSubmit, setValue } = useForm<CourierPaymentInput, unknown, CourierPaymentValues>({
    resolver: zodResolver(courierPaymentSchema),
    defaultValues: {
      courierId: initial?.courierId ?? "",
      amountBase: initial?.pendingFees ?? "",
      notes: "",
    },
  });
  const selectedRaw = useWatch({ control, name: "courierId" });
  const selected = payable.find((b) => String(b.courierId) === String(selectedRaw)) ?? null;

  // Al cambiar de mensajero se propone su saldo pendiente como monto.
  const lastCourier = useRef(selectedRaw);
  useEffect(() => {
    if (lastCourier.current === selectedRaw) return;
    lastCourier.current = selectedRaw;
    if (selected) setValue("amountBase", selected.pendingFees);
  }, [selectedRaw, selected, setValue]);

  const onSubmit = async (values: CourierPaymentValues) => {
    setIsSubmitting(true);
    try {
      const result = await createCourierPayment(values);
      if (!result.success) {
        toast.danger(result.error);
        return;
      }
      toast.success(`Pago registrado: ${result.data.deliveryCount} ${result.data.deliveryCount === 1 ? "entrega liquidada" : "entregas liquidadas"}`);
      onOpenChange(false);
    } catch (error) {
      console.error("CourierPaymentForm:", error);
      toast.danger("No se pudo registrar el pago");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <ResponsiveFormDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Pagar al mensajero"
      description="Liquida todas sus entregas completadas que aún no se le han pagado."
      size="sm"
      footer={
        <FormFooter formId={FORM_ID} submitLabel="Registrar pago" isSubmitting={isSubmitting} onCancel={() => onOpenChange(false)} />
      }
    >
      <form id={FORM_ID} onSubmit={handleSubmit(onSubmit)} noValidate className="flex flex-col gap-4">
        <FormSelect
          control={control}
          name="courierId"
          label="Mensajero"
          options={options}
          placeholder={options.length === 0 ? "Nadie tiene entregas pendientes" : "Elige el mensajero"}
          isDisabled={options.length === 0}
          isRequired
        />
        {selected && (
          <div className="rounded-field bg-page px-4 py-3 text-[13px] text-slate-500">
            {selected.pendingCount} {selected.pendingCount === 1 ? "entrega completada" : "entregas completadas"} ·
            tarifas <Money value={selected.pendingFees} className="font-semibold text-ink" />
          </div>
        )}
        <FormTextField
          control={control}
          name="amountBase"
          label="Monto a pagar"
          type="number"
          step="0.01"
          min={0}
          suffix={base.code}
          description="Se propone la suma de tarifas; ajústalo si hay bonos o descuentos y explícalo en las notas."
          isRequired
        />
        <FormTextField control={control} name="notes" label="Notas (opcional)" placeholder="Efectivo, transferencia, bono…" />
      </form>
    </ResponsiveFormDialog>
  );
}
