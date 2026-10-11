"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "@heroui/react";
import { FormFooter } from "@/components/form/form-footer";
import { FormSelect, FormSwitch, FormTextField, type SelectOption } from "@/components/form/fields";
import { ResponsiveFormDialog } from "@/components/responsive-form-dialog";
import { slugify } from "@/lib/slug";
import { createCategory, updateCategory } from "../actions/category-actions";
import { categorySchema, type CategoryInput, type CategoryValues } from "../lib/schemas";
import type { CategoryRow } from "../queries/category-queries";

interface CategoryFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  category: CategoryRow | null;
  /** Posibles padres (sin la propia categoría ni sus hijas). */
  parentOptions: SelectOption[];
}

const FORM_ID = "category-form";

export function CategoryForm({ open, onOpenChange, category, parentOptions }: CategoryFormProps) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [slugTouched, setSlugTouched] = useState(Boolean(category));
  const { control, handleSubmit, setValue, getValues } = useForm<CategoryInput, unknown, CategoryValues>({
    resolver: zodResolver(categorySchema),
    defaultValues: {
      name: category?.name ?? "",
      slug: category?.slug ?? "",
      parentId: category?.parentId ?? "",
      description: category?.description ?? "",
      sortOrder: category?.sortOrder ?? 0,
      isActive: category?.isActive ?? true,
    },
  });

  const onSubmit = async (values: CategoryValues) => {
    setIsSubmitting(true);
    try {
      const result = category
        ? await updateCategory(category.categoryId, values)
        : await createCategory(values);
      if (!result.success) {
        toast.danger(result.error);
        return;
      }
      toast.success(category ? "Categoría actualizada" : "Categoría creada");
      onOpenChange(false);
      router.refresh();
    } catch (error) {
      console.error("CategoryForm:", error);
      toast.danger("No se pudo guardar la categoría");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <ResponsiveFormDialog
      open={open}
      onOpenChange={onOpenChange}
      title={category ? `Editar ${category.name}` : "Nueva categoría"}
      footer={
        <FormFooter
          formId={FORM_ID}
          submitLabel={category ? "Guardar" : "Crear categoría"}
          isSubmitting={isSubmitting}
          onCancel={() => onOpenChange(false)}
        />
      }
    >
      <form id={FORM_ID} onSubmit={handleSubmit(onSubmit)} noValidate className="grid gap-4 sm:grid-cols-2">
        <div
          onBlur={() => {
            if (!slugTouched) setValue("slug", slugify(getValues("name")));
          }}
        >
          <FormTextField control={control} name="name" label="Nombre" placeholder="Alimentos" isRequired />
        </div>
        <div onInput={() => setSlugTouched(true)}>
          <FormTextField control={control} name="slug" label="Slug" placeholder="alimentos" isRequired />
        </div>
        <FormSelect
          control={control}
          name="parentId"
          label="Categoría padre"
          placeholder="Ninguna (raíz)"
          options={[{ value: "", label: "Ninguna (raíz)" }, ...parentOptions]}
        />
        <FormTextField control={control} name="sortOrder" label="Orden" type="number" step="1" min={0} />
        <FormTextField control={control} name="description" label="Descripción" className="sm:col-span-2" />
        <FormSwitch control={control} name="isActive" label="Activa" description="Las categorías inactivas no se muestran en la tienda." className="sm:col-span-2" />
      </form>
    </ResponsiveFormDialog>
  );
}
