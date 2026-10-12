"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { useFieldArray, useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button, toast } from "@heroui/react";
import { Plus, Trash2 } from "lucide-react";
import { ButtonLink } from "@/components/button-link";
import { FormSelect, FormSwitch, FormTextArea, FormTextField, type SelectOption } from "@/components/form/fields";
import { FormImageField } from "@/components/form/image-field";
import { Money } from "@/components/money";
import type { CurrencyInfo } from "@/lib/format";
import { roundToCurrency } from "@/lib/currency-math";
import { slugify } from "@/lib/slug";
import { useCurrency } from "@/modules/currency/store/currency-provider";
import { PRODUCT_STATUS_META, PRODUCT_STATUSES } from "@/modules/products/lib/labels";
import { createCombo, updateCombo } from "../actions/combo-actions";
import { comboRegularPrice, comboSavingsPct } from "../lib/combo-pricing";
import { comboSchema, type ComboInput, type ComboValues } from "../lib/schemas";
import type { AdminComboRow, ComboVariantOption } from "../queries/combo-queries";

interface ComboFormProps {
  /** null = alta. */
  combo: AdminComboRow | null;
  variants: ComboVariantOption[];
  currencies: CurrencyInfo[];
}

const FORM_ID = "combo-form";

// Un combo recién creado se publica desde su ficha, igual que un producto.
const CREATE_STATUS_OPTIONS: SelectOption[] = PRODUCT_STATUSES.filter((s) => s !== "active").map((status) => ({
  value: status,
  label: PRODUCT_STATUS_META[status].label,
}));

