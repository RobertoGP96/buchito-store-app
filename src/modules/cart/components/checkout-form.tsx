"use client";

import { useRouter } from "next/navigation";
import { useMemo, useRef, useState } from "react";
import { Controller, useForm, useWatch, type FieldErrors, type Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button, toast } from "@heroui/react";
import { ClipboardList } from "lucide-react";
import { ChoiceChips } from "@/components/choice-chips";
import { EmptyState } from "@/components/empty-state";
import { FormSelect, FormTextArea, FormTextField } from "@/components/form/fields";
import { useCurrency } from "@/modules/currency/store/currency-provider";
import type { ZoneRow } from "@/modules/deliveries/queries/zone-queries";
import { createOrder } from "@/modules/orders/actions/order-actions";
import { createOrderSchema, type CreateOrderInput, type CreateOrderValues } from "@/modules/orders/lib/schemas";
import { PaymentMethodPicker } from "@/modules/payments/components/payment-method-picker";
import type { PaymentMethodRow } from "@/modules/payments/queries/payment-queries";
import { computeCartTotals } from "../cart-totals";
import { useCart } from "../store";
import { CartSummary } from "./cart-summary";

interface CheckoutFormProps {
  zones: ZoneRow[];
  paymentMethods: PaymentMethodRow[];
  defaultShippingFee: number;
  freeShippingThreshold: number | null;
  allowPickup: boolean;
  prefill: { name: string; phone: string; email: string } | null;
}

