import Link from "next/link";
import { Money } from "@/components/money";
import { StatusChip } from "@/components/status-chip";
import { fmtDateTime } from "@/lib/format";
import { DELIVERY_STATUS_META } from "@/modules/deliveries/lib/labels";
import { PAYMENT_STATUS_META } from "@/modules/payments/lib/labels";
import { outstandingBase } from "@/modules/payments/lib/payment-status";
import { FULFILLMENT_LABELS, ORDER_STATUS_META } from "../lib/labels";
import type { OrderDetailData } from "../queries/order-queries";

interface OrderDetailProps {
  order: OrderDetailData;
  /** Slots que varían por audiencia (admin: acciones y registrar cobro). */
  actions?: React.ReactNode;
  paymentActions?: React.ReactNode;
  /** Enlace a la entrega (admin) si existe. */
  deliveryHref?: string;
}

function Section({ title, children, aside }: { title: string; children: React.ReactNode; aside?: React.ReactNode }) {
  return (
    <section className="rounded-card bg-canvas p-5 shadow-card">
      <div className="flex items-center justify-between gap-3">
        <p className="eyebrow">{title}</p>
        {aside}
      </div>
      <div className="mt-3">{children}</div>
    </section>
  );
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4 text-[13.5px]">
      <dt className="text-slate-500">{label}</dt>
      <dd className="text-right font-medium text-ink">{value}</dd>
    </div>
  );
}

