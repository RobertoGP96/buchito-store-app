"use client";

import { useRouter } from "next/navigation";
import { useMemo, useRef, useState } from "react";
import { Controller, useForm, useWatch, type FieldErrors, type Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button, Description, Label, Switch, toast } from "@heroui/react";
import { ClipboardList, MapPin } from "lucide-react";
import { ChoiceChips } from "@/components/choice-chips";
import { EmptyState } from "@/components/empty-state";
import { FormSelect, FormSwitch, FormTextArea, FormTextField } from "@/components/form/fields";
import { useCurrency } from "@/modules/currency/store/currency-provider";
import type { ZoneRow } from "@/modules/deliveries/queries/zone-queries";
import { createOrder } from "@/modules/orders/actions/order-actions";
import { createOrderSchema, type CreateOrderInput, type CreateOrderValues } from "@/modules/orders/lib/schemas";
import { PaymentMethodPicker } from "@/modules/payments/components/payment-method-picker";
import type { PaymentMethodRow } from "@/modules/payments/queries/payment-queries";
import { RecipientAddress } from "@/modules/recipients/components/recipient-address";
import type { RecipientRow } from "@/modules/recipients/queries/recipient-queries";
import { computeCartTotals } from "../cart-totals";
import { cartIsEmpty, cartPriceLines, useCart } from "../store";
import { CartSummary } from "./cart-summary";

interface CheckoutFormProps {
  zones: ZoneRow[];
  paymentMethods: PaymentMethodRow[];
  defaultShippingFee: number;
  freeShippingThreshold: number | null;
  allowPickup: boolean;
  prefill: { name: string; phone: string; email: string } | null;
  /** Destinatarios guardados del cliente con sesión (principal primero). */
  recipients: RecipientRow[];
  isSignedIn: boolean;
}

const EMPTY_ADDRESS: CreateOrderInput["address"] = {
  recipientName: "",
  recipientPhone: "",
  line1: "",
  line2: "",
  neighborhood: "",
  reference: "",
};

/** Valor del chip "escribir otro destinatario". */
const NEW_RECIPIENT = "new";

