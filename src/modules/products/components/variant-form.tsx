"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "@heroui/react";
import { FormFooter } from "@/components/form/form-footer";
import { FormSelect, FormSwitch, FormTextField, type SelectOption } from "@/components/form/fields";
import { ResponsiveFormDialog } from "@/components/responsive-form-dialog";
import type { CurrencyInfo } from "@/lib/format";
import { useCurrency } from "@/modules/currency/store/currency-provider";
import { createVariant, updateVariant } from "../actions/variant-actions";
import type { AttributeDef } from "../lib/attribute-schema";
import { variantSchema, type VariantInput, type VariantValues } from "../lib/schemas";
import type { AdminVariantRow } from "../queries/product-queries";
import { AttributeFields, attributeDefaults } from "./attribute-fields";

interface VariantFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  productId: number;
  /** null = alta. */
  variant: AdminVariantRow | null;
  attributeSchema: AttributeDef[];
  currencies: CurrencyInfo[];
}

const FORM_ID = "variant-form";

export function VariantForm({
  open,
  onOpenChange,
  productId,
  variant,
  attributeSchema,
  currencies,
}: VariantFormProps) {
  const router = useRouter();
  const { base } = useCurrency();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const currencyOptions = useMemo<SelectOption[]>(
    () => currencies.map((c) => ({ value: String(c.currencyId), label: c.name ? `${c.code} · ${c.name}` : c.code })),
    [currencies]
  );
  const defaultCurrencyId =
    variant?.priceCurrency.currencyId ??
    (currencies.some((c) => c.currencyId === base.currencyId) ? base.currencyId : (currencies[0]?.currencyId ?? ""));

  const { control, handleSubmit } = useForm<VariantInput, unknown, VariantValues>({
    resolver: zodResolver(variantSchema),
    defaultValues: {
      productId,
      sku: variant?.sku ?? "",
      name: variant?.name ?? "",
      attributes: attributeDefaults(attributeSchema, "variant", variant?.attributes),
      price: variant?.price ?? "",
      compareAtPrice: variant?.compareAtPrice ?? "",
      priceCurrencyId: defaultCurrencyId,
      imageUrl: variant?.imageUrl ?? "",
      isDefault: variant?.isDefault ?? false,
      isActive: variant?.isActive ?? true,
      sortOrder: variant?.sortOrder ?? 0,
      // Solo cuenta en el alta; al editar, el stock se mueve con ajustes.
      initialStock: 0,
    },
  });

  const onSubmit = async (values: VariantValues) => {
    setIsSubmitting(true);
    try {
      const result = variant
        ? await updateVariant(variant.variantId, variant.version, values)
        : await createVariant(values);
      if (!result.success) {
        toast.danger(result.error);
        return;
      }
      toast.success(variant ? "Variante actualizada" : "Variante creada");
      onOpenChange(false);
      router.refresh();
    } catch (error) {
      console.error("VariantForm:", error);
      toast.danger("No se pudo guardar la variante");
    } finally {
      setIsSubmitting(false);
    }
  };

  const hasVariantAttributes = attributeSchema.some((def) => def.scope === "variant");

  return (
    <ResponsiveFormDialog
      open={open}
      onOpenChange={onOpenChange}
      title={variant ? `Editar ${variant.name ?? variant.sku}` : "Nueva variante"}
      description="El precio va en la moneda que elijas; la tienda lo convierte a la base con la tasa del día."
      size="lg"
      footer={
        <FormFooter
          formId={FORM_ID}
          submitLabel={variant ? "Guardar" : "Crear variante"}
          isSubmitting={isSubmitting}
          onCancel={() => onOpenChange(false)}
        />
      }
    >
      <form id={FORM_ID} onSubmit={handleSubmit(onSubmit)} noValidate className="flex flex-col gap-5">
        {hasVariantAttributes && (
          <div className="grid gap-4 sm:grid-cols-2">
            <AttributeFields control={control} schema={attributeSchema} scope="variant" />
          </div>
        )}

        <div className={hasVariantAttributes ? "grid gap-4 border-t border-line pt-4 sm:grid-cols-2" : "grid gap-4 sm:grid-cols-2"}>
          <FormTextField control={control} name="sku" label="SKU" placeholder="CAM-NEG-M" isRequired />
          <FormTextField
            control={control}
            name="name"
            label="Nombre"
            placeholder={hasVariantAttributes ? "Se deriva de los atributos" : "Opcional"}
          />
          <FormTextField control={control} name="price" label="Precio" type="number" step="0.01" min={0} isRequired />
          <FormSelect control={control} name="priceCurrencyId" label="Moneda del precio" options={currencyOptions} isRequired />
          <FormTextField
            control={control}
            name="compareAtPrice"
            label="Precio anterior"
            type="number"
            step="0.01"
            min={0}
            description="Opcional; se muestra tachado para marcar la rebaja."
          />
          {!variant && (
            <FormTextField
              control={control}
              name="initialStock"
              label="Stock inicial"
              type="number"
              step="1"
              min={0}
              description="Después se ajusta desde el botón Stock."
            />
          )}
          <FormTextField
            control={control}
            name="imageUrl"
            label="Imagen (URL)"
            type="url"
            placeholder="https://…"
            className="sm:col-span-2"
          />
          <FormTextField control={control} name="sortOrder" label="Orden" type="number" step="1" min={0} />
        </div>

        <div className="grid gap-3 border-t border-line pt-4 sm:grid-cols-2">
          <FormSwitch
            control={control}
            name="isDefault"
            label="Por defecto"
            description="La que se muestra al abrir el producto."
          />
          <FormSwitch
            control={control}
            name="isActive"
            label="Activa"
            description="Las inactivas no se venden ni aparecen en la tienda."
          />
        </div>
      </form>
    </ResponsiveFormDialog>
  );
}
