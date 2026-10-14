"use client";

import Link from "next/link";
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
import { RecipientPicker } from "@/modules/recipients/components/recipient-picker";
import type { RecipientRow } from "@/modules/recipients/queries/recipient-queries";
import { computeCartTotals } from "../cart-totals";
import { cartIsEmpty, cartPriceLines, useCart } from "../store";
import { CartSummary } from "./cart-summary";

export interface CheckoutCustomer {
  name: string;
  phone: string;
  email: string | null;
}

interface CheckoutFormProps {
  zones: ZoneRow[];
  paymentMethods: PaymentMethodRow[];
  defaultShippingFee: number;
  freeShippingThreshold: number | null;
  allowPickup: boolean;
  /** Hay WhatsApp de tienda: tras confirmar, el cliente coordina el pago allí. */
  whatsappEnabled: boolean;
  /** Datos de la cuenta: se muestran, no se editan aquí. */
  customer: CheckoutCustomer;
  recipients: RecipientRow[];
}

/** Primer mensaje del árbol de errores de RHF. Algunos (líneas, destinatario,
 *  refinamientos) no tienen un campo visible donde pintarse y sin aviso el
 *  botón parece no hacer nada. `ref` apunta al DOM: no se recorre. */
function firstErrorMessage(errors: unknown, depth = 0): string | null {
  if (!errors || typeof errors !== "object" || depth > 4) return null;
  const record = errors as Record<string, unknown>;
  if (typeof record.message === "string" && record.message) return record.message;
  for (const [key, value] of Object.entries(record)) {
    if (key === "ref") continue;
    const found = firstErrorMessage(value, depth + 1);
    if (found) return found;
  }
  return null;
}

/** Valor del select de zona para la zona de un destinatario, si sigue activa. */
function zoneOptionFor(zoneId: number | null, zones: ZoneRow[]): string | null {
  return zoneId != null && zones.some((z) => z.zoneId === zoneId) ? String(zoneId) : null;
}

