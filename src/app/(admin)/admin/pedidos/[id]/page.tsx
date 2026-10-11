import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Inbox } from "lucide-react";
import { ButtonLink } from "@/components/button-link";
import { PageHeader } from "@/components/page-header";
import { StatusChip } from "@/components/status-chip";
import { OrderActionsBar } from "@/modules/orders/components/order-actions-bar";
import { OrderDetail } from "@/modules/orders/components/order-detail";
import { ORDER_STATUS_META } from "@/modules/orders/lib/labels";
import { getOrderById } from "@/modules/orders/queries/order-queries";
import { RegisterPaymentForm } from "@/modules/payments/components/register-payment-form";
import { outstandingBase } from "@/modules/payments/lib/payment-status";
import { getActivePaymentMethods } from "@/modules/payments/queries/payment-queries";
import { fromBaseAmount } from "@/lib/currency-math";

export const dynamic = "force-dynamic";

interface AdminOrderPageProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: AdminOrderPageProps): Promise<Metadata> {
  const { id } = await params;
  return { title: `Pedido #${id}` };
}

export default async function AdminOrderPage({ params }: AdminOrderPageProps) {
  const { id } = await params;
  const orderId = Number(id);
  if (!Number.isInteger(orderId)) notFound();

  const [order, methods] = await Promise.all([getOrderById(orderId), getActivePaymentMethods()]);
  if (!order) notFound();

  const outstanding = outstandingBase(order.paidBase, order.total);
  const defaultMethod = methods.find((m) => m.name === order.paymentMethodName) ?? methods[0];
  const suggested = defaultMethod
    ? fromBaseAmount(outstanding, order.paymentExchangeRate, defaultMethod.currency.decimalPlaces)
    : 0;

  return (
    <>
      <PageHeader
        icon={Inbox}
        title={order.orderNo}
        description={`Creado por ${order.customerName}`}
        badge={<StatusChip {...ORDER_STATUS_META[order.status]} />}
      >
        <ButtonLink href="/admin/pedidos" variant="ghost" size="sm">
          Volver a pedidos
        </ButtonLink>
      </PageHeader>
      <OrderDetail
        order={order}
        actions={
          <OrderActionsBar
            orderId={order.orderId}
            version={order.version}
            status={order.status}
            fulfillment={order.fulfillment}
            deliveryStatus={order.deliveryStatus}
          />
        }
        paymentActions={
          order.status !== "cancelled" && outstanding > 0 && defaultMethod ? (
            <RegisterPaymentForm
              orderId={order.orderId}
              defaultPaymentMethodId={defaultMethod.paymentMethodId}
              suggestedAmount={suggested}
              currencyCode={defaultMethod.currency.code}
              methods={methods.map((m) => ({ value: String(m.paymentMethodId), label: `${m.name} (${m.currency.code})` }))}
            />
          ) : undefined
        }
        deliveryHref={order.delivery ? "/admin/entregas" : undefined}
      />
    </>
  );
}
