import type { Metadata } from "next";
import { TicketPercent } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { CouponList } from "@/modules/coupons/components/coupon-list";
import { getCoupons } from "@/modules/coupons/queries/coupon-queries";

export const metadata: Metadata = { title: "Cupones" };
export const dynamic = "force-dynamic";

export default async function AdminCouponsPage() {
  const rows = await getCoupons();
  return (
    <>
      <PageHeader
        icon={TicketPercent}
        title="Cupones"
        description="Códigos de descuento por porcentaje o monto fijo en la moneda base."
      />
      <CouponList rows={rows} />
    </>
  );
}
