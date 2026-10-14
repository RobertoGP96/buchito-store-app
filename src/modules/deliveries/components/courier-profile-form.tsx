"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "@heroui/react";
import { FormFooter } from "@/components/form/form-footer";
import { FormTextField } from "@/components/form/fields";
import { ResponsiveFormDialog } from "@/components/responsive-form-dialog";
import { updateMyCourierProfile } from "../actions/courier-actions";
import { courierProfileSchema, type CourierProfileInput, type CourierProfileValues } from "../lib/schemas";

export interface CourierProfileFormData {
  fullName: string;
  phone: string;
}

interface CourierProfileFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  profile: CourierProfileFormData;
}

const FORM_ID = "courier-profile-form";

export function CourierProfileForm({ open, onOpenChange, profile }: CourierProfileFormProps) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { control, handleSubmit } = useForm<CourierProfileInput, unknown, CourierProfileValues>({
    resolver: zodResolver(courierProfileSchema),
    defaultValues: { fullName: profile.fullName, phone: profile.phone },
  });

  const onSubmit = async (values: CourierProfileValues) => {
    setIsSubmitting(true);
    try {
      const result = await updateMyCourierProfile(values);
      if (!result.success) {
        toast.danger(result.error);
        return;
      }
      toast.success("Datos guardados");
      onOpenChange(false);
      // El nombre va en la cookie de sesión que la action acaba de reescribir:
      // este refresh es la primera petición que la lee (cabecera y página).
      router.refresh();
    } catch (error) {
      console.error("CourierProfileForm:", error);
      toast.danger("No se pudieron guardar tus datos");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <ResponsiveFormDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Editar mis datos"
      description="El teléfono es al que te llama la tienda. El correo, el vehículo y la tarifa los gestiona el administrador."
      size="sm"
      footer={<FormFooter formId={FORM_ID} submitLabel="Guardar" isSubmitting={isSubmitting} onCancel={() => onOpenChange(false)} />}
    >
      <form id={FORM_ID} onSubmit={handleSubmit(onSubmit)} noValidate className="grid gap-4">
        <FormTextField control={control} name="fullName" label="Nombre completo" autoComplete="name" isRequired />
        <FormTextField control={control} name="phone" label="Teléfono" type="tel" autoComplete="tel" isRequired />
      </form>
    </ResponsiveFormDialog>
  );
}