export function CheckoutForm({
  zones,
  paymentMethods,
  defaultShippingFee,
  freeShippingThreshold,
  allowPickup,
  prefill,
  recipients,
  isSignedIn,
}: CheckoutFormProps) {
  const router = useRouter();
  const { state, clearCart } = useCart();
  const { base, rates } = useCurrency();
  const [isSubmitting, setIsSubmitting] = useState(false);

  // El principal viene primero: con destinatarios guardados se parte de él.
  const initialRecipient = recipients[0] ?? null;
  const [selectedRecipientId, setSelectedRecipientId] = useState<number | null>(
    initialRecipient?.recipientId ?? null
  );
  // "Lo recibo yo": el destinatario es el propio comprador y sus datos se
  // copian de la sección "Tus datos" al validar, sin pedirlos dos veces.
  const [sameAsCustomer, setSameAsCustomer] = useState(true);

  const zoneValueFor = (recipient: RecipientRow | null) =>
    recipient?.zoneId != null && zones.some((z) => z.zoneId === recipient.zoneId)
      ? String(recipient.zoneId)
      : zones[0]
        ? String(zones[0].zoneId)
        : "";
  const addressFor = (recipient: RecipientRow): NonNullable<CreateOrderInput["address"]> => ({
    recipientName: recipient.name,
    recipientPhone: recipient.phone,
    line1: recipient.line1,
    line2: recipient.line2 ?? "",
    neighborhood: recipient.neighborhood ?? "",
    reference: recipient.reference ?? "",
  });

  // Las líneas viven en el carrito, no en el formulario, y en recogida la
  // dirección/zona no aplican: se ajustan antes de validar para que el schema
  // del servidor sea también el del cliente.
  const cartRef = useRef(state);
  cartRef.current = state;
  const selectedRef = useRef(selectedRecipientId);
  selectedRef.current = selectedRecipientId;
  const sameAsCustomerRef = useRef(sameAsCustomer);
  sameAsCustomerRef.current = sameAsCustomer;
  const resolver = useMemo<Resolver<CreateOrderInput, unknown, CreateOrderValues>>(() => {
    const base = zodResolver(createOrderSchema);
    return (values, context, options) => {
      const pickup = values.fulfillment === "pickup";
      const writingNew = selectedRef.current == null;
      const address =
        pickup || !values.address
          ? null
          : writingNew && sameAsCustomerRef.current
            ? { ...values.address, recipientName: values.customerName, recipientPhone: values.customerPhone }
            : values.address;
      return base(
        {
          ...values,
          address,
          zoneId: pickup ? "" : values.zoneId,
          saveRecipient: !pickup && writingNew && isSignedIn && Boolean(values.saveRecipient),
          lines: cartRef.current.lines.map((l) => ({ variantId: l.variantId, qty: l.qty })),
          combos: cartRef.current.combos.map((c) => ({ comboId: c.comboId, qty: c.qty })),
        },
        context,
        options
      );
    };
  }, [isSignedIn]);

  const { control, handleSubmit, setValue } = useForm<CreateOrderInput, unknown, CreateOrderValues>({
    resolver,
    defaultValues: {
      customerName: prefill?.name ?? "",
      customerPhone: prefill?.phone ?? "",
      customerEmail: prefill?.email ?? "",
      fulfillment: "delivery",
      zoneId: zoneValueFor(initialRecipient),
      address: initialRecipient ? addressFor(initialRecipient) : EMPTY_ADDRESS,
      saveRecipient: false,
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
  const paymentMethodId = useWatch({ control, name: "paymentMethodId" });

  const zone = zones.find((z) => String(z.zoneId) === String(zoneIdRaw)) ?? null;
  const method = paymentMethods.find((m) => m.paymentMethodId === Number(paymentMethodId)) ?? null;
  const paymentRate = method ? rates[method.currency.currencyId] : undefined;
  const selectedRecipient = recipients.find((r) => r.recipientId === selectedRecipientId) ?? null;

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

  const chooseRecipient = (value: string) => {
    if (value === NEW_RECIPIENT) {
      setSelectedRecipientId(null);
      setValue("address", EMPTY_ADDRESS);
      return;
    }
    const recipient = recipients.find((r) => String(r.recipientId) === value);
    if (!recipient) return;
    setSelectedRecipientId(recipient.recipientId);
    setValue("address", addressFor(recipient));
    setValue("zoneId", zoneValueFor(recipient));
  };

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
    const first = Object.values(errors)[0] as
      | { message?: string; line1?: { message?: string }; recipientName?: { message?: string } }
      | undefined;
    toast.danger(
      first?.message ?? first?.recipientName?.message ?? first?.line1?.message ?? "Revisa los datos del pedido"
    );
  };

  const fulfillmentOptions = [
    { value: "delivery", label: "Entrega a domicilio" },
    ...(allowPickup ? [{ value: "pickup", label: "Recojo en tienda" }] : []),
  ];
  const recipientOptions = [
    ...recipients.map((r) => ({ value: String(r.recipientId), label: r.label ? `${r.name} · ${r.label}` : r.name })),
    { value: NEW_RECIPIENT, label: "Otro destinatario" },
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
            <div className="mt-5 flex flex-col gap-4">
              {recipients.length > 0 && (
                <div>
                  <p id="recipient-label" className="text-[13px] font-semibold text-ink">
                    ¿Quién recibe el pedido?
                  </p>
                  <ChoiceChips
                    options={recipientOptions}
                    value={selectedRecipient ? String(selectedRecipient.recipientId) : NEW_RECIPIENT}
                    onChange={chooseRecipient}
                    labelledBy="recipient-label"
                    size="sm"
                    className="mt-2"
                  />
                </div>
              )}

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

              {selectedRecipient ? (
                <div className="flex items-start gap-3 rounded-field bg-page px-4 py-3 text-[13.5px] leading-[1.6] text-ink">
                  <MapPin className="mt-1 h-4 w-4 flex-none text-navy-700" strokeWidth={2} />
                  <div className="min-w-0">
                    <p className="font-semibold">{selectedRecipient.name}</p>
                    <p className="tabular text-slate-500">{selectedRecipient.phone}</p>
                    <RecipientAddress recipient={{ ...selectedRecipient, zoneName: null }} />
                  </div>
                </div>
              ) : (
                <>
                  <Switch isSelected={sameAsCustomer} onChange={setSameAsCustomer}>
                    <Switch.Control>
                      <Switch.Thumb />
                    </Switch.Control>
                    <Switch.Content>
                      <Label>Lo recibo yo</Label>
                      <Description>Usaremos tu nombre y teléfono para la entrega.</Description>
                    </Switch.Content>
                  </Switch>
                  <div className="grid gap-4 sm:grid-cols-2">
                    {!sameAsCustomer && (
                      <>
                        <FormTextField control={control} name="address.recipientName" label="Nombre de quien recibe" autoComplete="off" isRequired />
                        <FormTextField control={control} name="address.recipientPhone" label="Teléfono de quien recibe" type="tel" autoComplete="off" isRequired />
                      </>
                    )}
                    <FormTextField control={control} name="address.line1" label="Dirección" placeholder="Calle y número" autoComplete="address-line1" isRequired className="sm:col-span-2" />
                    <FormTextField control={control} name="address.line2" label="Apto / piso (opcional)" autoComplete="address-line2" />
                    <FormTextField control={control} name="address.neighborhood" label="Barrio / reparto (opcional)" />
                    <FormTextField control={control} name="address.reference" label="Referencia (opcional)" placeholder="Edificio azul, timbre 3" className="sm:col-span-2" />
                    {isSignedIn && (
                      <FormSwitch
                        control={control}
                        name="saveRecipient"
                        label="Guardar este destinatario"
                        description="Lo tendrás listo en tu próxima compra."
                        className="sm:col-span-2"
                      />
                    )}
                  </div>
                </>
              )}
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
