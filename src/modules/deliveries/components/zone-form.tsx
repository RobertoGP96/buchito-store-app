"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "@heroui/react";
import { FormFooter } from "@/components/form/form-footer";
import { FormSwitch, FormTextField } from "@/components/form/fields";
import { ResponsiveFormDialog } from "@/components/responsive-form-dialog";
import { useCurrency } from "@/modules/currency/store/currency-provider";
import { createZone, updateZone } from "../actions/zone-actions";
import { zoneSchema, type ZoneInput, type ZoneValues } from "../lib/schemas";
import type { ZoneRow } from "../queries/zone-queries";

interface ZoneFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  zone: ZoneRow | null;
}

const FORM_ID = "zone-form";

export function ZoneForm({ open, onOpenChange, zone }: ZoneFormProps) {
  const { base } = useCurrency();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { control, handleSubmit } = useForm<ZoneInput, unknown, ZoneValues>({
    resolver: zodResolver(zoneSchema),
    defaultValues: {
      name: zone?.name ?? "",
      description: zone?.description ?? "",
      fee: zone?.fee ?? 0,
      freeShippingThreshold: zone?.freeShippingThreshold ?? "",
      etaLabel: zone?.etaLabel ?? "",
      sortOrder: zone?.sortOrder ?? 0,
      active: zone?.active ?? true,
    },
  });

  const onSubmit = async (values: ZoneValues) => {
    setIsSubmitting(true);
    try {
      const result = zone ? await updateZone(zone.zoneId, values) : await createZone(values);
      if (!result.success) {
        toast.danger(result.error);
        return;
      }
      toast.success(zone ? "Zona actualizada" : "Zona creada");
      onOpenChange(false);
    } catch (error) {
      console.error("ZoneForm:", error);
      toast.danger("No se pudo guardar la zona");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <ResponsiveFormDialog
      open={open}
      onOpenChange={onOpenChange}
      title={zone ? `Editar ${zone.name}` : "Nueva zona de entrega"}
      description="La tarifa va en la moneda base; el cliente la ve convertida si cambia de moneda."
      footer={<FormFooter formId={FORM_ID} submitLabel={zone ? "Guardar" : "Crear zona"} isSubmitting={isSubmitting} onCancel={() => onOpenChange(false)} />}
    >
      <form id={FORM_ID} onSubmit={handleSubmit(onSubmit)} noValidate className="grid gap-4 sm:grid-cols-2">
        <FormTextField control={control} name="name" label="Nombre" placeholder="Centro" isRequired />
        <FormTextField control={control} name="etaLabel" label="Tiempo estimado" placeholder="24-48 h" />
        <FormTextField control={control} name="fee" label="Tarifa de envío" type="number" step="0.01" min={0} suffix={base.code} isRequired />
        <FormTextField control={control} name="freeShippingThreshold" label="Envío gratis desde" description="Vacío = usa el umbral general de la tienda." type="number" step="0.01" min={0} suffix={base.code} />
        <FormTextField control={control} name="description" label="Descripción" placeholder="Barrios que cubre" className="sm:col-span-2" />
        <FormTextField control={control} name="sortOrder" label="Orden" type="number" step="1" min={0} />
        <FormSwitch control={control} name="active" label="Activa" description="Solo las zonas activas se ofrecen en el checkout." />
      </form>
    </ResponsiveFormDialog>
  );
}
