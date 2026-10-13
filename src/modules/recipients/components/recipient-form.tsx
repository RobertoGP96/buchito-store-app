"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "@heroui/react";
import { FormFooter } from "@/components/form/form-footer";
import { FormSelect, FormSwitch, FormTextField } from "@/components/form/fields";
import { ResponsiveFormDialog } from "@/components/responsive-form-dialog";
import type { ZoneRow } from "@/modules/deliveries/queries/zone-queries";
import { createRecipient, updateRecipient } from "../actions/recipient-actions";
import { recipientSchema, type RecipientInput, type RecipientValues } from "../lib/schemas";
import type { RecipientRow } from "../queries/recipient-queries";

interface RecipientFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  recipient: RecipientRow | null;
  zones: ZoneRow[];
}

const FORM_ID = "recipient-form";

export function RecipientForm({ open, onOpenChange, recipient, zones }: RecipientFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { control, handleSubmit } = useForm<RecipientInput, unknown, RecipientValues>({
    resolver: zodResolver(recipientSchema),
    defaultValues: {
      label: recipient?.label ?? "",
      name: recipient?.name ?? "",
      phone: recipient?.phone ?? "",
      line1: recipient?.line1 ?? "",
      line2: recipient?.line2 ?? "",
      neighborhood: recipient?.neighborhood ?? "",
      reference: recipient?.reference ?? "",
      zoneId: recipient?.zoneId != null ? String(recipient.zoneId) : "",
      isDefault: recipient?.isDefault ?? false,
    },
  });

  const onSubmit = async (values: RecipientValues) => {
    setIsSubmitting(true);
    try {
      const result = recipient
        ? await updateRecipient(recipient.recipientId, values)
        : await createRecipient(values);
      if (!result.success) {
        toast.danger(result.error);
        return;
      }
      toast.success(recipient ? "Destinatario actualizado" : "Destinatario guardado");
      onOpenChange(false);
    } catch (error) {
      console.error("RecipientForm:", error);
      toast.danger("No se pudo guardar el destinatario");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <ResponsiveFormDialog
      open={open}
      onOpenChange={onOpenChange}
      title={recipient ? `Editar ${recipient.name}` : "Nuevo destinatario"}
      description="Quién recibe el pedido y dónde. Lo tendrás listo para elegir al finalizar la compra."
      footer={
        <FormFooter
          formId={FORM_ID}
          submitLabel={recipient ? "Guardar" : "Guardar destinatario"}
          isSubmitting={isSubmitting}
          onCancel={() => onOpenChange(false)}
        />
      }
    >
      <form id={FORM_ID} onSubmit={handleSubmit(onSubmit)} noValidate className="grid gap-4 sm:grid-cols-2">
        <FormTextField control={control} name="name" label="Nombre de quien recibe" autoComplete="name" isRequired />
        <FormTextField control={control} name="phone" label="Teléfono de quien recibe" type="tel" autoComplete="tel" isRequired />
        <FormSelect
          control={control}
          name="zoneId"
          label="Zona de entrega"
          placeholder="Elige la zona"
          options={zones.map((z) => ({ value: String(z.zoneId), label: z.name, description: z.etaLabel ?? undefined }))}
          className="sm:col-span-2"
        />
        <FormTextField control={control} name="line1" label="Dirección" placeholder="Calle y número" autoComplete="address-line1" isRequired className="sm:col-span-2" />
        <FormTextField control={control} name="line2" label="Apto / piso (opcional)" autoComplete="address-line2" />
        <FormTextField control={control} name="neighborhood" label="Barrio / reparto (opcional)" />
        <FormTextField control={control} name="reference" label="Referencia (opcional)" placeholder="Edificio azul, timbre 3" className="sm:col-span-2" />
        <FormTextField control={control} name="label" label="Etiqueta (opcional)" placeholder="Casa de mamá" />
        <FormSwitch
          control={control}
          name="isDefault"
          label="Destinatario principal"
          description="Se elige solo al finalizar la compra."
          isDisabled={recipient?.isDefault ?? false}
        />
      </form>
    </ResponsiveFormDialog>
  );
}
