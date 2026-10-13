"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "@heroui/react";
import { FormFooter } from "@/components/form/form-footer";
import { FormTextField } from "@/components/form/fields";
import { ResponsiveFormDialog } from "@/components/responsive-form-dialog";
import { updateMyProfile } from "../actions/customer-actions";
import { customerProfileSchema, type CustomerProfileInput, type CustomerProfileValues } from "../lib/schemas";

export interface ProfileFormCustomer {
  fullName: string;
  phone: string;
}

interface ProfileFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  customer: ProfileFormCustomer;
}

const FORM_ID = "profile-form";

export function ProfileForm({ open, onOpenChange, customer }: ProfileFormProps) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { control, handleSubmit } = useForm<CustomerProfileInput, unknown, CustomerProfileValues>({
    resolver: zodResolver(customerProfileSchema),
    defaultValues: { fullName: customer.fullName, phone: customer.phone },
  });

  const onSubmit = async (values: CustomerProfileValues) => {
    setIsSubmitting(true);
    try {
      const result = await updateMyProfile(values);
      if (!result.success) {
        toast.danger(result.error);
        return;
      }
      toast.success("Datos guardados");
      onOpenChange(false);
      // La action no revalida rutas: cambia la cookie de sesión (el nombre
      // va en el token) y solo una petición nueva la lee. Este refresh es el
      // único re-render, con el menú y la página ya actualizados.
      router.refresh();
    } catch (error) {
      console.error("ProfileForm:", error);
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
      description="Tu nombre y teléfono van en cada pedido. El correo es tu usuario y no se cambia desde aquí."
      size="sm"
      footer={<FormFooter formId={FORM_ID} submitLabel="Guardar" isSubmitting={isSubmitting} onCancel={() => onOpenChange(false)} />}
    >
      <form id={FORM_ID} onSubmit={handleSubmit(onSubmit)} noValidate className="grid gap-4">
        <FormTextField control={control} name="fullName" label="Nombre completo" autoComplete="name" isRequired />
        <FormTextField
          control={control}
          name="phone"
          label="Teléfono"
          type="tel"
          autoComplete="tel"
          description="Te contactamos a este número por tus pedidos."
          isRequired
        />
      </form>
    </ResponsiveFormDialog>
  );
}
