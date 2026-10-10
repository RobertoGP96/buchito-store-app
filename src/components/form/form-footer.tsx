"use client";

import { Button } from "@heroui/react";

interface FormFooterProps {
  formId: string;
  submitLabel: string;
  isSubmitting: boolean;
  onCancel: () => void;
}

/** Pie estándar de los diálogos de alta/edición: cancelar + guardar ligado
 *  al formulario por `form=` para que viva fuera del <form>. */
export function FormFooter({ formId, submitLabel, isSubmitting, onCancel }: FormFooterProps) {
  return (
    <div className="flex w-full items-center justify-end gap-2">
      <Button variant="ghost" onPress={onCancel} isDisabled={isSubmitting} className="rounded-full">
        Cancelar
      </Button>
      <Button
        type="submit"
        form={formId}
        variant="primary"
        isPending={isSubmitting}
        isDisabled={isSubmitting}
        className="rounded-full"
      >
        {submitLabel}
      </Button>
    </div>
  );
}
