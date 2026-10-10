import type { Metadata } from "next";
import { PackageCheck } from "lucide-react";
import { EmptyState } from "@/components/empty-state";

export const metadata: Metadata = { title: "Pedido confirmado" };
export const dynamic = "force-dynamic";

interface OrderConfirmedPageProps {
  params: Promise<{ orderNo: string }>;
}

export default async function OrderConfirmedPage({ params }: OrderConfirmedPageProps) {
  const { orderNo } = await params;
  return (
    <div className="flex flex-1 flex-col">
      <EmptyState
        icon={PackageCheck}
        iconColor="text-ok"
        eyebrow={`Pedido ${decodeURIComponent(orderNo)}`}
        title="No encontramos este pedido"
        description="Revisa el número de pedido o consulta tus pedidos desde tu perfil."
        ctaLabel="Mis pedidos"
        ctaHref="/perfil/pedidos"
      />
    </div>
  );
}
