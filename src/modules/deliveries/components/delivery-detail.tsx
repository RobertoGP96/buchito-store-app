"use client";

import { useState } from "react";
import { Button, toast } from "@heroui/react";
import { MapPin, Phone } from "lucide-react";
import { Money } from "@/components/money";
import { PromptDialog } from "@/components/prompt-dialog";
import { StatusChip } from "@/components/status-chip";
import { fmtDateTime } from "@/lib/format";
import { PAYMENT_STATUS_META, type PaymentStatus } from "@/modules/payments/lib/labels";
import { fmtQty } from "@/modules/products/lib/units";
import { transitionDelivery } from "../actions/delivery-actions";
import { DELIVERY_STATUS_META, DELIVERY_TRANSITION_LABELS, type DeliveryStatus } from "../lib/labels";
import { nextDeliveryStates, type DeliveryActor } from "../lib/state-machine";
import type { DeliveryDetailData } from "../queries/delivery-queries";

interface DeliveryDetailProps {
  delivery: DeliveryDetailData;
  actor: DeliveryActor;
  isAssignedCourier: boolean;
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-card bg-canvas p-5 shadow-card">
      <p className="eyebrow">{title}</p>
      <div className="mt-3">{children}</div>
    </section>
  );
}

/** Ficha de entrega para el mensajero (y el admin): dirección, teléfono,
 *  artículos, cobro y botones de transición derivados de la máquina. */