/** Ficha de pedido compartida por admin y cliente. Server component. */
export function OrderDetail({ order, actions, paymentActions, deliveryHref }: OrderDetailProps) {
  const outstanding = outstandingBase(order.paidBase, order.total);
  const timeline = [
    { label: "Creado", at: order.createdAt },
    { label: "Confirmado", at: order.confirmedAt },
    { label: "Listo", at: order.readyAt },
    { label: "Entregado", at: order.deliveredAt },
    { label: "Cancelado", at: order.cancelledAt },
  ].filter((t) => t.at);

  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_360px] lg:items-start">
      <div className="flex flex-col gap-4">
        <Section title="Artículos">
          <ul className="divide-y divide-line-soft">
            {order.lines.map((line) => (
              <li key={line.lineId} className="flex items-center justify-between gap-4 py-2.5 text-[13.5px]">
                <div className="min-w-0">
                  <p className="font-medium text-ink">{line.productName}</p>
                  <p className="text-[12px] text-slate-400">
                    {line.variantName ? `${line.variantName} · ` : ""}
                    <span className="tabular">{line.sku}</span> · {line.qty} × <Money value={line.unitPrice} />
                  </p>
                </div>
                <Money value={line.lineTotal} className="font-semibold text-ink" />
              </li>
            ))}
          </ul>
          <dl className="mt-3 flex flex-col gap-2 border-t border-line pt-3">
            <Row label="Subtotal" value={<Money value={order.subtotal} />} />
            {order.discount > 0 && <Row label={`Descuento${order.couponCode ? ` (${order.couponCode})` : ""}`} value={<>−<Money value={order.discount} /></>} />}
            <Row label="Envío" value={<Money value={order.shippingFee} />} />
            {order.paymentSurcharge > 0 && <Row label="Recargo de pago" value={<Money value={order.paymentSurcharge} />} />}
            <div className="flex items-center justify-between gap-4 border-t border-line pt-2 text-[15px]">
              <dt className="font-semibold text-ink">Total</dt>
              <dd className="font-display text-navy-900"><Money value={order.total} /></dd>
            </div>
          </dl>
        </Section>

        <Section
          title="Pago"
          aside={paymentActions}
        >
          <dl className="flex flex-col gap-2">
            <Row label="Método" value={order.paymentMethodName} />
            <Row
              label={`A pagar en ${order.paymentCurrency.code}`}
              value={<Money value={order.totalInPaymentCurrency} currency={order.paymentCurrency} />}
            />
            {order.paymentCurrency.currencyId !== order.baseCurrency.currencyId && (
              <Row label="Tasa aplicada" value={<span className="tabular">1 {order.paymentCurrency.code} = {order.paymentExchangeRate} {order.baseCurrency.code}</span>} />
            )}
            <Row label="Cobrado" value={<Money value={order.paidBase} />} />
            <Row label="Pendiente" value={<Money value={outstanding} className={outstanding > 0 ? "text-warn" : "text-ok"} />} />
            <Row label="Estado" value={<StatusChip {...PAYMENT_STATUS_META[order.paymentStatus]} />} />
          </dl>
          {order.payments.length > 0 && (
            <ul className="mt-3 divide-y divide-line-soft border-t border-line">
              {order.payments.map((p) => (
                <li key={p.paymentId} className="flex items-center justify-between gap-4 py-2 text-[12.5px]">
                  <div>
                    <p className="font-medium text-ink">
                      <Money value={p.amountTendered} currency={p.currency} /> · {p.methodName}
                    </p>
                    <p className="tabular text-slate-400">
                      {fmtDateTime(p.paidAt)}
                      {p.receivedBy ? ` · ${p.receivedBy}` : ""}
                      {p.reference ? ` · ref. ${p.reference}` : ""}
                    </p>
                  </div>
                  <Money value={p.amountBase} className="text-slate-500" />
                </li>
              ))}
            </ul>
          )}
        </Section>
      </div>

      <div className="flex flex-col gap-4">
        <Section title="Estado" aside={<StatusChip {...ORDER_STATUS_META[order.status]} />}>
          {actions}
          <ol className="mt-3 flex flex-col gap-1.5 text-[12.5px]">
            {timeline.map((t) => (
              <li key={t.label} className="flex items-center justify-between gap-3">
                <span className="text-slate-500">{t.label}</span>
                <span className="tabular text-ink">{fmtDateTime(t.at!)}</span>
              </li>
            ))}
          </ol>
          {order.cancelReason && (
            <p className="mt-3 rounded-field bg-danger-soft px-3 py-2 text-[12.5px] text-danger">{order.cancelReason}</p>
          )}
        </Section>

        <Section title="Cliente">
          <p className="text-[14px] font-semibold text-ink">{order.customerName}</p>
          <p className="tabular mt-0.5 text-[13px] text-slate-500">
            <a href={`tel:${order.customerPhone.replace(/\s+/g, "")}`} className="hover:text-navy-700">{order.customerPhone}</a>
          </p>
          {order.customerEmail && <p className="text-[13px] text-slate-500">{order.customerEmail}</p>}
        </Section>

        <Section
          title={FULFILLMENT_LABELS[order.fulfillment]}
          aside={
            order.delivery ? (
              deliveryHref ? (
                <Link href={deliveryHref} className="text-[12.5px] font-semibold text-navy-700 hover:underline">
                  Ver entrega
                </Link>
              ) : (
                <StatusChip {...DELIVERY_STATUS_META[order.delivery.status]} />
              )
            ) : undefined
          }
        >
          {order.fulfillment === "delivery" && order.deliveryAddress ? (
            <address className="text-[13.5px] not-italic leading-[1.6] text-ink">
              {order.deliveryAddress.line1}
              {order.deliveryAddress.line2 && <>, {order.deliveryAddress.line2}</>}
              <br />
              {order.deliveryAddress.neighborhood && <>{order.deliveryAddress.neighborhood}, </>}
              {order.deliveryAddress.city}
              {order.zoneName && <span className="block text-slate-500">Zona: {order.zoneName}</span>}
              {order.deliveryAddress.reference && (
                <span className="block text-slate-500">Ref.: {order.deliveryAddress.reference}</span>
              )}
            </address>
          ) : (
            <p className="text-[13.5px] text-slate-500">El cliente recoge el pedido en la tienda.</p>
          )}
          {order.delivery && (
            <dl className="mt-3 flex flex-col gap-1.5 border-t border-line pt-3">
              <Row label="Entrega" value={<StatusChip {...DELIVERY_STATUS_META[order.delivery.status]} />} />
              {order.delivery.courierName && <Row label="Mensajero" value={order.delivery.courierName} />}
              {order.delivery.failedReason && <Row label="Motivo" value={order.delivery.failedReason} />}
            </dl>
          )}
          {order.notes && (
            <p className="mt-3 rounded-field bg-page px-3 py-2 text-[12.5px] text-slate-500">{order.notes}</p>
          )}
        </Section>
      </div>
    </div>
  );
}
