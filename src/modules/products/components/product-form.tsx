"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button, toast } from "@heroui/react";
import { ButtonLink } from "@/components/button-link";
import { FormSelect, FormSwitch, FormTextArea, FormTextField, type SelectOption } from "@/components/form/fields";
import { slugify } from "@/lib/slug";
import { createProduct, updateProduct } from "../actions/product-actions";
import type { AttributeDef } from "../lib/attribute-schema";
import { PRODUCT_STATUS_META, PRODUCT_STATUSES } from "../lib/labels";
import { productSchema, type ProductInput, type ProductValues } from "../lib/schemas";
import type { AdminProductDetail } from "../queries/product-queries";
import { AttributeFields, attributeDefaults } from "./attribute-fields";

export interface ProductTypeOption {
  typeId: number;
  name: string;
  attributeSchema: AttributeDef[];
  isActive: boolean;
}

export interface CategoryOption {
  categoryId: number;
  name: string;
  depth: number;
  isActive: boolean;
}

interface ProductFormProps {
  /** null = alta. */
  product: AdminProductDetail | null;
  types: ProductTypeOption[];
  categories: CategoryOption[];
}

const FORM_ID = "product-form";

// Un producto recién creado no tiene variantes y la action rechaza publicarlo:
// en el alta solo se ofrecen los estados que puede tomar.
const CREATE_STATUS_OPTIONS: SelectOption[] = PRODUCT_STATUSES.filter((status) => status !== "active").map(
  (status) => ({ value: status, label: PRODUCT_STATUS_META[status].label })
);

/** Alta y edición de producto en página (no diálogo): el producto tiene
 *  demasiados campos y, en edición, convive con la lista de variantes. */
