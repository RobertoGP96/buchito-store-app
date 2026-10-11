"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "@heroui/react";
import { FormFooter } from "@/components/form/form-footer";
import { FormSelect, FormSwitch, FormTextField, type SelectOption } from "@/components/form/fields";
import { ResponsiveFormDialog } from "@/components/responsive-form-dialog";
import { createCourier, updateCourier } from "../actions/courier-actions";
import { VEHICLE_LABELS, VEHICLE_TYPES } from "../lib/labels";
import { courierSchema, type CourierInput, type CourierValues } from "../lib/schemas";
import type { CourierRow } from "../queries/courier-queries";

interface CourierFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  courier: CourierRow | null;
}

const FORM_ID = "courier-form";
const VEHICLE_OPTIONS: SelectOption[] = VEHICLE_TYPES.map((v) => ({ value: v, label: VEHICLE_LABELS[v] }));

export function CourierForm({ open, onOpenChange, courier }: CourierFormProps) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { control, handleSubmit } = useForm<CourierInput, unknown, CourierValues>({
    resolver: zodResolver(courierSchema),
    defaultValues: {
      fullName: courier?.fullName ?? "",
      email: courier?.email ?? "",
      password: "",
      phone: courier?.phone ?? "",
      vehicle: courier?.vehicle ?? "motorcycle",
      notes: courier?.notes ?? "",
      active: courier?.active ?? true,
    },
  });

  const onSubmit = async (values: CourierValues) => {
    setIsSubmitting(true);
    try {
      const result = courier
        ? await updateCourier(courier.courierId, courier.version, values)
        : await createCourier(values);
      if (!result.success) {
        toast.danger(result.error);
        return;
      }
      toast.success(courier ? "Mensajero actualizado" : "Mensajero creado");
      onOpenChange(false);
      router.refresh();
    } catch (error) {
      console.error("CourierForm:", error);
      toast.danger("No se pudo guardar el mensajero");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <ResponsiveFormDialog
      open={open}
      onOpenChange={onOpenChange}
      title={courier ? `Editar ${courier.fullName}` : "Nuevo mensajero"}
      description="El mensajero entra con su correo y contraseña en /mensajero para ver sus entregas."
      footer={<FormFooter formId={FORM_ID} submitLabel={courier ? "Guardar" : "Crear mensajero"} isSubmitting={isSubmitting} onCancel={() => onOpenChange(false)} />}
    >
      <form id={FORM_ID} onSubmit={handleSubmit(onSubmit)} noValidate className="grid gap-4 sm:grid-cols-2">
        <FormTextField control={control} name="fullName" label="Nombre" autoComplete="off" isRequired />
        <FormTextField control={control} name="phone" label="Teléfono" type="tel" autoComplete="off" isRequired />
        <FormTextField control={control} name="email" label="Correo (usuario)" type="email" autoComplete="off" isRequired />
        <FormTextField
          control={control}
          name="password"
          label={courier ? "Nueva contraseña" : "Contraseña"}
          description={courier ? "Vacío = no cambiar." : "Mínimo 8 caracteres."}
          type="password"
          autoComplete="new-password"
          isRequired={!courier}
        />
        <FormSelect control={control} name="vehicle" label="Vehículo" options={VEHICLE_OPTIONS} />
        <FormTextField control={control} name="notes" label="Notas" />
        <FormSwitch control={control} name="active" label="Activo" description="Un mensajero inactivo no puede entrar ni recibir entregas." className="sm:col-span-2" />
      </form>
    </ResponsiveFormDialog>
  );
}
