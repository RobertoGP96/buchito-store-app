"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button, toast } from "@heroui/react";
import { FormTextArea } from "@/components/form/fields";
import { updateCustomerNotes } from "../actions/customer-actions";
import { customerNotesSchema, type CustomerNotesInput, type CustomerNotesValues } from "../lib/schemas";

interface CustomerNotesFormProps {
  customerId: number;
  notes: string | null;
}

export function CustomerNotesForm({ customerId, notes }: CustomerNotesFormProps) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { control, handleSubmit, formState } = useForm<CustomerNotesInput, unknown, CustomerNotesValues>({
    resolver: zodResolver(customerNotesSchema),
    defaultValues: { notes: notes ?? "" },
  });

  const onSubmit = async (values: CustomerNotesValues) => {
    setIsSubmitting(true);
    try {
      const result = await updateCustomerNotes(customerId, values.notes);
      if (!result.success) {
        toast.danger(result.error);
        return;
      }
      toast.success("Notas guardadas");
      router.refresh();
    } catch (error) {
      console.error("CustomerNotesForm:", error);
      toast.danger("No se pudieron guardar las notas");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="flex flex-col gap-3">
      <FormTextArea
        control={control}
        name="notes"
        label="Notas internas"
        description="Solo las ve el equipo; el cliente nunca las verá."
        placeholder="Preferencias, avisos de entrega, incidencias…"
        rows={4}
      />
      <div className="flex justify-end">
        <Button
          type="submit"
          variant="primary"
          size="sm"
          className="rounded-full"
          isPending={isSubmitting}
          isDisabled={isSubmitting || !formState.isDirty}
        >
          Guardar notas
        </Button>
      </div>
    </form>
  );
}
