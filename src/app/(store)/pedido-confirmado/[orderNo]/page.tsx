import type { Metadata } from "next";
import { PackageCheck } from "lucide-react";
import { auth } from "@/lib/auth";
import { ButtonLink } from "@/components/button-link";
import { EmptyState } from "@/components/empty-state";
import { ScreenHeader } from "@/components/screen-header";
import { OrderDetail } from "@/modules/orders/components/order-detail";
import { getOrderByNo } from "@/modules/orders/queries/order-queries";

export const metadata: Metadata = { title: "Pedido" };
export const dynamic = "force-dynamic";

interface OrderConfirmedPageProps {
  params: Promise<{ orderNo: string }>;
}

export default async function OrderConfirmedPage({ params }: OrderConfirmedPageProps) {
  const { orderNo } = await params;
  const [order, session] = await Promise.all([getOrderByNo(decodeURIComponent(orderNo)), auth()]);

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

  return (
    <>
      <ScreenHeader
        eyebrow="Pedido recibido"
        title={order.orderNo}
        description="Te avisaremos cuando esté en camino. Guarda este número para cualquier consulta."
        backHref={session ? "/perfil/pedidos" : undefined}
      >
        <ButtonLink href="/catalogo" variant="outline" size="sm">
          Seguir comprando
        </ButtonLink>
      </ScreenHeader>
      <div className="mx-auto w-full max-w-[1120px] px-5 pb-12 md:px-6">
        <OrderDetail order={order} />
      </div>
    </>
  );
}