export function CheckoutForm({
  zones,
  paymentMethods,
  defaultShippingFee,
  freeShippingThreshold,
  allowPickup,
  whatsappEnabled,
  customer,
  recipients,
}: CheckoutFormProps) {
  const router = useRouter();
  const { state, clearCart } = useCart();
  const { base, rates } = useCurrency();
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Las líneas viven en el carrito, no en el formulario; en recogida no hay
  // destinatario ni zona, y con un destinatario guardado los campos del nuevo
  // no cuentan. Se ajusta antes de validar para que el schema del servidor
  // sea también el del cliente.
  const cartRef = useRef(state);
  cartRef.current = state;
  const resolver = useMemo<Resolver<CreateOrderInput, unknown, CreateOrderValues>>(() => {
    const base = zodResolver(createOrderSchema);
    return (values, context, options) => {
      const pickup = values.fulfillment === "pickup";
      return base(
        {
          ...values,
          zoneId: pickup ? "" : values.zoneId,
          recipientId: pickup ? "" : values.recipientId,
          newRecipient: pickup || values.recipientId ? null : values.newRecipient,
          lines: cartRef.current.lines.map((l) => ({ variantId: l.variantId, qty: l.qty })),
          combos: cartRef.current.combos.map((c) => ({ comboId: c.comboId, qty: c.qty })),
        },
        context,
        options
      );
    };
  }, []);

  // Con destinatarios guardados el principal viene elegido (y su zona); sin
  // ellos el primero se escribe aquí mismo partiendo de los datos del cliente.
  const initialRecipient = recipients.find((r) => r.isDefault) ?? recipients[0] ?? null;
  const initialZone =
    zoneOptionFor(initialRecipient?.zoneId ?? null, zones) ?? (zones[0] ? String(zones[0].zoneId) : "");

  const { control, handleSubmit, setValue } = useForm<CreateOrderInput, unknown, CreateOrderValues>({
    resolver,
    defaultValues: {
      fulfillment: "delivery",
      zoneId: initialZone,
      recipientId: initialRecipient?.addressId ?? "",
      newRecipient: {
        name: initialRecipient ? "" : customer.name,
        phone: initialRecipient ? "" : customer.phone,
        line1: "",
        line2: "",
        neighborhood: "",
        reference: "",
      },
      paymentMethodId: paymentMethods[0]?.paymentMethodId ?? 0,
      paymentReference: "",
      couponCode: "",
      notes: "",
      lines: [],
      combos: [],
    },
  });

  const fulfillment = useWatch({ control, name: "fulfillment" });
  const zoneIdRaw = useWatch({ control, name: "zoneId" });
  const recipientIdRaw = useWatch({ control, name: "recipientId" });
  const paymentMethodId = useWatch({ control, name: "paymentMethodId" });

  const zone = zones.find((z) => String(z.zoneId) === String(zoneIdRaw)) ?? null;
  const method = paymentMethods.find((m) => m.paymentMethodId === Number(paymentMethodId)) ?? null;
  const paymentRate = method ? rates[method.currency.currencyId] : undefined;
  const writingRecipient = !recipientIdRaw;

  const totals = useMemo(
    () =>
      computeCartTotals({
        lines: cartPriceLines(state),
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
    [state, base.decimalPlaces, fulfillment, zone, defaultShippingFee, freeShippingThreshold, method, paymentRate]
  );

  if (!state.hydrated) return null;

  if (cartIsEmpty(state)) {
    return (
      <EmptyState
        icon={ClipboardList}
        title="Nada que pagar todavía"
        description="Añade productos al carrito antes de finalizar la compra."
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

  const onInvalid = (errors: FieldErrors<CreateOrderInput>) => {
    toast.danger(firstErrorMessage(errors) ?? "Revisa los datos del pedido");
  };

  const fulfillmentOptions = [
    { value: "delivery", label: "Entrega a domicilio" },
    ...(allowPickup ? [{ value: "pickup", label: "Recojo en tienda" }] : []),
  ];

  return (
    <form onSubmit={handleSubmit(onSubmit, onInvalid)} noValidate className="grid gap-6 md:grid-cols-[minmax(0,1fr)_340px] md:items-start">
      <div className="flex flex-col gap-6">
        <section className="rounded-card bg-canvas p-5 shadow-card">
          <div className="flex items-start justify-between gap-3">
            <p className="eyebrow">Tus datos</p>
            <Link href="/perfil" className="text-[12.5px] font-semibold text-navy-700 hover:underline">
              Editar en mi perfil
            </Link>
          </div>
          <dl className="mt-3 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 text-[13.5px]">
            <dt className="text-slate-400">Nombre</dt>
            <dd className="font-medium text-ink">{customer.name}</dd>
            <dt className="text-slate-400">Teléfono</dt>
            <dd className="tabular font-medium text-ink">{customer.phone}</dd>
            {customer.email && (
              <>
                <dt className="text-slate-400">Correo</dt>
                <dd className="font-medium text-ink">{customer.email}</dd>
              </>
            )}
          </dl>
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
            <>
              <p id="recipient-label" className="mt-5 text-[13.5px] font-semibold text-ink">
                ¿A quién se lo entregamos?
              </p>
              {recipients.length > 0 && (
                <div className="mt-3">
                  <Controller
                    control={control}
                    name="recipientId"
                    render={({ field, fieldState }) => (
                      <>
                        <RecipientPicker
                          recipients={recipients}
                          value={field.value ? Number(field.value) : null}
                          onChange={(addressId) => {
                            field.onChange(addressId ?? "");
                            const picked = addressId == null ? null : (recipients.find((r) => r.addressId === addressId) ?? null);
                            const zoneOption = zoneOptionFor(picked?.zoneId ?? null, zones);
                            if (zoneOption) setValue("zoneId", zoneOption);
                          }}
                          labelledBy="recipient-label"
                        />
                        {fieldState.error && (
                          <p className="mt-2 text-[12.5px] text-danger">{fieldState.error.message}</p>
                        )}
                      </>
                    )}
                  />
                </div>
              )}
              {writingRecipient && (
                <div className="mt-4 grid gap-4 sm:grid-cols-2">
                  <FormTextField control={control} name="newRecipient.name" label="Nombre de quien recibe" autoComplete="name" isRequired />
                  <FormTextField control={control} name="newRecipient.phone" label="Teléfono de quien recibe" type="tel" autoComplete="tel" isRequired />
                  <FormTextField control={control} name="newRecipient.line1" label="Dirección" placeholder="Calle y número" autoComplete="address-line1" isRequired className="sm:col-span-2" />
                  <FormTextField control={control} name="newRecipient.line2" label="Apto / piso (opcional)" autoComplete="address-line2" />
                  <FormTextField control={control} name="newRecipient.neighborhood" label="Barrio / reparto (opcional)" />
                  <FormTextField control={control} name="newRecipient.reference" label="Referencia (opcional)" placeholder="Edificio azul, timbre 3" />
                  <p className="text-[12px] leading-[1.6] text-slate-400 sm:col-span-2">
                    Se guarda en tus destinatarios para la próxima compra.
                  </p>
                </div>
              )}
              <div className="mt-4">
                <FormSelect
                  control={control}
                  name="zoneId"
                  label="Zona de entrega"
                  options={zones.map((z) => ({
                    value: String(z.zoneId),
                    label: z.name,
                    description: z.etaLabel ?? undefined,
                  }))}
                  isRequired
                />
              </div>
            </>
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
          {whatsappEnabled && (
            <p className="mt-4 text-[12.5px] leading-[1.6] text-slate-500">
              Después de confirmar verás cómo coordinar el pago por WhatsApp con la tienda y enviar el comprobante.
            </p>
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
