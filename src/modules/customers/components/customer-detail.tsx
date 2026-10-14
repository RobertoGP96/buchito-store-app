"use client";

import Link from "next/link";
import { Inbox, MapPin } from "lucide-react";
import { EmptyState } from "@/components/empty-state";
import { Money } from "@/components/money";
import { ListCard, ResponsiveList, type ListColumn } from "@/components/responsive-list";
import { StatusChip } from "@/components/status-chip";
import { fmtDate, fmtDateTime } from "@/lib/format";
import { ROLE_LABELS } from "@/lib/roles";
import { ORDER_STATUS_META } from "@/modules/orders/lib/labels";
import { PAYMENT_STATUS_META } from "@/modules/payments/lib/labels";
import { CustomerNotesForm } from "./customer-notes-form";
import type { CustomerDetailData, CustomerOrderRow } from "../queries/customer-queries";

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-card bg-canvas p-5 shadow-card">
      <p className="eyebrow">{title}</p>
      <div className="mt-3">{children}</div>
    </section>
  );
}

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="contents">
      <dt className="text-slate-400">{label}</dt>
      <dd className="font-medium text-ink">{value}</dd>
    </div>
  );
}

/** Ficha de cliente de solo lectura (datos, cuenta, direcciones e historial)
 *  más el formulario de notas internas. */
export function CustomerDetail({ customer }: { customer: CustomerDetailData }) {
  const columns: ListColumn<CustomerOrderRow>[] = [
    {
      id: "orderNo",
      header: "Pedido",
      isRowHeader: true,
      cell: (r) => (
        <Link href={`/admin/pedidos/${r.orderId}`} className="font-semibold text-navy-700 hover:underline">
          {r.orderNo}
        </Link>
      ),
    },
    { id: "date", header: "Fecha", cell: (r) => <span className="tabular text-slate-500">{fmtDateTime(r.createdAt)}</span> },
    {
      id: "status",
      header: "Estado",
      cell: (r) => (
        <div className="flex flex-wrap gap-1.5">
          <StatusChip {...ORDER_STATUS_META[r.status]} />
          <StatusChip {...PAYMENT_STATUS_META[r.paymentStatus]} />
        </div>
      ),
    },
    { id: "total", header: "Total", align: "right", cell: (r) => <Money value={r.total} className="font-semibold" /> },
  ];

  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_340px]">
      <div className="flex flex-col gap-4 lg:order-2">
        <Section title="Datos">
          <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-[13.5px]">
            <Field label="Nombre" value={customer.name} />
            <Field
              label="Teléfono"
              value={
                <a href={`tel:${customer.phone.replace(/\s+/g, "")}`} className="tabular text-navy-700 hover:underline">
                  {customer.phone}
                </a>
              }
            />
            <Field label="Correo" value={customer.email ?? <span className="text-slate-400">—</span>} />
            <Field label="Alta" value={<span className="tabular">{fmtDate(customer.createdAt)}</span>} />
            <Field label="Pedidos" value={<span className="tabular">{customer.orderCount}</span>} />
            <Field label="Total comprado" value={<Money value={customer.totalSpent} />} />
          </dl>
        </Section>

        <Section title="Cuenta">
          {customer.user ? (
            <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-[13.5px]">
              <Field label="Correo" value={customer.user.email} />
              <Field label="Rol" value={ROLE_LABELS[customer.user.role]} />
              <Field
                label="Estado"
                value={
                  <StatusChip
                    label={customer.user.isActive ? "Activa" : "Desactivada"}
                    tone={customer.user.isActive ? "success" : "danger"}
                  />
                }
              />
            </dl>
          ) : (
            <p className="text-[13.5px] text-slate-500">
              Compra como invitado. Si se registra con este teléfono, sus pedidos se enlazan a la cuenta.
            </p>
          )}
        </Section>

        <Section title="Notas">
          <CustomerNotesForm key={customer.notes ?? ""} customerId={customer.customerId} notes={customer.notes} />
        </Section>
      </div>

      <div className="flex flex-col gap-4 lg:order-1">
        <Section title="Direcciones">
          {customer.addresses.length === 0 ? (
            <p className="text-[13.5px] text-slate-500">Sin direcciones guardadas.</p>
          ) : (
            <ul className="flex flex-col gap-3">
              {customer.addresses.map((a) => (
                <li key={a.addressId} className="flex items-start gap-2 text-[13.5px] leading-[1.6] text-ink">
                  <MapPin className="mt-1 h-4 w-4 flex-none text-navy-700" strokeWidth={2} />
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      {a.label && <span className="font-semibold">{a.label}</span>}
                      {a.isDefault && <StatusChip label="Principal" tone="info" />}
                    </div>
                    <p>
                      {a.line1}
                      {a.line2 && <>, {a.line2}</>}
                      {a.neighborhood && <span className="block">{a.neighborhood}</span>}
                    </p>
                    {a.zoneName && <p className="text-slate-500">Zona: {a.zoneName}</p>}
                    {a.reference && <p className="text-slate-500">Ref.: {a.reference}</p>}
                    {(a.recipientName || a.phone) && (
                      <p className="text-slate-500">
                        {a.recipientName}
                        {a.recipientName && a.phone && " · "}
                        {a.phone && <span className="tabular">{a.phone}</span>}
                      </p>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Section>

        <Section title="Pedidos">
          <ResponsiveList
            rows={customer.orders}
            rowKey={(r) => r.orderId}
            columns={columns}
            ariaLabel={`Pedidos de ${customer.name}`}
            empty={<EmptyState icon={Inbox} title="Sin pedidos" description="Este cliente todavía no ha comprado." size="compact" />}
            renderCard={(r) => (
              <Link href={`/admin/pedidos/${r.orderId}`} className="block">
                <ListCard
                  title={r.orderNo}
                  subtitle={fmtDateTime(r.createdAt)}
                  badge={<StatusChip {...ORDER_STATUS_META[r.status]} />}
                  rows={[
                    { label: "Total", value: <Money value={r.total} /> },
                    { label: "Pago", value: <StatusChip {...PAYMENT_STATUS_META[r.paymentStatus]} /> },
                  ]}
                />
              </Link>
            )}
          />
        </Section>
      </div>
    </div>
  );
}
