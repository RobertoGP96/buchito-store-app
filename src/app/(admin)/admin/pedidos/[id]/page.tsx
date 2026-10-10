import { notFound } from "next/navigation";

export const dynamic = "force-dynamic";

interface AdminOrderPageProps {
  params: Promise<{ id: string }>;
}

export default async function AdminOrderPage({ params }: AdminOrderPageProps) {
  await params;
  // Fase D: getOrderById + OrderDetail.
  notFound();
}
