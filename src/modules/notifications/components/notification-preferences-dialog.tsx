"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "@heroui/react";
import { FormSwitch } from "@/components/form/fields";
import { FormFooter } from "@/components/form/form-footer";
import { ResponsiveFormDialog } from "@/components/responsive-form-dialog";
import type { Role } from "@/lib/roles";
import { updateNotificationPreferences } from "../actions/notification-actions";
import { ROLE_CATEGORIES, categoryCopy, type NotificationCategory } from "../lib/labels";

interface NotificationPreferencesDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  role: Role;
  muted: NotificationCategory[];
}

type Values = Record<NotificationCategory, boolean>;

const FORM_ID = "notification-preferences-form";

/** Interruptores en positivo ("recibir"): apagado = categoría silenciada. */
export function NotificationPreferencesDialog({ open, onOpenChange, role, muted }: NotificationPreferencesDialogProps) {
  const categories = ROLE_CATEGORIES[role];
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { control, handleSubmit } = useForm<Values>({
    defaultValues: {
      orders: !muted.includes("orders"),
      deliveries: !muted.includes("deliveries"),
      payments: !muted.includes("payments"),
      stock: !muted.includes("stock"),
    },
  });

  const onSubmit = async (values: Values) => {
    setIsSubmitting(true);
    try {
      const result = await updateNotificationPreferences({ muted: categories.filter((c) => !values[c]) });
      if (!result.success) {
        toast.danger(result.error);
        return;
      }
      toast.success("Preferencias guardadas");
      onOpenChange(false);
    } catch (error) {
      console.error("NotificationPreferencesDialog:", error);
      toast.danger("No se pudieron guardar tus preferencias");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <ResponsiveFormDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Avisos que quieres recibir"
      description="Los avisos que apagues no se generan y no podrás verlos más tarde."
      size="sm"
      footer={
        <FormFooter formId={FORM_ID} submitLabel="Guardar" isSubmitting={isSubmitting} onCancel={() => onOpenChange(false)} />
      }
    >
      <form id={FORM_ID} onSubmit={handleSubmit(onSubmit)} noValidate className="grid gap-5">
        {categories.map((category) => {
          const copy = categoryCopy(role, category);
          return (
            <FormSwitch
              key={category}
              control={control}
              name={category}
              label={copy.label}
              description={copy.description}
            />
          );
        })}
      </form>
    </ResponsiveFormDialog>
  );
}
