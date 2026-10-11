import type { Metadata } from "next";
import { LayoutDashboard } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { ActiveDeliveries } from "@/modules/dashboard/components/active-deliveries";
import { KpiTiles } from "@/modules/dashboard/components/kpi-tiles";
import { LowStock } from "@/modules/dashboard/components/low-stock";
import { OrdersByStatus } from "@/modules/dashboard/components/orders-by-status";
import { RecentOrders } from "@/modules/dashboard/components/recent-orders";
import { getDashboardData } from "@/modules/dashboard/queries/dashboard-queries";

export const metadata: Metadata = { title: "Panel" };
export const dynamic = "force-dynamic";

export default async function AdminHomePage() {
  const data = await getDashboardData();

  return (
    <>
      <PageHeader icon={LayoutDashboard} title="Panel" description="Resumen del día: ventas, pedidos, entregas y stock." />

      <KpiTiles kpis={data.kpis} />

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_340px] lg:items-start">
        <div className="flex flex-col gap-4">
          <RecentOrders rows={data.recentOrders} />
          <ActiveDeliveries
            rows={data.activeDeliveries}
            total={data.kpis.deliveriesInProgress + data.kpis.deliveriesUnassigned}
          />
        </div>
        <div className="flex flex-col gap-4">
          <OrdersByStatus rows={data.ordersByStatus} total={data.totalOrders} />
          <LowStock rows={data.lowStock} total={data.kpis.lowStockVariants} threshold={data.kpis.lowStockThreshold} />
        </div>
      </div>
    </>
  );
}
