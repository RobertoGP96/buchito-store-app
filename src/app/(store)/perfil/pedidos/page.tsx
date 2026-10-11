import type { Metadata } from "next";
import Link from "next/link";
import { ChevronRight, Package } from "lucide-react";
import { auth } from "@/lib/auth";
import { fmtDateTime } from "@/lib/format";
import { EmptyState } from "@/components/empty-state";
import { Money } from "@/components/money";
import { ScreenHeader } from "@/components/screen-header";
import { StatusChip } from "@/components/status-chip";
import { FULFILLMENT_LABELS, ORDER_STATUS_META } from "@/modules/orders/lib/labels";
import { getOrdersForUser } from "@/modules/orders/queries/order-queries";

export const metadata: Metadata = { title: "Mis pedidos" };
export const dynamic = "force-dynamic";

export default async function MyOrdersPage() {
  const session = await auth();
  const orders = await getOrdersForUser(session!.user.userId);

  return (
    <>
      <ScreenHeader eyebrow="Tu cuenta" title="Mis pedidos" backHref="/perfil" />
      <div className="mx-auto flex w-full max-w-[1120px] flex-1 flex-col px-5 pb-10 md:px-6">
        {orders.length === 0 ? (
          <EmptyState
            icon={Package}
            title="Todavía no tienes pedidos"
            description="Cuando hagas tu primera compra, aquí verás su estado y seguimiento."
            ctaLabel="Ir al catálogo"
            ctaHref="/catalogo"
          />
        ) : (
          <ul className="flex flex-col gap-3">
            {orders.map((order) => (
              <li key={order.orderId}>
                <Link
                  href={`/pedido-confirmado/${encodeURIComponent(order.orderNo)}`}
                  className="flex items-center gap-4 rounded-card bg-canvas p-4 shadow-card transition-shadow duration-200 hover:shadow-float"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-semibold text-ink">{order.orderNo}</p>
                      <StatusChip {...ORDER_STATUS_META[order.status]} />
                    </div>
                    <p className="tabular mt-1 text-[12.5px] text-slate-400">
                      {fmtDateTime(order.createdAt)} · {FULFILLMENT_LABELS[order.fulfillment]} · {order.lineCount}{" "}
                      {order.lineCount === 1 ? "artículo" : "artículos"}
                    </p>
                  </div>
                  <Money value={order.total} className="font-semibold text-navy-900" />
                  <ChevronRight className="h-4 w-4 flex-none text-slate-300" strokeWidth={2} />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </>
  );
}
