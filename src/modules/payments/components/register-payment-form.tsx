"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button, toast } from "@heroui/react";
import { Wallet } from "lucide-react";
import { FormFooter } from "@/components/form/form-footer";
import { FormSelect, FormTextField, type SelectOption } from "@/components/form/fields";
import { ResponsiveFormDialog } from "@/components/responsive-form-dialog";
import { registerOrderPayment } from "../actions/order-payment-actions";
import { registerPaymentSchema, type RegisterPaymentInput, type RegisterPaymentValues } from "../lib/schemas";

interface RegisterPaymentFormProps {
  orderId: number;
  /** Método y moneda del pedido, preseleccionados. */
  defaultPaymentMethodId: number;
  suggestedAmount: number;
  currencyCode: string;
  methods: SelectOption[];
}

const FORM_ID = "register-payment-form";

export function RegisterPaymentForm({
  orderId,
  defaultPaymentMethodId,
  suggestedAmount,
  currencyCode,
  methods,
}: RegisterPaymentFormProps) {
  const [open, setOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { control, handleSubmit } = useForm<RegisterPaymentInput, unknown, RegisterPaymentValues>({
    resolver: zodResolver(registerPaymentSchema),
    defaultValues: {
      orderId,
      paymentMethodId: defaultPaymentMethodId,
      amountTendered: suggestedAmount,
      reference: "",
      notes: "",
    },
  });

  const onSubmit = async (values: RegisterPaymentValues) => {
    setIsSubmitting(true);
    try {
      const result = await registerOrderPayment(values);
      if (!result.success) {
        toast.danger(result.error);
        return;
      }
      toast.success("Cobro registrado");
      setOpen(false);
    } catch (error) {
      console.error("RegisterPaymentForm:", error);
      toast.danger("No se pudo registrar el cobro");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <Button variant="secondary" size="sm" className="rounded-full" onPress={() => setOpen(true)}>
        <Wallet className="h-3.5 w-3.5" strokeWidth={1.9} />
        Registrar cobro
      </Button>
      <ResponsiveFormDialog
        open={open}
        onOpenChange={setOpen}
        title="Registrar cobro"
        description="El monto va en la moneda del método; se convierte a la base con la tasa del momento."
        size="sm"
        footer={<FormFooter formId={FORM_ID} submitLabel="Registrar" isSubmitting={isSubmitting} onCancel={() => setOpen(false)} />}
      >
        <form id={FORM_ID} onSubmit={handleSubmit(onSubmit)} noValidate className="flex flex-col gap-4">
          <FormSelect control={control} name="paymentMethodId" label="Método" options={methods} isRequired />
          <FormTextField control={control} name="amountTendered" label="Monto recibido" type="number" step="0.01" min={0} suffix={currencyCode} isRequired />
          <FormTextField control={control} name="reference" label="Referencia (opcional)" />
          <FormTextField control={control} name="notes" label="Notas (opcional)" />
        </form>
      </ResponsiveFormDialog>
    </>
  );
}
