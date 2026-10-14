import type { Metadata } from "next";
import { PackageCheck } from "lucide-react";
import { auth } from "@/lib/auth";
import { STORE_NAME } from "@/lib/config";
import { fmt } from "@/lib/format";
import { buildWhatsappLink } from "@/lib/whatsapp";
import { ButtonLink } from "@/components/button-link";
import { EmptyState } from "@/components/empty-state";
import { ScreenHeader } from "@/components/screen-header";
import { CancelMyOrderButton } from "@/modules/orders/components/cancel-my-order-button";
import { OrderDetail } from "@/modules/orders/components/order-detail";
import { PaymentContactCard } from "@/modules/orders/components/payment-contact-card";
import {
  buildPaymentContactMessage,
  needsPaymentContact,
  outstandingInPaymentCurrency,
} from "@/modules/orders/lib/payment-contact";
import { orderScreenCopy } from "@/modules/orders/lib/labels";
import { getOrderByNo, type OrderDetailData } from "@/modules/orders/queries/order-queries";
import { getStoreSettingsSafe, type StoreSettingsData } from "@/modules/settings/queries/settings-queries";

export const metadata: Metadata = { title: "Pedido" };
export const dynamic = "force-dynamic";

interface OrderConfirmedPageProps {
  params: Promise<{ orderNo: string }>;
}

/** Botón de WhatsApp para coordinar el pago: solo con número configurado. El
 *  número nunca se pinta; viaja en el href. Sin settings (DB caída) no hay paso. */
function buildPaymentContact(order: OrderDetailData, settings: StoreSettingsData | null) {
  const amount = outstandingInPaymentCurrency(order);
  // Un saldo que redondea a 0 en la moneda de pago no se puede cobrar.
  if (amount <= 0) return null;
  const href = buildWhatsappLink(
    settings?.whatsappPhone,
    buildPaymentContactMessage({
      storeName: settings?.storeName ?? STORE_NAME,
      orderNo: order.orderNo,
      customerName: order.customerName,
      amountLabel: fmt(amount, order.paymentCurrency),
      paymentMethodName: order.paymentMethodName,
      partial: order.paymentStatus === "partial",
    })
  );
  return href ? { href, amount } : null;
}

export default async function OrderConfirmedPage({ params }: OrderConfirmedPageProps) {
  const { orderNo } = await params;
  const [order, session, settings] = await Promise.all([
    getOrderByNo(decodeURIComponent(orderNo)),
    auth(),
    getStoreSettingsSafe(),
  ]);

  // El número de pedido actúa como enlace compartible para invitados; un
  // pedido con cuenta solo lo ve su dueño (o el admin).
  const visible =
    order &&
    (order.customerUserId == null ||
      session?.user.userId === order.customerUserId ||
      session?.user.role === "admin");

  if (!order || !visible) {
    return (
      <div className="flex flex-1 flex-col">
        <EmptyState
          icon={PackageCheck}
          eyebrow={`Pedido ${decodeURIComponent(orderNo)}`}
          title="No encontramos este pedido"
          description="Revisa el número de pedido o consulta tus pedidos desde tu perfil."
          ctaLabel="Mis pedidos"
          ctaHref="/perfil/pedidos"
        />
      </div>
    );
  }

  // El admin gestiona el pedido desde su panel: el paso de WhatsApp es del cliente.
  const contact =
    needsPaymentContact(order) && session?.user.role !== "admin" ? buildPaymentContact(order, settings) : null;

  const copy = orderScreenCopy(order.status, order.fulfillment);
  // Solo su dueño cancela, y solo mientras nadie lo ha confirmado.
  const canCancel =
    order.status === "pending" && order.customerUserId != null && session?.user.userId === order.customerUserId;

  return (
    <>
      <ScreenHeader
        eyebrow={copy.eyebrow}
        title={order.orderNo}
        description={
          !contact
            ? copy.description
            : order.status === "pending"
              ? "Un paso más: coordina el pago por WhatsApp y te avisaremos cuando esté en camino."
              : "Tienes un pago pendiente: coordínalo por WhatsApp con nuestro equipo."
        }
        backHref={session ? "/perfil/pedidos" : undefined}
      >
        <ButtonLink href="/catalogo" variant="outline" size="sm">
          Seguir comprando
        </ButtonLink>
      </ScreenHeader>
      <div className="mx-auto flex w-full max-w-[1120px] flex-col gap-4 px-5 pb-12 md:px-6">
        {contact && <PaymentContactCard order={order} href={contact.href} amount={contact.amount} />}
        <OrderDetail
          order={order}
          actions={canCancel ? <CancelMyOrderButton orderId={order.orderId} version={order.version} /> : undefined}
        />
      </div>
    </>
  );
}
