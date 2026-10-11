"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "@heroui/react";
import { FormFooter } from "@/components/form/form-footer";
import { FormSelect, FormSwitch, FormTextField } from "@/components/form/fields";
import { ResponsiveFormDialog } from "@/components/responsive-form-dialog";
import { useCurrency } from "@/modules/currency/store/currency-provider";
import { createCoupon, updateCoupon } from "../actions/coupon-actions";
import { COUPON_KINDS, COUPON_KIND_LABELS } from "../lib/labels";
import { couponSchema, type CouponInput, type CouponValues } from "../lib/schemas";
import type { CouponRow } from "../queries/coupon-queries";

interface CouponFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  coupon: CouponRow | null;
}

const FORM_ID = "coupon-form";

const KIND_OPTIONS = COUPON_KINDS.map((kind) => ({ value: kind, label: COUPON_KIND_LABELS[kind] }));

/** ISO → "YYYY-MM-DD" en hora local, que es como lo guardó el admin. */
function toDayInput(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${mm}-${dd}`;
}

export function CouponForm({ open, onOpenChange, coupon }: CouponFormProps) {
  const router = useRouter();
  const { base } = useCurrency();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { control, handleSubmit } = useForm<CouponInput, unknown, CouponValues>({
    resolver: zodResolver(couponSchema),
    defaultValues: {
      code: coupon?.code ?? "",
      kind: coupon?.kind ?? "percent",
      value: coupon?.value ?? 0,
      minSubtotal: coupon?.minSubtotal ?? "",
      maxUses: coupon?.maxUses ?? "",
      startsAt: toDayInput(coupon?.startsAt ?? null),
      endsAt: toDayInput(coupon?.endsAt ?? null),
      isActive: coupon?.isActive ?? true,
    },
  });
  const kind = useWatch({ control, name: "kind" });
  const isPercent = kind === "percent";

  const onSubmit = async (values: CouponValues) => {
    setIsSubmitting(true);
    try {
      const result = coupon ? await updateCoupon(coupon.couponId, values) : await createCoupon(values);
      if (!result.success) {
        toast.danger(result.error);
        return;
      }
      toast.success(coupon ? "Cupón actualizado" : "Cupón creado");
      onOpenChange(false);
      router.refresh();
    } catch (error) {
      console.error("CouponForm:", error);
      toast.danger("No se pudo guardar el cupón");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <ResponsiveFormDialog
      open={open}
      onOpenChange={onOpenChange}
      title={coupon ? `Editar ${coupon.code}` : "Nuevo cupón"}
      description="El descuento se aplica al subtotal de productos, antes del envío y los recargos."
      footer={
        <FormFooter
          formId={FORM_ID}
          submitLabel={coupon ? "Guardar" : "Crear cupón"}
          isSubmitting={isSubmitting}
          onCancel={() => onOpenChange(false)}
        />
      }
    >
      <form id={FORM_ID} onSubmit={handleSubmit(onSubmit)} noValidate className="grid gap-4 sm:grid-cols-2">
        <FormTextField
          control={control}
          name="code"
          label="Código"
          placeholder="BIENVENIDA10"
          description="Letras, números y guiones. Se guarda en mayúsculas."
          autoComplete="off"
          isRequired
        />
        <FormSelect control={control} name="kind" label="Tipo" options={KIND_OPTIONS} isRequired />
        <FormTextField
          control={control}
          name="value"
          label="Descuento"
          type="number"
          step={isPercent ? "1" : "0.01"}
          min={0}
          suffix={isPercent ? "%" : base.code}
          isRequired
        />
        <FormTextField
          control={control}
          name="minSubtotal"
          label="Compra mínima"
          description="Vacío = sin mínimo."
          type="number"
          step="0.01"
          min={0}
          suffix={base.code}
        />
        <FormTextField
          control={control}
          name="maxUses"
          label="Límite de usos"
          description={coupon ? `Usado ${coupon.usedCount} veces. Vacío = ilimitado.` : "Vacío = ilimitado."}
          type="number"
          step="1"
          min={1}
        />
        <div className="hidden sm:block" />
        <FormTextField control={control} name="startsAt" label="Válido desde" description="Vacío = desde ya." type="date" />
        <FormTextField control={control} name="endsAt" label="Válido hasta" description="Incluye todo ese día. Vacío = sin fecha de fin." type="date" />
        <FormSwitch
          control={control}
          name="isActive"
          label="Activo"
          description="Un cupón inactivo no se puede usar aunque esté vigente."
          className="sm:col-span-2"
        />
      </form>
    </ResponsiveFormDialog>
  );
}
