"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button, toast } from "@heroui/react";
import { FormTextField } from "@/components/form/fields";
import { ResponsiveFormDialog } from "@/components/responsive-form-dialog";
import { disableTwoFactor } from "../actions/two-factor-actions";
import { disableTwoFactorSchema, type DisableTwoFactorInput } from "../lib/schemas";

interface TwoFactorDisableDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const FORM_ID = "two-factor-disable-form";

export function TwoFactorDisableDialog({ open, onOpenChange }: TwoFactorDisableDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { control, handleSubmit, reset } = useForm<DisableTwoFactorInput>({
    resolver: zodResolver(disableTwoFactorSchema),
    defaultValues: { password: "" },
  });

  const close = (next: boolean) => {
    if (isSubmitting) return;
    if (!next) reset();
    onOpenChange(next);
  };

  const onSubmit = async (values: DisableTwoFactorInput) => {
    setIsSubmitting(true);
    try {
      const result = await disableTwoFactor(values);
      if (!result.success) {
        toast.danger(result.error);
        return;
      }
      toast.success("Verificación en dos pasos desactivada");
      reset();
      onOpenChange(false);
    } catch (error) {
      console.error("TwoFactorDisableDialog:", error);
      toast.danger("No se pudo desactivar la verificación. Inténtalo de nuevo.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <ResponsiveFormDialog
      open={open}
      onOpenChange={close}
      title="Desactivar la verificación en dos pasos"
      description="Confirma con tu contraseña. Después bastará la contraseña para entrar y tus códigos de respaldo dejarán de valer."
      size="sm"
      footer={
        <div className="flex w-full items-center justify-end gap-2">
          <Button variant="ghost" className="rounded-full" isDisabled={isSubmitting} onPress={() => close(false)}>
            Cancelar
          </Button>
          <Button
            type="submit"
            form={FORM_ID}
            variant="danger"
            className="rounded-full"
            isPending={isSubmitting}
            isDisabled={isSubmitting}
          >
            Desactivar
          </Button>
        </div>
      }
    >
      <form id={FORM_ID} onSubmit={handleSubmit(onSubmit)} noValidate className="flex flex-col gap-4">
        <FormTextField
          control={control}
          name="password"
          label="Contraseña"
          type="password"
          autoComplete="current-password"
          isRequired
        />
      </form>
    </ResponsiveFormDialog>
  );
}
