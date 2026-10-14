"use client";

import { useState } from "react";
import { Button, toast } from "@heroui/react";
import { Camera, ImageOff, MapPin, Navigation, Phone } from "lucide-react";
import { ButtonLink } from "@/components/button-link";
import { Money } from "@/components/money";
import { PromptDialog } from "@/components/prompt-dialog";
import { StatusChip } from "@/components/status-chip";
import { fmtDateTime } from "@/lib/format";
import { imageSrc } from "@/lib/image-url";
import { cn } from "@/lib/utils";
import { PAYMENT_STATUS_META, type PaymentStatus } from "@/modules/payments/lib/labels";
import { fmtQty } from "@/modules/products/lib/units";
import { attachDeliveryProof, transitionDelivery } from "../actions/delivery-actions";
import { DELIVERY_STATUS_META, DELIVERY_TRANSITION_LABELS, type DeliveryStatus } from "../lib/labels";
import { nextDeliveryStates, type DeliveryActor } from "../lib/state-machine";
import type { DeliveryDetailData } from "../queries/delivery-queries";
import { DeliveryProofDialog, type DeliveryProofResult } from "./delivery-proof-dialog";

interface DeliveryDetailProps {
  delivery: DeliveryDetailData;
  actor: DeliveryActor;
  isAssignedCourier: boolean;
}

type Asking = "delivered" | "failed" | "proof" | null;

function Section({ title, hint, children, className }: { title: string; hint?: React.ReactNode; children: React.ReactNode; className?: string }) {
  return (
    <section className={cn("rounded-card bg-canvas p-5 shadow-card", className)}>
      <div className="flex items-center justify-between gap-3">
        <p className="eyebrow">{title}</p>
        {hint}
      </div>
      <div className="mt-3">{children}</div>
    </section>
  );
}

function PhoneLink({ phone }: { phone: string }) {
  return (
    <a
      href={`tel:${phone.replace(/\s+/g, "")}`}
      className="inline-flex items-center gap-2 rounded-full bg-tint px-4 py-2 text-[14px] font-semibold text-navy-900 transition-colors duration-150 hover:bg-tint-strong"
    >
      <Phone className="h-4 w-4" strokeWidth={2} />
      <span className="tabular">{phone}</span>
    </a>
  );
}

const STEP_HINT: Partial<Record<DeliveryStatus, string>> = {
  assigned: "Recoge el pedido en la tienda y márcalo cuando salgas.",
  in_transit: "Al entregar, toma una foto como prueba y registra lo cobrado.",
  delivered: "Entrega completada.",
  failed: "El administrador la reasignará para un nuevo intento.",
  pending: "Todavía no tiene mensajero asignado.",
  cancelled: "El pedido fue cancelado.",
};

/** Ficha de entrega para el mensajero (y el admin). Primero el siguiente
 *  paso, después a quién y dónde, los artículos, el cobro, la foto de prueba
 *  y el historial. Los botones salen de la máquina de estados. */