export function ProductForm({ product, types, categories }: ProductFormProps) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [slugTouched, setSlugTouched] = useState(Boolean(product));

  const typeOptions = useMemo<SelectOption[]>(
    () =>
      types
        // Un tipo inactivo sigue siendo elegible solo si el producto ya lo usa.
        .filter((t) => t.isActive || t.typeId === product?.typeId)
        .map((t) => ({ value: String(t.typeId), label: t.name })),
    [types, product?.typeId]
  );
  const categoryOptions = useMemo<SelectOption[]>(
    () => [
      { value: "", label: "Sin categoría" },
      ...categories
        .filter((c) => c.isActive || c.categoryId === product?.categoryId)
        .map((c) => ({ value: String(c.categoryId), label: `${"— ".repeat(c.depth)}${c.name}` })),
    ],
    [categories, product?.categoryId]
  );

  const initialSchema = product?.type.attributeSchema ?? [];
  const { control, handleSubmit, setValue, getValues } = useForm<ProductInput, unknown, ProductValues>({
    resolver: zodResolver(productSchema),
    defaultValues: {
      typeId: product?.typeId ?? (typeOptions.length === 1 ? Number(typeOptions[0].value) : ""),
      categoryId: product?.categoryId ?? "",
      name: product?.name ?? "",
      slug: product?.slug ?? "",
      description: product?.description ?? "",
      attributes: attributeDefaults(initialSchema, "product", product?.attributes),
      status: product?.status ?? "draft",
      featured: product?.featured ?? false,
      sortOrder: product?.sortOrder ?? 0,
    },
  });

  const typeIdValue = useWatch({ control, name: "typeId" });
  const selectedTypeId = typeIdValue === "" || typeIdValue == null ? null : Number(typeIdValue);
  const schema = useMemo(
    () => types.find((t) => t.typeId === selectedTypeId)?.attributeSchema ?? [],
    [types, selectedTypeId]
  );

  // Al cambiar de tipo, los atributos del tipo anterior no tienen sentido:
  // se reinician a vacío (o a los guardados si se vuelve al tipo original).
  const previousTypeId = useRef(selectedTypeId);
  useEffect(() => {
    if (previousTypeId.current === selectedTypeId) return;
    previousTypeId.current = selectedTypeId;
    const saved = selectedTypeId === product?.typeId ? product?.attributes : undefined;
    setValue("attributes", attributeDefaults(schema, "product", saved));
  }, [selectedTypeId, schema, product, setValue]);

  const onSubmit = async (values: ProductValues) => {
    setIsSubmitting(true);
    try {
      if (product) {
        const result = await updateProduct(product.productId, product.version, values);
        if (!result.success) {
          toast.danger(result.error);
          return;
        }
        toast.success("Producto actualizado");
        router.refresh();
        return;
      }
      const result = await createProduct(values);
      if (!result.success) {
        toast.danger(result.error);
        return;
      }
      toast.success("Producto creado. Ahora añade sus variantes.");
      router.push(`/admin/productos/${result.data.productId}`);
    } catch (error) {
      console.error("ProductForm:", error);
      toast.danger("No se pudo guardar el producto");
    } finally {
      setIsSubmitting(false);
    }
  };

  const productAttributeCount = schema.filter((def) => def.scope === "product").length;
  // Las variantes guardan atributos del tipo actual; cambiarlo las dejaría huérfanas.
  const typeLocked = (product?.variants.length ?? 0) > 0;

  return (
    <section className="rounded-card bg-canvas p-5 shadow-card">
      <p className="eyebrow">{product ? "Datos del producto" : "Nuevo producto"}</p>
      <form id={FORM_ID} onSubmit={handleSubmit(onSubmit)} noValidate className="mt-4 flex flex-col gap-5">
        <div className="grid gap-4 sm:grid-cols-2">
          <FormSelect
            control={control}
            name="typeId"
            label="Tipo de producto"
            placeholder="Elige el tipo"
            options={typeOptions}
            isRequired
            isDisabled={typeLocked}
            description={
              typeLocked
                ? "No se puede cambiar el tipo de un producto con variantes."
                : "Define qué atributos lleva el producto y sus variantes."
            }
          />
          <FormSelect
            control={control}
            name="categoryId"
            label="Categoría"
            placeholder="Sin categoría"
            options={categoryOptions}
          />
          <div
            onBlur={() => {
              if (!slugTouched) setValue("slug", slugify(getValues("name")));
            }}
          >
            <FormTextField control={control} name="name" label="Nombre" placeholder="Camisa básica" isRequired />
          </div>
          <div onInput={() => setSlugTouched(true)}>
            <FormTextField
              control={control}
              name="slug"
              label="Slug"
              placeholder="camisa-basica"
              description="Forma parte de la URL en la tienda. Vacío: se genera a partir del nombre."
            />
          </div>
          <FormTextArea
            control={control}
            name="description"
            label="Descripción"
            placeholder="Lo que el cliente verá en la ficha del producto."
            className="sm:col-span-2"
          />
        </div>

        {productAttributeCount > 0 && (
          <div className="flex flex-col gap-3 border-t border-line pt-4">
            <p className="eyebrow">Atributos del producto</p>
            <div className="grid gap-4 sm:grid-cols-2">
              <AttributeFields control={control} schema={schema} scope="product" />
            </div>
          </div>
        )}

        <div className="grid gap-4 border-t border-line pt-4 sm:grid-cols-2">
          {!product && (
            <FormSelect
              control={control}
              name="status"
              label="Estado"
              options={CREATE_STATUS_OPTIONS}
              description="Podrás publicarlo cuando tenga al menos una variante."
            />
          )}
          <FormTextField
            control={control}
            name="sortOrder"
            label="Orden"
            type="number"
            step="1"
            min={0}
            description="Menor número, antes en el catálogo."
          />
          <FormSwitch
            control={control}
            name="featured"
            label="Destacado"
            description="Aparece en la portada de la tienda."
            className="sm:col-span-2"
          />
        </div>

        <div className="flex flex-wrap items-center justify-end gap-2 border-t border-line pt-4">
          {!product && (
            <ButtonLink href="/admin/productos" variant="ghost" size="sm">
              Cancelar
            </ButtonLink>
          )}
          <Button
            type="submit"
            form={FORM_ID}
            variant="primary"
            className="rounded-full"
            isPending={isSubmitting}
            isDisabled={isSubmitting}
          >
            {product ? "Guardar cambios" : "Crear producto"}
          </Button>
        </div>
      </form>
    </section>
  );
}
