import Link from "next/link";
import { Money } from "@/components/money";
import { StatusChip } from "@/components/status-chip";
import { fmtDateTime } from "@/lib/format";
import { DELIVERY_STATUS_META } from "@/modules/deliveries/lib/labels";
import { PAYMENT_STATUS_META } from "@/modules/payments/lib/labels";
import { outstandingBase } from "@/modules/payments/lib/payment-status";
import { fmtQty } from "@/modules/products/lib/units";
import { FULFILLMENT_LABELS, ORDER_STATUS_META } from "../lib/labels";
import type { OrderDetailData, OrderLineRow } from "../queries/order-queries";

/** Rentabilidad del pedido; solo la ve el admin. */
export interface OrderProfit {
  cost: number;
  profit: number;
  linesWithoutCost: number;
}

interface OrderDetailProps {
  order: OrderDetailData;
  /** Slots que varían por audiencia (admin: acciones y registrar cobro). */
  actions?: React.ReactNode;
  paymentActions?: React.ReactNode;
  /** Enlace a la entrega (admin) si existe. */
  deliveryHref?: string;
  profit?: OrderProfit;
}

type LineGroup =
  | { kind: "line"; key: string; line: OrderLineRow }
  | { kind: "combo"; key: string; comboId: number; name: string; qty: number; total: number; lines: OrderLineRow[] };

/** Las líneas de un mismo combo se muestran agrupadas bajo su nombre, con el
 *  precio del combo (la suma exacta de sus líneas prorrateadas). */
function groupLines(lines: OrderLineRow[]): LineGroup[] {
  const groups: LineGroup[] = [];
  const byCombo = new Map<number, Extract<LineGroup, { kind: "combo" }>>();
  for (const line of lines) {
    if (line.comboId == null) {
      groups.push({ kind: "line", key: `l-${line.lineId}`, line });
      continue;
    }
    let group = byCombo.get(line.comboId);
    if (!group) {
      group = {
        kind: "combo",
        key: `c-${line.comboId}`,
        comboId: line.comboId,
        name: line.comboName ?? "Combo",
        qty: line.comboQty ?? 1,
        total: 0,
        lines: [],
      };
      byCombo.set(line.comboId, group);
      groups.push(group);
    }
    group.lines.push(line);
    group.total += line.lineTotal;
  }
  return groups;
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
export function OrderDetail({ order, actions, paymentActions, deliveryHref, profit }: OrderDetailProps) {
  const outstanding = outstandingBase(order.paidBase, order.total);
  const groups = groupLines(order.lines);
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
            {groups.map((group) =>
              group.kind === "line" ? (
                <li key={group.key} className="flex items-center justify-between gap-4 py-2.5 text-[13.5px]">
                  <div className="min-w-0">
                    <p className="font-medium text-ink">{group.line.productName}</p>
                    <p className="text-[12px] text-slate-400">
                      {group.line.variantName ? `${group.line.variantName} · ` : ""}
                      <span className="tabular">{group.line.sku}</span> · {fmtQty(group.line.qty, group.line.unit)} × <Money value={group.line.unitPrice} />
                    </p>
                  </div>
                  <Money value={group.line.lineTotal} className="font-semibold text-ink" />
                </li>
              ) : (
                <li key={group.key} className="py-2.5 text-[13.5px]">
                  <div className="flex items-center justify-between gap-4">
                    <div className="min-w-0">
                      <p className="font-medium text-ink">
                        <span className="mr-1.5 rounded-full bg-tint px-2 py-0.5 text-[10.5px] font-semibold tracking-[.02em] text-navy-700 uppercase">
                          Combo
                        </span>
                        {group.name}
                      </p>
                      <p className="text-[12px] text-slate-400">
                        {group.qty} × <Money value={group.total / group.qty} />
                      </p>
                    </div>
                    <Money value={group.total} className="font-semibold text-ink" />
                  </div>
                  <ul className="mt-1.5 flex flex-col gap-0.5 border-l-2 border-line pl-3 text-[12.5px] text-slate-500">
                    {group.lines.map((line) => (
                      <li key={line.lineId} className="flex items-center justify-between gap-3">
                        <span className="min-w-0 truncate">
                          {fmtQty(line.qty, line.unit)} × {line.productName}
                          {line.variantName ? ` (${line.variantName})` : ""}
                        </span>
                        <Money value={line.lineTotal} className="text-slate-400" />
                      </li>
                    ))}
                  </ul>
                </li>
              )
            )}
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
          {profit && (
            <dl className="mt-3 flex flex-col gap-2 rounded-field bg-page px-4 py-3">
              <Row label="Costo de la mercancía" value={<Money value={profit.cost} />} />
              <Row
                label="Ganancia bruta"
                value={<Money value={profit.profit} className={profit.profit < 0 ? "text-danger" : "text-ok"} />}
              />
              {profit.linesWithoutCost > 0 && (
                <p className="text-[12px] text-warn">
                  {profit.linesWithoutCost} {profit.linesWithoutCost === 1 ? "línea sin costo registrado" : "líneas sin costo registrado"}: la
                  ganancia real es menor.
                </p>
              )}
            </dl>
          )}
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
              {order.deliveryAddress.recipientName && (
                <span className="block">
                  <span className="font-semibold">Recibe: {order.deliveryAddress.recipientName}</span>
                  <span className="tabular text-slate-500"> · {order.deliveryAddress.recipientPhone}</span>
                </span>
              )}
              {order.deliveryAddress.line1}
              {order.deliveryAddress.line2 && <>, {order.deliveryAddress.line2}</>}
              {order.deliveryAddress.neighborhood && <>, {order.deliveryAddress.neighborhood}</>}
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