export function DeliveryDetail({ delivery, actor, isAssignedCourier }: DeliveryDetailProps) {
  const [pending, setPending] = useState<DeliveryStatus | "proof" | null>(null);
  const [asking, setAsking] = useState<Asking>(null);
  const targets = nextDeliveryStates(delivery.status, actor, { isAssignedCourier }).filter(
    // Asignar/desasignar se hacen desde la lista del admin, no desde la ficha.
    (to) => to !== "assigned" && to !== "pending"
  );
  const mustCollect = delivery.paymentStatus !== "paid" && delivery.amountToCollect > 0;
  const canEditProof = delivery.status === "delivered" && (actor === "admin" || isAssignedCourier);
  const proofSrc = imageSrc(delivery.proofPhotoUrl);
  const mapsQuery = delivery.address
    ? [delivery.address.line1, delivery.address.line2, delivery.address.neighborhood, delivery.zoneName].filter(Boolean).join(", ")
    : null;

  const press = (to: DeliveryStatus) => {
    if (to === "failed" || to === "delivered") {
      setAsking(to);
      return;
    }
    void run(to, {});
  };

  const run = async (
    to: DeliveryStatus,
    extra: { failedReason?: string; amountCollected?: number | null; proofPhotoUrl?: string | null }
  ) => {
    setPending(to);
    try {
      const result = await transitionDelivery({
        deliveryId: delivery.deliveryId,
        version: delivery.version,
        to,
        failedReason: extra.failedReason ?? null,
        amountCollected: extra.amountCollected ?? "",
        note: null,
        proofPhotoUrl: extra.proofPhotoUrl ?? null,
      });
      if (!result.success) {
        toast.danger(result.error);
        return;
      }
      toast.success(to === "delivered" ? "Entrega completada" : "Entrega actualizada");
      setAsking(null);
    } catch (error) {
      console.error("DeliveryDetail:", error);
      toast.danger("No se pudo actualizar la entrega");
    } finally {
      setPending(null);
    }
  };

  const saveProof = async ({ proofPhotoUrl }: DeliveryProofResult) => {
    if (!proofPhotoUrl) return;
    setPending("proof");
    try {
      const result = await attachDeliveryProof({ deliveryId: delivery.deliveryId, version: delivery.version, proofPhotoUrl });
      if (!result.success) {
        toast.danger(result.error);
        return;
      }
      toast.success("Foto guardada");
      setAsking(null);
    } catch (error) {
      console.error("DeliveryDetail.saveProof:", error);
      toast.danger("No se pudo guardar la foto");
    } finally {
      setPending(null);
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <Section
        title="Siguiente paso"
        hint={delivery.attempts > 0 ? <span className="text-[12.5px] text-slate-400">{delivery.attempts} intento(s) fallido(s)</span> : undefined}
      >
        <div className="flex items-center gap-3">
          <StatusChip {...DELIVERY_STATUS_META[delivery.status]} size="md" />
          <p className="text-[13.5px] leading-[1.55] text-slate-500">{STEP_HINT[delivery.status]}</p>
        </div>
        {delivery.failedReason && delivery.status === "failed" && (
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
                {to === "delivered" && <Camera className="h-4 w-4" strokeWidth={2} />}
                {DELIVERY_TRANSITION_LABELS[to]}
              </Button>
            ))}
          </div>
        )}
      </Section>

      <Section title="Destinatario">
        <p className="text-[17px] font-semibold text-ink">{delivery.recipientName}</p>
        <div className="mt-2.5">
          <PhoneLink phone={delivery.recipientPhone} />
        </div>
        {(delivery.customerName !== delivery.recipientName || delivery.customerPhone !== delivery.recipientPhone) && (
          <p className="mt-3 text-[12.5px] text-slate-500">
            Pedido de {delivery.customerName} · <span className="tabular">{delivery.customerPhone}</span>
          </p>
        )}
      </Section>

      <Section
        title="Dirección"
        hint={
          mapsQuery ? (
            <a
              href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(mapsQuery)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-[12.5px] font-semibold text-navy-700 hover:underline"
            >
              <Navigation className="h-3.5 w-3.5" strokeWidth={2} />
              Cómo llegar
            </a>
          ) : undefined
        }
      >
        {delivery.address ? (
          <address className="flex items-start gap-2 text-[15px] not-italic leading-[1.6] text-ink">
            <MapPin className="mt-1 h-4 w-4 flex-none text-navy-700" strokeWidth={2} />
            <span>
              {delivery.address.line1}
              {delivery.address.line2 && <>, {delivery.address.line2}</>}
              {delivery.address.neighborhood && <>, {delivery.address.neighborhood}</>}
              {delivery.zoneName && <span className="block text-[13.5px] text-slate-500">Zona: {delivery.zoneName}</span>}
              {delivery.address.reference && (
                <span className="block text-[13.5px] text-slate-500">Ref.: {delivery.address.reference}</span>
              )}
            </span>
          </address>
        ) : (
          <p className="text-[13.5px] text-slate-500">Sin dirección registrada.</p>
        )}
        {delivery.orderNotes && (
          <p className="mt-3 rounded-field bg-page px-3 py-2 text-[12.5px] leading-[1.55] text-slate-500">
            <span className="font-semibold text-ink">Nota del cliente: </span>
            {delivery.orderNotes}
          </p>
        )}
      </Section>

      <Section title="Artículos" hint={<span className="tabular text-[12.5px] text-slate-400">{delivery.lines.length}</span>}>
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
        {mustCollect && delivery.status !== "delivered" && (
          <p className="mt-3 text-[12.5px] leading-[1.55] text-slate-500">
            Cobra este monto al entregar y regístralo al marcar la entrega como entregada.
          </p>
        )}
      </Section>

      {(delivery.status === "delivered" || proofSrc) && (
        <Section
          title="Prueba de entrega"
          hint={
            canEditProof ? (
              <Button
                variant="outline"
                size="sm"
                className="rounded-full"
                isDisabled={pending !== null}
                onPress={() => setAsking("proof")}
              >
                <Camera className="h-3.5 w-3.5" strokeWidth={1.9} />
                {proofSrc ? "Cambiar foto" : "Añadir foto"}
              </Button>
            ) : undefined
          }
        >
          {proofSrc ? (
            <a href={proofSrc} target="_blank" rel="noopener noreferrer" className="block overflow-hidden rounded-field bg-page">
              {/* eslint-disable-next-line @next/next/no-img-element -- foto del bucket servida por /media, sin optimizar */}
              <img src={proofSrc} alt={`Prueba de entrega de ${delivery.orderNo}`} className="max-h-[360px] w-full object-cover" loading="lazy" />
            </a>
          ) : (
            <p className="flex items-center gap-2 text-[13.5px] text-slate-500">
              <ImageOff className="h-4 w-4 text-slate-400" strokeWidth={1.9} />
              Esta entrega se cerró sin foto de prueba.
            </p>
          )}
          {delivery.deliveredAt && (
            <p className="tabular mt-3 text-[12.5px] text-slate-500">Entregada {fmtDateTime(delivery.deliveredAt)}</p>
          )}
        </Section>
      )}

      {delivery.events.length > 0 && (
        <Section title="Historial">
          <ol className="flex flex-col gap-2 text-[12.5px]">
            {delivery.events.map((e) => (
              <li key={e.eventId} className="flex items-start justify-between gap-3">
                <span className="text-slate-500">
                  <span className="font-semibold text-ink">{DELIVERY_STATUS_META[e.toStatus].label}</span>
                  {e.actor ? ` · ${e.actor}` : ""}
                  {e.note ? ` · ${e.note}` : ""}
                </span>
                <span className="tabular flex-none text-slate-500">{fmtDateTime(e.createdAt)}</span>
              </li>
            ))}
          </ol>
        </Section>
      )}

      {actor === "admin" && (
        <div className="flex justify-end">
          <ButtonLink href={`/admin/pedidos/${delivery.orderId}`} variant="ghost" size="sm">
            Ver pedido en el panel
          </ButtonLink>
        </div>
      )}

      <DeliveryProofDialog
        key={`delivered-${delivery.version}`}
        open={asking === "delivered"}
        onOpenChange={(open) => !open && setAsking(null)}
        title="Confirmar entrega"
        description="Toma una foto del paquete entregado como prueba."
        confirmLabel="Entregado"
        askAmount={mustCollect ? { initial: delivery.amountToCollect, currencyCode: delivery.paymentCurrency.code } : null}
        isPending={pending === "delivered"}
        onConfirm={(result) => run("delivered", result)}
      />
      <DeliveryProofDialog
        key={`proof-${delivery.version}`}
        open={asking === "proof"}
        onOpenChange={(open) => !open && setAsking(null)}
        title={proofSrc ? "Cambiar la foto de prueba" : "Añadir foto de prueba"}
        description="La foto queda guardada en la entrega como constancia."
        confirmLabel="Guardar foto"
        requirePhoto
        isPending={pending === "proof"}
        onConfirm={saveProof}
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
