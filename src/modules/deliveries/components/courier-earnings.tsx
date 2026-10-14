import Link from "next/link";
import { ChevronRight, Wallet } from "lucide-react";
import { EmptyState } from "@/components/empty-state";
import { Money } from "@/components/money";
import { fmtDate, fmtDateTime } from "@/lib/format";
import type { CourierEarnings as Earnings, CourierOwnPayment } from "../queries/courier-payment-queries";
import type { CourierUnpaidDelivery } from "../queries/delivery-queries";

interface CourierEarningsProps {
  earnings: Earnings;
  /** Tarifa vigente por entrega, en base. */
  deliveryFee: number;
  unpaid: CourierUnpaidDelivery[];
  payments: CourierOwnPayment[];
}

function Section({ title, hint, children }: { title: string; hint?: React.ReactNode; children: React.ReactNode }) {
  return (
    <section className="rounded-card bg-canvas p-5 shadow-card">
      <div className="flex items-baseline justify-between gap-3">
        <p className="eyebrow">{title}</p>
        {hint && <span className="text-[12.5px] text-slate-500">{hint}</span>}
      </div>
      <div className="mt-3">{children}</div>
    </section>
  );
}

/** Lo que el mensajero tiene por cobrar y lo que ya se le liquidó. Todo en
 *  moneda base; la app del mensajero está bloqueada a base. */
export function CourierEarnings({ earnings, deliveryFee, unpaid, payments }: CourierEarningsProps) {
  const stats = [
    {
      label: "Por cobrar",
      value: <Money value={earnings.pendingFees} />,
      hint: `${earnings.pendingCount} ${earnings.pendingCount === 1 ? "entrega" : "entregas"}`,
    },
    { label: "Cobrado", value: <Money value={earnings.paidTotal} />, hint: `${payments.length} ${payments.length === 1 ? "pago" : "pagos"}` },
    { label: "Por entrega", value: <Money value={deliveryFee} />, hint: "tarifa actual" },
  ];

  return (
    <>
      {/* En móvil, dos columnas y el último dato a lo ancho: tres no dejan sitio a los montos. */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {stats.map((stat) => (
          <div key={stat.label} className="rounded-card bg-canvas p-3.5 shadow-card last:col-span-2 sm:p-4 sm:last:col-span-1">
            <p className="font-display truncate text-[20px] leading-none text-navy-900 sm:text-[22px]">{stat.value}</p>
            <p className="mt-2 text-[11.5px] font-medium text-slate-500 sm:text-[12.5px]">{stat.label}</p>
            <p className="tabular mt-0.5 text-[11.5px] text-slate-400">{stat.hint}</p>
          </div>
        ))}
      </div>

      <Section title="Pendiente de liquidar" hint={unpaid.length > 0 ? <Money value={earnings.pendingFees} className="font-semibold text-navy-900" /> : undefined}>
        {unpaid.length === 0 ? (
          <p className="text-[13.5px] text-slate-500">No tienes entregas sin liquidar.</p>
        ) : (
          <ul className="divide-y divide-line-soft">
            {unpaid.map((d) => (
              <li key={d.deliveryId}>
                <Link
                  href={`/mensajero/entregas/${d.deliveryId}`}
                  className="flex items-center justify-between gap-3 py-2.5 text-[14px]"
                >
                  <span className="min-w-0">
                    <span className="font-semibold text-ink">{d.orderNo}</span>
                    {d.deliveredAt && <span className="tabular block text-[12.5px] text-slate-500">{fmtDateTime(d.deliveredAt)}</span>}
                  </span>
                  <span className="flex items-center gap-2">
                    <Money value={d.courierFee} className="font-semibold text-navy-900" />
                    <ChevronRight className="h-4 w-4 text-slate-300" strokeWidth={2} />
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </Section>

      <Section title="Liquidaciones recibidas">
        {payments.length === 0 ? (
          <div className="-mx-5 -mb-5">
            <EmptyState
              icon={Wallet}
              title="Aún no has recibido pagos"
              description="Cuando la tienda te liquide tus entregas, cada pago aparecerá aquí."
              size="compact"
            />
          </div>
        ) : (
          <ul className="divide-y divide-line-soft">
            {payments.map((p) => (
              <li key={p.courierPaymentId} className="flex items-start justify-between gap-3 py-2.5 text-[14px]">
                <div className="min-w-0">
                  <p className="tabular font-semibold text-ink">{fmtDate(p.paidAt)}</p>
                  <p className="text-[12.5px] text-slate-500">
                    {p.deliveryCount} {p.deliveryCount === 1 ? "entrega" : "entregas"}
                    {p.notes && <span> · {p.notes}</span>}
                  </p>
                </div>
                <Money value={p.amountBase} className="font-semibold text-navy-900" />
              </li>
            ))}
          </ul>
        )}
      </Section>
    </>
  );
}
