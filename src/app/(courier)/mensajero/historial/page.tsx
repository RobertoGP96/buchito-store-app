import type { Metadata } from "next";
import { History } from "lucide-react";
import { getSessionCourierId } from "@/lib/auth-guard";
import { PageHeader } from "@/components/page-header";
import { CourierHistory } from "@/modules/deliveries/components/courier-history";
import { CourierInactive } from "@/modules/deliveries/components/courier-inactive";
import {
  COURIER_HISTORY_STATUSES,
  getCourierDeliveryHistory,
  type CourierHistoryStatus,
} from "@/modules/deliveries/queries/delivery-queries";

export const metadata: Metadata = { title: "Historial de entregas" };
export const dynamic = "force-dynamic";

interface CourierHistoryPageProps {
  searchParams: Promise<{ status?: string }>;
}

// Filtra por URL: sin loading.tsx, los chips conservan la lista mientras carga.
export default async function CourierHistoryPage({ searchParams }: CourierHistoryPageProps) {
  const courierId = await getSessionCourierId();
  if (courierId == null) return <CourierInactive />;

  const params = await searchParams;
  const status = (COURIER_HISTORY_STATUSES as readonly string[]).includes(params.status ?? "")
    ? (params.status as CourierHistoryStatus)
    : null;
  const rows = await getCourierDeliveryHistory(courierId, { status: status ?? undefined });

  return (
    <>
      <PageHeader icon={History} title="Historial" description="Tus entregas completadas, fallidas y canceladas." />
      <CourierHistory rows={rows} activeStatus={status} />
    </>
  );
}