/** ISO → "YYYY-MM-DD" en hora local, que es como lo guardó el admin. */
function toDayInput(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${mm}-${dd}`;
}

function variantLabel(v: ComboVariantOption): string {
  return v.variantName ? `${v.productName} · ${v.variantName}` : v.productName;
}

/** Alta y edición de combo en página: el formulario convive con la lista de
 *  componentes (producto + cantidad), que se guarda junto con el resto. */
export function ComboForm({ combo, variants, currencies }: ComboFormProps) {
  const router = useRouter();
  const { base, rates, formatBase } = useCurrency();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [slugTouched, setSlugTouched] = useState(Boolean(combo));

  const currencyOptions = useMemo<SelectOption[]>(
    () => currencies.map((c) => ({ value: String(c.currencyId), label: c.name ? `${c.code} · ${c.name}` : c.code })),
    [currencies]
  );
  const variantOptions = useMemo<SelectOption[]>(
    () =>
      variants.map((v) => ({
        value: String(v.variantId),
        label: variantLabel(v),
        description: `${v.sku} · stock ${v.stock}${v.priceBase != null ? ` · ${formatBase(v.priceBase)}` : ""}${v.sellable ? "" : " · no se vende"}`,
      })),
    [variants, formatBase]
  );
  const byId = useMemo(() => new Map(variants.map((v) => [v.variantId, v])), [variants]);

  const defaultCurrencyId =
    combo?.priceCurrency.currencyId ??
    (currencies.some((c) => c.currencyId === base.currencyId) ? base.currencyId : (currencies[0]?.currencyId ?? ""));

  const { control, handleSubmit, setValue, getValues } = useForm<ComboInput, unknown, ComboValues>({
    resolver: zodResolver(comboSchema),
    defaultValues: {
      name: combo?.name ?? "",
      slug: combo?.slug ?? "",
      description: combo?.description ?? "",
      imageUrl: combo?.imageUrl ?? "",
      price: combo?.price ?? "",
      priceCurrencyId: defaultCurrencyId,
      status: combo?.status ?? "draft",
      featured: combo?.featured ?? false,
      startsAt: toDayInput(combo?.startsAt ?? null),
      endsAt: toDayInput(combo?.endsAt ?? null),
      sortOrder: combo?.sortOrder ?? 0,
      items: combo?.items.map((i) => ({ variantId: String(i.variantId), qty: i.qty })) ?? [{ variantId: "", qty: 1 }],
    },
  });
  const { fields, append, remove } = useFieldArray({ control, name: "items" });

  const items = useWatch({ control, name: "items" });
  const priceRaw = useWatch({ control, name: "price" });
  const priceCurrencyRaw = useWatch({ control, name: "priceCurrencyId" });

  // Resumen en vivo: precio regular de los componentes frente al del combo.
  const summary = useMemo(() => {
    const priced = (items ?? [])
      .map((item) => ({ variant: byId.get(Number(item?.variantId)), qty: Number(item?.qty) || 0 }))
      .filter((i) => i.variant && i.qty > 0);
    const known = priced.every((i) => i.variant!.priceBase != null);
    const regular = known
      ? comboRegularPrice(priced.map((i) => ({ qty: i.qty, unitPriceBase: i.variant!.priceBase ?? 0 })), base.decimalPlaces)
      : null;
    const rate = rates[Number(priceCurrencyRaw)];
    const price = Number(priceRaw);
    const priceBase = rate && priceRaw !== "" && Number.isFinite(price) ? roundToCurrency(price * rate, base.decimalPlaces) : null;
    return {
      count: priced.length,
      regular,
      priceBase,
      savings: regular != null && priceBase != null ? comboSavingsPct(priceBase, regular) : 0,
    };
  }, [items, byId, base.decimalPlaces, rates, priceCurrencyRaw, priceRaw]);

  const onSubmit = async (values: ComboValues) => {
    setIsSubmitting(true);
    try {
      if (combo) {
        const result = await updateCombo(combo.comboId, combo.version, values);
        if (!result.success) {
          toast.danger(result.error);
          return;
        }
        toast.success("Combo actualizado");
        return;
      }
      const result = await createCombo(values);
      if (!result.success) {
        toast.danger(result.error);
        return;
      }
      toast.success("Combo creado. Publícalo cuando esté listo.");
      router.push(`/admin/combos/${result.data.comboId}`);
    } catch (error) {
      console.error("ComboForm:", error);
      toast.danger("No se pudo guardar el combo");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <section className="rounded-card bg-canvas p-5 shadow-card">
      <p className="eyebrow">{combo ? "Datos del combo" : "Nuevo combo"}</p>
      <form id={FORM_ID} onSubmit={handleSubmit(onSubmit)} noValidate className="mt-4 flex flex-col gap-5">
        <div className="grid gap-4 sm:grid-cols-2">
          <div
            onBlur={() => {
              if (!slugTouched) setValue("slug", slugify(getValues("name")));
            }}
          >
            <FormTextField control={control} name="name" label="Nombre" placeholder="Combo desayuno" isRequired />
          </div>
          <div onInput={() => setSlugTouched(true)}>
            <FormTextField
              control={control}
              name="slug"
              label="Slug"
              placeholder="combo-desayuno"
              description="Forma parte de la URL en la tienda. Vacío: se genera a partir del nombre."
            />
          </div>
          <FormTextArea
            control={control}
            name="description"
            label="Descripción"
            placeholder="Qué incluye y para quién es."
            className="sm:col-span-2"
          />
          <FormImageField
            control={control}
            name="imageUrl"
            label="Foto del combo"
            scope="combos"
            description="Opcional: sin foto se usa la del primer producto."
            className="sm:col-span-2"
          />
        </div>

        <div className="flex flex-col gap-3 border-t border-line pt-4">
          <div className="flex items-center justify-between gap-3">
            <p className="eyebrow">Productos del combo</p>
            <Button
              variant="ghost"
              size="sm"
              className="rounded-full"
              onPress={() => append({ variantId: "", qty: 1 })}
            >
              <Plus className="h-4 w-4" strokeWidth={2.2} />
              Añadir producto
            </Button>
          </div>
          <ul className="flex flex-col gap-3">
            {fields.map((field, index) => (
              <li key={field.id} className="grid grid-cols-[minmax(0,1fr)_84px_auto] items-start gap-2 sm:gap-3">
                <FormSelect
                  control={control}
                  name={`items.${index}.variantId`}
                  label={index === 0 ? "Producto" : `Producto ${index + 1}`}
                  placeholder="Elige un producto"
                  options={variantOptions}
                  isRequired
                />
                <FormTextField control={control} name={`items.${index}.qty`} label="Cant." type="number" step="1" min={1} isRequired />
                <Button
                  variant="ghost"
                  size="sm"
                  isIconOnly
                  aria-label="Quitar producto"
                  className="mt-7 rounded-full text-slate-400 hover:text-danger"
                  isDisabled={fields.length === 1}
                  onPress={() => remove(index)}
                >
                  <Trash2 className="h-4 w-4" strokeWidth={1.9} />
                </Button>
              </li>
            ))}
          </ul>
        </div>

        <div className="grid gap-4 border-t border-line pt-4 sm:grid-cols-2">
          <FormTextField control={control} name="price" label="Precio del combo" type="number" step="0.01" min={0} isRequired />
          <FormSelect control={control} name="priceCurrencyId" label="Moneda del precio" options={currencyOptions} isRequired />
          <div className="rounded-field bg-page px-4 py-3 text-[13px] text-slate-500 sm:col-span-2">
            {summary.count === 0 ? (
              "Añade productos para ver cuánto ahorra el cliente."
            ) : summary.regular == null ? (
              "Algún producto no tiene tasa a la moneda base: no se puede calcular el ahorro."
            ) : (
              <>
                Por separado: <Money value={summary.regular} className="font-semibold text-ink" />
                {summary.priceBase != null && (
                  <>
                    {" · "}Combo: <Money value={summary.priceBase} className="font-semibold text-ink" />
                    {" · "}
                    {summary.savings > 0 ? (
                      <span className="font-semibold text-ok">Ahorra {summary.savings} %</span>
                    ) : (
                      <span className="font-semibold text-warn">No ahorra frente a comprar por separado</span>
                    )}
                  </>
                )}
              </>
            )}
          </div>
        </div>

        <div className="grid gap-4 border-t border-line pt-4 sm:grid-cols-2">
          {!combo && (
            <FormSelect
              control={control}
              name="status"
              label="Estado"
              options={CREATE_STATUS_OPTIONS}
              description="Se publica desde su ficha una vez revisado."
            />
          )}
          <FormTextField control={control} name="sortOrder" label="Orden" type="number" step="1" min={0} description="Menor número, antes en la lista." />
          <FormTextField control={control} name="startsAt" label="Válido desde" description="Vacío = desde ya." type="date" />
          <FormTextField control={control} name="endsAt" label="Válido hasta" description="Incluye todo ese día. Vacío = sin fecha de fin." type="date" />
          <FormSwitch
            control={control}
            name="featured"
            label="Destacado"
            description="Aparece en la portada de la tienda."
            className="sm:col-span-2"
          />
        </div>

        <div className="flex flex-wrap items-center justify-end gap-2 border-t border-line pt-4">
          {!combo && (
            <ButtonLink href="/admin/combos" variant="ghost" size="sm">
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
            {combo ? "Guardar cambios" : "Crear combo"}
          </Button>
        </div>
      </form>
    </section>
  );
}
