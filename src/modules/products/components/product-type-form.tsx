"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { useFieldArray, useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button, toast } from "@heroui/react";
import { Plus, Trash2 } from "lucide-react";
import { FormFooter } from "@/components/form/form-footer";
import { FormSelect, FormSwitch, FormTextField, type SelectOption } from "@/components/form/fields";
import { ResponsiveFormDialog } from "@/components/responsive-form-dialog";
import { slugify } from "@/lib/slug";
import { createProductType, updateProductType } from "../actions/product-type-actions";
import {
  ATTRIBUTE_KIND_LABELS,
  ATTRIBUTE_KINDS,
  ATTRIBUTE_SCOPE_LABELS,
  ATTRIBUTE_SCOPES,
} from "../lib/attribute-schema";
import { productTypeSchema, type ProductTypeInput } from "../lib/schemas";
import type { ProductTypeRow } from "../queries/product-type-queries";

interface ProductTypeFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  type: ProductTypeRow | null;
}

const FORM_ID = "product-type-form";

const KIND_OPTIONS: SelectOption[] = ATTRIBUTE_KINDS.map((k) => ({ value: k, label: ATTRIBUTE_KIND_LABELS[k] }));
const SCOPE_OPTIONS: SelectOption[] = ATTRIBUTE_SCOPES.map((s) => ({ value: s, label: ATTRIBUTE_SCOPE_LABELS[s] }));

/** El formulario edita las opciones de un select como texto separado por
 *  comas; se convierte a array al enviar. La validación fuerte (claves
 *  únicas, select con opciones) la hace Zod en el servidor sobre el payload. */
const attributeRowSchema = z.object({
  key: z
    .string()
    .trim()
    .regex(/^[a-z][a-z0-9_]{0,30}$/, "Clave en minúsculas sin espacios (ej. talla)"),
  label: z.string().trim().min(1, "Escribe la etiqueta"),
  kind: z.enum(ATTRIBUTE_KINDS),
  optionsText: z.string(),
  required: z.boolean(),
  scope: z.enum(ATTRIBUTE_SCOPES),
});

const formSchema = productTypeSchema
  .omit({ attributeSchema: true })
  .extend({ attributes: z.array(attributeRowSchema) });

type FormInput = z.input<typeof formSchema>;
type FormValues = z.output<typeof formSchema>;

function toPayload(values: FormValues): ProductTypeInput {
  return {
    name: values.name,
    slug: values.slug,
    description: values.description,
    isActive: values.isActive,
    attributeSchema: values.attributes.map((a) => ({
      key: a.key,
      label: a.label,
      kind: a.kind,
      options:
        a.kind === "select"
          ? a.optionsText.split(",").map((o) => o.trim()).filter(Boolean)
          : undefined,
      required: a.required,
      scope: a.scope,
    })),
  };
}

export function ProductTypeForm({ open, onOpenChange, type }: ProductTypeFormProps) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [slugTouched, setSlugTouched] = useState(Boolean(type));
  const { control, handleSubmit, setValue, getValues } = useForm<FormInput, unknown, FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: type?.name ?? "",
      slug: type?.slug ?? "",
      description: type?.description ?? "",
      isActive: type?.isActive ?? true,
      attributes:
        type?.attributeSchema.map((a) => ({
          key: a.key,
          label: a.label,
          kind: a.kind,
          optionsText: a.options?.join(", ") ?? "",
          required: a.required,
          scope: a.scope,
        })) ?? [],
    },
  });
  const { fields, append, remove } = useFieldArray({ control, name: "attributes" });
  const kinds = useWatch({ control, name: "attributes" });

  const onSubmit = async (values: FormValues) => {
    setIsSubmitting(true);
    try {
      const payload = toPayload(values);
      const result = type
        ? await updateProductType(type.typeId, payload)
        : await createProductType(payload);
      if (!result.success) {
        toast.danger(result.error);
        return;
      }
      toast.success(type ? "Tipo actualizado" : "Tipo creado");
      onOpenChange(false);
      router.refresh();
    } catch (error) {
      console.error("ProductTypeForm:", error);
      toast.danger("No se pudo guardar el tipo de producto");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <ResponsiveFormDialog
      open={open}
      onOpenChange={onOpenChange}
      title={type ? `Editar ${type.name}` : "Nuevo tipo de producto"}
      description="Define qué atributos lleva cada producto de este tipo y cuáles distinguen a sus variantes (talla, color…)."
      size="lg"
      footer={
        <FormFooter
          formId={FORM_ID}
          submitLabel={type ? "Guardar" : "Crear tipo"}
          isSubmitting={isSubmitting}
          onCancel={() => onOpenChange(false)}
        />
      }
    >
      <form id={FORM_ID} onSubmit={handleSubmit(onSubmit)} noValidate className="flex flex-col gap-5">
        <div className="grid gap-4 sm:grid-cols-2">
          <div
            onBlur={() => {
              if (!slugTouched) setValue("slug", slugify(getValues("name")));
            }}
          >
            <FormTextField control={control} name="name" label="Nombre" placeholder="Ropa" isRequired />
          </div>
          <div onInput={() => setSlugTouched(true)}>
            <FormTextField control={control} name="slug" label="Slug" placeholder="ropa" isRequired />
          </div>
          <FormTextField control={control} name="description" label="Descripción" className="sm:col-span-2" />
          <FormSwitch control={control} name="isActive" label="Activo" description="Los tipos inactivos no se ofrecen al crear productos." className="sm:col-span-2" />
        </div>

        <div className="flex flex-col gap-3 border-t border-line pt-4">
          <div className="flex items-center justify-between gap-3">
            <p className="eyebrow">Atributos</p>
            <Button
              variant="secondary"
              size="sm"
              className="rounded-full"
              onPress={() =>
                append({ key: "", label: "", kind: "text", optionsText: "", required: false, scope: "product" })
              }
            >
              <Plus className="h-3.5 w-3.5" strokeWidth={2.2} />
              Añadir atributo
            </Button>
          </div>
          {fields.length === 0 && (
            <p className="text-[13px] text-slate-400">
              Sin atributos: los productos de este tipo solo tienen nombre, descripción, precio y stock.
            </p>
          )}
          {fields.map((field, index) => (
            <div key={field.id} className="rounded-field border border-line bg-page p-3.5">
              <div className="grid gap-3 sm:grid-cols-2">
                <FormTextField control={control} name={`attributes.${index}.label`} label="Etiqueta" placeholder="Talla" isRequired />
                <FormTextField control={control} name={`attributes.${index}.key`} label="Clave" placeholder="talla" isRequired />
                <FormSelect control={control} name={`attributes.${index}.kind`} label="Tipo de dato" options={KIND_OPTIONS} />
                <FormSelect control={control} name={`attributes.${index}.scope`} label="Se captura en" options={SCOPE_OPTIONS} />
                {kinds?.[index]?.kind === "select" && (
                  <FormTextField
                    control={control}
                    name={`attributes.${index}.optionsText`}
                    label="Opciones"
                    placeholder="S, M, L, XL"
                    description="Separadas por comas."
                    className="sm:col-span-2"
                  />
                )}
                <div className="flex items-center justify-between gap-3 sm:col-span-2">
                  <FormSwitch control={control} name={`attributes.${index}.required`} label="Obligatorio" />
                  <Button
                    variant="danger-soft"
                    size="sm"
                    isIconOnly
                    aria-label="Quitar atributo"
                    onPress={() => remove(index)}
                  >
                    <Trash2 className="h-4 w-4" strokeWidth={1.9} />
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </form>
    </ResponsiveFormDialog>
  );
}