export function DeliveryDetail({ delivery, actor, isAssignedCourier }: DeliveryDetailProps) {
  const [pending, setPending] = useState<DeliveryStatus | null>(null);
  const targets = nextDeliveryStates(delivery.status, actor, { isAssignedCourier }).filter(
    // Asignar/desasignar se hacen desde la lista del admin, no desde la ficha.
    (to) => to !== "assigned" && to !== "pending"
  );
  const mustCollect = delivery.paymentStatus !== "paid" && delivery.amountToCollect > 0;
  // "Entregado" con cobro y "No se pudo" piden un dato antes de enviar.
  const [asking, setAsking] = useState<"delivered" | "failed" | null>(null);

  const press = (to: DeliveryStatus) => {
    if (to === "failed" || (to === "delivered" && mustCollect)) {
      setAsking(to);
      return;
    }
    void run(to, {});
  };

  const run = async (
    to: DeliveryStatus,
    extra: { failedReason?: string; amountCollected?: number }
  ) => {
    const failedReason = extra.failedReason ?? null;
    const amountCollected = extra.amountCollected ?? null;
    setPending(to);
    try {
      const result = await transitionDelivery({
        deliveryId: delivery.deliveryId,
        version: delivery.version,
        to,
        failedReason,
        amountCollected: amountCollected ?? "",
        note: null,
        proofPhotoUrl: null,
      });
      if (!result.success) {
        toast.danger(result.error);
        return;
      }
      toast.success("Entrega actualizada");
      setAsking(null);
    } catch (error) {
      console.error("DeliveryDetail:", error);
      toast.danger("No se pudo actualizar la entrega");
    } finally {
      setPending(null);
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <Section title="Destinatario">
        <p className="text-[16px] font-semibold text-ink">{delivery.recipientName}</p>
        <a
          href={`tel:${delivery.recipientPhone.replace(/\s+/g, "")}`}
          className="mt-2 inline-flex items-center gap-2 rounded-full bg-tint px-4 py-2 text-[14px] font-semibold text-navy-900"
        >
          <Phone className="h-4 w-4" strokeWidth={2} />
          <span className="tabular">{delivery.recipientPhone}</span>
        </a>
        {(delivery.customerName !== delivery.recipientName || delivery.customerPhone !== delivery.recipientPhone) && (
          <p className="mt-3 text-[12.5px] text-slate-500">
            Pedido de {delivery.customerName} · <span className="tabular">{delivery.customerPhone}</span>
          </p>
        )}
      </Section>

      <Section title="Entrega">
        {delivery.address?.recipientName && (
          <div className="mb-3">
            <p className="text-[12.5px] text-slate-500">Recibe</p>
            <p className="text-[16px] font-semibold text-ink">{delivery.address.recipientName}</p>
            {delivery.address.recipientPhone && (
              <a
                href={`tel:${delivery.address.recipientPhone.replace(/\s+/g, "")}`}
                className="mt-2 inline-flex items-center gap-2 rounded-full bg-tint px-4 py-2 text-[14px] font-semibold text-navy-900"
              >
                <Phone className="h-4 w-4" strokeWidth={2} />
                <span className="tabular">{delivery.address.recipientPhone}</span>
              </a>
            )}
          </div>
        )}
        {delivery.address ? (
          <address className="flex items-start gap-2 text-[14.5px] not-italic leading-[1.6] text-ink">
            <MapPin className="mt-1 h-4 w-4 flex-none text-navy-700" strokeWidth={2} />
            <span>
              {delivery.address.line1}
              {delivery.address.line2 && <>, {delivery.address.line2}</>}
              {delivery.address.neighborhood && <>, {delivery.address.neighborhood}</>}
              {delivery.zoneName && <span className="block text-slate-500">Zona: {delivery.zoneName}</span>}
              {delivery.address.reference && <span className="block text-slate-500">Ref.: {delivery.address.reference}</span>}
            </span>
          </address>
        ) : (
          <p className="text-[13.5px] text-slate-500">Sin dirección registrada.</p>
        )}
        {delivery.orderNotes && (
          <p className="mt-3 rounded-field bg-page px-3 py-2 text-[12.5px] text-slate-500">{delivery.orderNotes}</p>
        )}
      </Section>

      <Section title="Artículos">
        <ul className="divide-y divide-line-soft">
          {delivery.lines.map((line, i) => (
            <li key={i} className="flex items-center justify-between gap-3 py-2 text-[14px]">
              <span className="text-ink">
                {line.productName}
                {line.variantName && <span className="text-slate-400"> · {line.variantName}</span>}
              </span>
              <span className="tabular font-semibold text-navy-900">× {fmtQty(line.qty, line.unit)}</span>
            </li>
          ))}
        </ul>
      </Section>

      <Section title="Cobro">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-[13px] text-slate-500">{delivery.paymentMethodName}</p>
            <p className="font-display mt-1 text-[24px] leading-none text-navy-900">
              {mustCollect ? (
                <Money value={delivery.amountToCollect} currency={delivery.paymentCurrency} />
              ) : (
                <span className="text-ok">Nada que cobrar</span>
              )}
            </p>
          </div>
          <StatusChip {...PAYMENT_STATUS_META[delivery.paymentStatus as PaymentStatus]} />
        </div>
      </Section>

      <Section title="Estado">
        <div className="flex items-center justify-between gap-3">
          <StatusChip {...DELIVERY_STATUS_META[delivery.status]} size="md" />
          {delivery.attempts > 0 && <span className="text-[12.5px] text-slate-400">{delivery.attempts} intento(s)</span>}
        </div>
        {delivery.failedReason && (
          <p className="mt-3 rounded-field bg-danger-soft px-3 py-2 text-[12.5px] text-danger">{delivery.failedReason}</p>
        )}
        {targets.length > 0 && (
          <div className="mt-4 grid gap-2 sm:grid-cols-2">
            {targets.map((to) => (
              <Button
                key={to}
                variant={to === "failed" ? "danger-soft" : "primary"}
                size="lg"
                className="rounded-full"
                isPending={pending === to}
                isDisabled={pending !== null}
                onPress={() => press(to)}
              >
                {DELIVERY_TRANSITION_LABELS[to]}
              </Button>
            ))}
          </div>
        )}
        {delivery.events.length > 0 && (
          <ol className="mt-4 flex flex-col gap-1.5 border-t border-line pt-3 text-[12.5px]">
            {delivery.events.map((e) => (
              <li key={e.eventId} className="flex items-center justify-between gap-3">
                <span className="text-slate-500">
                  {DELIVERY_STATUS_META[e.toStatus].label}
                  {e.actor ? ` · ${e.actor}` : ""}
                  {e.note ? ` · ${e.note}` : ""}
                </span>
                <span className="tabular text-ink">{fmtDateTime(e.createdAt)}</span>
              </li>
            ))}
          </ol>
        )}
      </Section>

      <PromptDialog
        key={`delivered-${delivery.version}`}
        open={asking === "delivered"}
        onOpenChange={(open) => !open && setAsking(null)}
        title="Confirmar entrega"
        description={`Escribe lo que cobraste al cliente. Si no cobraste nada, deja 0.`}
        label="Monto cobrado"
        kind="number"
        suffix={delivery.paymentCurrency.code}
        initialValue={String(delivery.amountToCollect)}
        confirmLabel="Entregado"
        isPending={pending === "delivered"}
        onConfirm={(value) => {
          const amount = Number(value.replace(",", "."));
          if (!Number.isFinite(amount) || amount < 0) {
            toast.danger("Escribe un monto válido");
            return;
          }
          void run("delivered", { amountCollected: amount });
        }}
      />
      <PromptDialog
        key={`failed-${delivery.version}`}
        open={asking === "failed"}
        onOpenChange={(open) => !open && setAsking(null)}
        title="No se pudo entregar"
        description="El pedido vuelve a la cola y el administrador podrá reasignarlo."
        label="Motivo"
        hint="Ej.: nadie en casa, dirección incorrecta, cliente rechazó el pedido."
        kind="textarea"
        confirmLabel="Registrar fallo"
        tone="danger"
        isPending={pending === "failed"}
        onConfirm={(value) => void run("failed", { failedReason: value })}
      />
    </div>
  );
}
