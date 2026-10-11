"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button, toast } from "@heroui/react";
import { MapPin, Phone } from "lucide-react";
import { Money } from "@/components/money";
import { StatusChip } from "@/components/status-chip";
import { fmtDateTime } from "@/lib/format";
import { PAYMENT_STATUS_META, type PaymentStatus } from "@/modules/payments/lib/labels";
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
  const router = useRouter();
  const [pending, setPending] = useState<DeliveryStatus | null>(null);
  const targets = nextDeliveryStates(delivery.status, actor, { isAssignedCourier }).filter(
    // Asignar/desasignar se hacen desde la lista del admin, no desde la ficha.
    (to) => to !== "assigned" && to !== "pending"
  );
  const mustCollect = delivery.paymentStatus !== "paid" && delivery.amountToCollect > 0;

  const run = async (to: DeliveryStatus) => {
    let failedReason: string | null = null;
    let amountCollected: number | null = null;
    if (to === "failed") {
      failedReason = window.prompt("¿Por qué no se pudo entregar?");
      if (!failedReason) return;
    }
    if (to === "delivered" && mustCollect) {
      const raw = window.prompt(`Monto cobrado en ${delivery.paymentCurrency.code}`, String(delivery.amountToCollect));
      if (raw === null) return;
      amountCollected = Number(raw.replace(",", "."));
    }
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
      router.refresh();
    } catch (error) {
      console.error("DeliveryDetail:", error);
      toast.danger("No se pudo actualizar la entrega");
    } finally {
      setPending(null);
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <Section title="Cliente">
        <p className="text-[16px] font-semibold text-ink">{delivery.customerName}</p>
        <a
          href={`tel:${delivery.customerPhone.replace(/\s+/g, "")}`}
          className="mt-2 inline-flex items-center gap-2 rounded-full bg-tint px-4 py-2 text-[14px] font-semibold text-navy-900"
        >
          <Phone className="h-4 w-4" strokeWidth={2} />
          <span className="tabular">{delivery.customerPhone}</span>
        </a>
      </Section>

      <Section title="Dirección">
        {delivery.address ? (
          <address className="flex items-start gap-2 text-[14.5px] not-italic leading-[1.6] text-ink">
            <MapPin className="mt-1 h-4 w-4 flex-none text-navy-700" strokeWidth={2} />
            <span>
              {delivery.address.line1}
              {delivery.address.line2 && <>, {delivery.address.line2}</>}
              <br />
              {delivery.address.neighborhood && <>{delivery.address.neighborhood}, </>}
              {delivery.address.city}
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
              <span className="tabular font-semibold text-navy-900">× {line.qty}</span>
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
                onPress={() => void run(to)}
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
    </div>
  );
}
