import type { Metadata } from "next";
import { Inbox } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { OrderList } from "@/modules/orders/components/order-list";
import { ORDER_STATUSES, type OrderStatus } from "@/modules/orders/lib/labels";
import { getOrderCounts, getOrders } from "@/modules/orders/queries/order-queries";

export const metadata: Metadata = { title: "Pedidos" };
export const dynamic = "force-dynamic";

interface AdminOrdersPageProps {
  searchParams: Promise<{ status?: string }>;
}

export default async function AdminOrdersPage({ searchParams }: AdminOrdersPageProps) {
  const params = await searchParams;
  const status = (ORDER_STATUSES as readonly string[]).includes(params.status ?? "")
    ? (params.status as OrderStatus)
    : null;
  const [rows, counts] = await Promise.all([getOrders({ status: status ?? undefined }), getOrderCounts()]);
  return (
    <>
      <PageHeader icon={Inbox} title="Pedidos" description="Pedidos de la tienda por estado." />
      <OrderList rows={rows} activeStatus={status} counts={counts.byStatus} />
    </>
  );
}