export function CheckoutForm({
  zones,
  paymentMethods,
  defaultShippingFee,
  freeShippingThreshold,
  allowPickup,
  prefill,
}: CheckoutFormProps) {
  const router = useRouter();
  const { state, clearCart } = useCart();
  const { base, rates } = useCurrency();
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Las líneas viven en el carrito, no en el formulario, y en recogida la
  // dirección/zona no aplican: se ajustan antes de validar para que el schema
  // del servidor sea también el del cliente.
  const linesRef = useRef(state.lines);
  linesRef.current = state.lines;
  const resolver = useMemo<Resolver<CreateOrderInput, unknown, CreateOrderValues>>(() => {
    const base = zodResolver(createOrderSchema);
    return (values, context, options) =>
      base(
        {
          ...values,
          address: values.fulfillment === "pickup" ? null : values.address,
          zoneId: values.fulfillment === "pickup" ? "" : values.zoneId,
          lines: linesRef.current.map((l) => ({ variantId: l.variantId, qty: l.qty })),
        },
        context,
        options
      );
  }, []);

  const { control, handleSubmit, setValue } = useForm<CreateOrderInput, unknown, CreateOrderValues>({
    resolver,
    defaultValues: {
      customerName: prefill?.name ?? "",
      customerPhone: prefill?.phone ?? "",
      customerEmail: prefill?.email ?? "",
      fulfillment: "delivery",
      zoneId: zones[0] ? String(zones[0].zoneId) : "",
      address: { line1: "", line2: "", neighborhood: "", city: "", reference: "" },
      paymentMethodId: paymentMethods[0]?.paymentMethodId ?? 0,
      paymentReference: "",
      couponCode: "",
      notes: "",
      lines: [],
    },
  });

  const fulfillment = useWatch({ control, name: "fulfillment" });
  const zoneIdRaw = useWatch({ control, name: "zoneId" });
  const paymentMethodId = useWatch({ control, name: "paymentMethodId" });

  const zone = zones.find((z) => String(z.zoneId) === String(zoneIdRaw)) ?? null;
  const method = paymentMethods.find((m) => m.paymentMethodId === Number(paymentMethodId)) ?? null;
  const paymentRate = method ? rates[method.currency.currencyId] : undefined;

  const totals = useMemo(
    () =>
      computeCartTotals({
        lines: state.lines,
        baseDecimals: base.decimalPlaces,
        fulfillment: fulfillment ?? "delivery",
        shipping: {
          fee: zone?.fee ?? defaultShippingFee,
          freeThreshold: zone ? zone.freeShippingThreshold ?? freeShippingThreshold : freeShippingThreshold,
        },
        payment:
          method && paymentRate
            ? { surchargePercent: method.surchargePercent, exchangeRate: paymentRate, decimals: method.currency.decimalPlaces }
            : null,
      }),
    [state.lines, base.decimalPlaces, fulfillment, zone, defaultShippingFee, freeShippingThreshold, method, paymentRate]
  );

  if (!state.hydrated) return null;

  if (state.lines.length === 0) {
    return (
      <EmptyState
        icon={ClipboardList}
        title="Nada que pagar todavía"
        description="Añade productos a la bolsa antes de finalizar la compra."
        ctaLabel="Ir al catálogo"
        ctaHref="/catalogo"
      />
    );
  }

  const onSubmit = async (values: CreateOrderValues) => {
    setIsSubmitting(true);
    try {
      const result = await createOrder(values);
      if (!result.success) {
        toast.danger(result.error);
        return;
      }
      clearCart();
      router.push(`/pedido-confirmado/${encodeURIComponent(result.data.orderNo)}`);
    } catch (error) {
      console.error("CheckoutForm:", error);
      toast.danger("No se pudo crear el pedido. Inténtalo de nuevo.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Algunos errores (líneas, refinamientos de dirección) no tienen un campo
  // visible donde pintarse: sin este aviso el botón parece no hacer nada.
  const onInvalid = (errors: FieldErrors<CreateOrderInput>) => {
    const first = Object.values(errors)[0] as { message?: string; line1?: { message?: string } } | undefined;
    toast.danger(first?.message ?? first?.line1?.message ?? "Revisa los datos del pedido");
  };

  const fulfillmentOptions = [
    { value: "delivery", label: "Entrega a domicilio" },
    ...(allowPickup ? [{ value: "pickup", label: "Recojo en tienda" }] : []),
  ];

  return (
    <form onSubmit={handleSubmit(onSubmit, onInvalid)} noValidate className="grid gap-6 md:grid-cols-[minmax(0,1fr)_340px] md:items-start">
      <div className="flex flex-col gap-6">
        <section className="rounded-card bg-canvas p-5 shadow-card">
          <p className="eyebrow">Tus datos</p>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <FormTextField control={control} name="customerName" label="Nombre" autoComplete="name" isRequired />
            <FormTextField control={control} name="customerPhone" label="Teléfono" type="tel" autoComplete="tel" isRequired />
            <FormTextField control={control} name="customerEmail" label="Correo (opcional)" type="email" autoComplete="email" className="sm:col-span-2" />
          </div>
        </section>

        <section className="rounded-card bg-canvas p-5 shadow-card">
          <p id="fulfillment-label" className="eyebrow">
            Entrega
          </p>
          <div className="mt-4">
            <Controller
              control={control}
              name="fulfillment"
              render={({ field }) => (
                <ChoiceChips
                  options={fulfillmentOptions}
                  value={field.value ?? "delivery"}
                  onChange={(v) => field.onChange(v)}
                  labelledBy="fulfillment-label"
                />
              )}
            />
          </div>
          {fulfillment !== "pickup" && (
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <FormSelect
                control={control}
                name="zoneId"
                label="Zona"
                options={zones.map((z) => ({
                  value: String(z.zoneId),
                  label: z.name,
                  description: z.etaLabel ?? undefined,
                }))}
                isRequired
                className="sm:col-span-2"
              />
              <FormTextField control={control} name="address.line1" label="Dirección" placeholder="Calle y número" autoComplete="address-line1" isRequired className="sm:col-span-2" />
              <FormTextField control={control} name="address.line2" label="Apto / piso (opcional)" autoComplete="address-line2" />
              <FormTextField control={control} name="address.neighborhood" label="Barrio / reparto (opcional)" />
              <FormTextField control={control} name="address.city" label="Ciudad" autoComplete="address-level2" isRequired />
              <FormTextField control={control} name="address.reference" label="Referencia (opcional)" placeholder="Edificio azul, timbre 3" />
            </div>
          )}
        </section>

        <section className="rounded-card bg-canvas p-5 shadow-card">
          <p id="payment-label" className="eyebrow">
            Pago
          </p>
          <div className="mt-4">
            <Controller
              control={control}
              name="paymentMethodId"
              render={({ field, fieldState }) => (
                <>
                  <PaymentMethodPicker
                    methods={paymentMethods}
                    value={field.value ? Number(field.value) : null}
                    onChange={(id) => {
                      field.onChange(id);
                      setValue("paymentReference", "");
                    }}
                    labelledBy="payment-label"
                  />
                  {fieldState.error && (
                    <p className="mt-2 text-[12.5px] text-danger">{fieldState.error.message}</p>
                  )}
                </>
              )}
            />
          </div>
          {method?.requiresReference && (
            <div className="mt-4">
              <FormTextField
                control={control}
                name="paymentReference"
                label="Número de transacción"
                description="Lo verás en el comprobante de tu transferencia."
              />
            </div>
          )}
        </section>

        <section className="rounded-card bg-canvas p-5 shadow-card">
          <p className="eyebrow">Notas</p>
          <div className="mt-4">
            <FormTextArea control={control} name="notes" label="Indicaciones para la entrega (opcional)" rows={2} />
          </div>
        </section>
      </div>

      <CartSummary totals={totals} paymentCurrency={method?.currency ?? null}>
        <Button
          type="submit"
          variant="primary"
          size="lg"
          isPending={isSubmitting}
          isDisabled={isSubmitting}
          className="w-full rounded-full"
        >
          Confirmar pedido
        </Button>
        <p className="mt-3 text-center text-[12px] leading-[1.6] text-slate-400">
          Los precios se recalculan a la tasa vigente al confirmar.
        </p>
      </CartSummary>
    </form>
  );
}
