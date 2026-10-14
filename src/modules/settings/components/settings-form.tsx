"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button, toast } from "@heroui/react";
import { FormSelect, FormSwitch, FormTextField, type SelectOption } from "@/components/form/fields";
import { updateStoreSettings } from "../actions/settings-actions";
import { storeSettingsSchema, type StoreSettingsInput, type StoreSettingsValues } from "../lib/schemas";
import type { StoreSettingsData } from "../queries/settings-queries";

interface SettingsFormProps {
  settings: StoreSettingsData;
  currencies: SelectOption[];
}

export function SettingsForm({ settings, currencies }: SettingsFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const baseCode = settings.baseCurrency?.code ?? "";

  const { control, handleSubmit } = useForm<StoreSettingsInput, unknown, StoreSettingsValues>({
    resolver: zodResolver(storeSettingsSchema),
    defaultValues: {
      storeName: settings.storeName,
      baseCurrencyId: settings.baseCurrency?.currencyId ?? "",
      phone: settings.phone ?? "",
      whatsappPhone: settings.whatsappPhone ?? "",
      email: settings.email ?? "",
      address: settings.address ?? "",
      orderPrefix: settings.orderPrefix,
      defaultShippingFee: settings.defaultShippingFee,
      freeShippingThreshold: settings.freeShippingThreshold ?? "",
      lowStockThreshold: settings.lowStockThreshold,
      allowPickup: settings.allowPickup,
    },
  });

  const onSubmit = async (values: StoreSettingsValues) => {
    setIsSubmitting(true);
    try {
      const result = await updateStoreSettings(values);
      if (!result.success) {
        toast.danger(result.error);
        return;
      }
      toast.success("Configuración guardada");
    } catch (error) {
      console.error("SettingsForm:", error);
      toast.danger("No se pudo guardar la configuración");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="flex flex-col gap-6">
      <section className="rounded-card bg-canvas p-5 shadow-card md:p-6">
        <p className="eyebrow">Tienda</p>
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <FormTextField control={control} name="storeName" label="Nombre" isRequired />
          <FormSelect
            control={control}
            name="baseCurrencyId"
            label="Moneda base"
            description="Todo lo contable (pedidos, envíos, cobros) se guarda en esta moneda."
            options={currencies}
            isRequired
          />
          <FormTextField control={control} name="phone" label="Teléfono" type="tel" />
          <FormTextField
            control={control}
            name="whatsappPhone"
            label="WhatsApp para coordinar pagos"
            type="tel"
            description="Con código de país, p. ej. +53 5 123 4567. Tras hacer su pedido el cliente ve un botón para escribirte; el número no se imprime en la tienda, solo lo ve al abrir el chat. Vacío = sin paso de WhatsApp."
          />
          <FormTextField control={control} name="email" label="Correo" type="email" />
          <FormTextField control={control} name="address" label="Dirección" className="md:col-span-2" />
        </div>
      </section>

      <section className="rounded-card bg-canvas p-5 shadow-card md:p-6">
        <p className="eyebrow">Pedidos y envío</p>
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <FormTextField
            control={control}
            name="orderPrefix"
            label="Prefijo de pedido"
            description="Los pedidos se numeran PED-00001, PED-00002…"
            isRequired
          />
          <FormTextField
            control={control}
            name="lowStockThreshold"
            label="Umbral de stock bajo"
            type="number"
            step="1"
            min={0}
            suffix="uds."
          />
          <FormTextField
            control={control}
            name="defaultShippingFee"
            label="Envío por defecto"
            description="Se usa cuando la dirección no tiene zona."
            type="number"
            step="0.01"
            min={0}
            suffix={baseCode}
          />
          <FormTextField
            control={control}
            name="freeShippingThreshold"
            label="Envío gratis desde"
            description="Vacío = nunca."
            type="number"
            step="0.01"
            min={0}
            suffix={baseCode}
          />
          <FormSwitch
            control={control}
            name="allowPickup"
            label="Permitir recogida en tienda"
            description="El cliente puede elegir recoger el pedido en lugar de envío a domicilio."
            className="md:col-span-2"
          />
        </div>
      </section>

      <div className="flex justify-end">
        <Button
          type="submit"
          variant="primary"
          isPending={isSubmitting}
          isDisabled={isSubmitting}
          className="rounded-full"
        >
          Guardar cambios
        </Button>
      </div>
    </form>
  );
}
