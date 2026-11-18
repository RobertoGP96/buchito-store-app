import "server-only";
import { db } from "@/lib/db";
import { decimalToNumber } from "@/lib/money";
import type { DeliveryStatus } from "@/modules/deliveries/lib/labels";
import { ORDER_STATUSES, type OrderStatus } from "@/modules/orders/lib/labels";
import type { PaymentStatus } from "@/modules/payments/lib/labels";
import type { SaleUnit } from "@/modules/products/lib/units";
import { getStoreSettings } from "@/modules/settings/queries/settings-queries";
import { buildDailySeries, pctChange, type SalesDay } from "../lib/sales-series";

export interface DashboardKpis {
  /** Σ total (base) de pedidos creados hoy con status ≠ cancelled. */
  salesToday: number;
  ordersToday: number;
  /** Variación (%) frente a ayer; `null` si ayer no hubo ventas. */
  salesTodayDelta: number | null;
  /** Σ total (base) de los últimos 7 días (hoy incluido), status ≠ cancelled. */
  salesLast7Days: number;
  ordersLast7Days: number;
  /** Variación (%) frente a los 7 días anteriores. */
  salesLast7DaysDelta: number | null;
  /** Σ (total − paidBase) de pedidos no cancelados y no pagados. */
  receivable: number;
  receivableOrders: number;
  pendingOrders: number;
  readyOrders: number;
  /** assigned + in_transit */
  deliveriesInProgress: number;
  deliveriesUnassigned: number;
  lowStockVariants: number;
  lowStockThreshold: number;
}

export interface OrderStatusCount {
  status: OrderStatus;
  count: number;
}

export interface RecentOrderRow {
  orderId: number;
  orderNo: string;
  customerName: string;
  /** En base. */
  total: number;
  status: OrderStatus;
  paymentStatus: PaymentStatus;
  createdAt: string;
}

export interface ActiveDeliveryRow {
  deliveryId: number;
  orderId: number;
  orderNo: string;
  customerName: string;
  zoneName: string | null;
  courierName: string | null;
  status: DeliveryStatus;
}

export interface LowStockVariantRow {
  variantId: number;
  productId: number;
  productName: string;
  variantName: string | null;
  sku: string;
  unit: SaleUnit;
  stock: number;
}

export interface DashboardData {
  kpis: DashboardKpis;
  /** Ventas por día (base), el más antiguo primero. Trae el doble del rango
   *  mayor de la gráfica para poder comparar con el periodo anterior. */
  salesSeries: SalesDay[];
  ordersByStatus: OrderStatusCount[];
  totalOrders: number;
  recentOrders: RecentOrderRow[];
  activeDeliveries: ActiveDeliveryRow[];
  lowStock: LowStockVariantRow[];
}

const RECENT_LIMIT = 8;
/** Rango mayor de la gráfica de ventas, en días. */
export const SALES_CHART_MAX_DAYS = 30;
const ACTIVE_DELIVERY_STATUSES: DeliveryStatus[] = ["pending", "assigned", "in_transit"];

/** Medianoche local del proceso: el "día" del panel es el del servidor. */
function startOfLocalDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

export async function getDashboardData(): Promise<DashboardData> {
  const now = new Date();
  const todayStart = startOfLocalDay(now);
  const weekStart = new Date(todayStart);
  weekStart.setDate(weekStart.getDate() - 6);
  const seriesDays = SALES_CHART_MAX_DAYS * 2;
  const seriesStart = new Date(todayStart);
  seriesStart.setDate(seriesStart.getDate() - (seriesDays - 1));

  const notCancelled = { status: { not: "cancelled" as const } };

  const [settings, today, week, receivable, orderGroups, deliveryGroups, recentOrders, activeDeliveries, seriesOrders] =
    await Promise.all([
      getStoreSettings(),
      db.order.aggregate({
        where: { ...notCancelled, createdAt: { gte: todayStart } },
        _sum: { total: true },
        _count: { _all: true },
      }),
      db.order.aggregate({
        where: { ...notCancelled, createdAt: { gte: weekStart } },
        _sum: { total: true },
        _count: { _all: true },
      }),
      db.order.aggregate({
        where: { ...notCancelled, paymentStatus: { not: "paid" } },
        _sum: { total: true, paidBase: true },
        _count: { _all: true },
      }),
      db.order.groupBy({ by: ["status"], _count: { _all: true } }),
      db.delivery.groupBy({
        by: ["status"],
        where: { status: { in: ACTIVE_DELIVERY_STATUSES } },
        _count: { _all: true },
      }),
      db.order.findMany({
        orderBy: { createdAt: "desc" },
        take: RECENT_LIMIT,
        select: {
          orderId: true,
          orderNo: true,
          customerName: true,
          total: true,
          status: true,
          paymentStatus: true,
          createdAt: true,
        },
      }),
      db.delivery.findMany({
        where: { status: { in: ACTIVE_DELIVERY_STATUSES } },
        // Las más antiguas primero: son las que más urge atender.
        orderBy: { createdAt: "asc" },
        take: RECENT_LIMIT,
        select: {
          deliveryId: true,
          status: true,
          order: { select: { orderId: true, orderNo: true, customerName: true } },
          zone: { select: { name: true } },
          courier: { select: { user: { select: { fullName: true } } } },
        },
      }),
      // Los días se agrupan en la app y no con `date_trunc`: el día del panel
      // es el local del servidor, no el UTC de la base.
      db.order.findMany({
        where: { ...notCancelled, createdAt: { gte: seriesStart } },
        select: { createdAt: true, total: true },
      }),
    ]);

  const salesSeries = buildDailySeries(
    seriesOrders.map((o) => ({ createdAt: o.createdAt, total: decimalToNumber(o.total) })),
    seriesDays,
    now
  );
  const sumDays = (from: number, to?: number) => salesSeries.slice(from, to).reduce((acc, day) => acc + day.total, 0);

  // El umbral viene de la configuración, por eso va en una segunda tanda.
  const lowStockWhere = {
    isActive: true,
    stock: { lte: settings.lowStockThreshold },
    product: { status: "active" as const },
  };
  const [lowStockCount, lowStockRows] = await Promise.all([
    db.productVariant.count({ where: lowStockWhere }),
    db.productVariant.findMany({
      where: lowStockWhere,
      orderBy: [{ stock: "asc" }, { updatedAt: "desc" }],
      take: RECENT_LIMIT,
      select: {
        variantId: true,
        sku: true,
        name: true,
        unit: true,
        stock: true,
        product: { select: { productId: true, name: true } },
      },
    }),
  ]);

  const byStatus: Record<OrderStatus, number> = {
    pending: 0,
    confirmed: 0,
    ready: 0,
    out_for_delivery: 0,
    delivered: 0,
    cancelled: 0,
  };
  for (const g of orderGroups) byStatus[g.status] = g._count._all;

  const deliveryByStatus: Partial<Record<DeliveryStatus, number>> = {};
  for (const g of deliveryGroups) deliveryByStatus[g.status] = g._count._all;

  const receivableTotal = decimalToNumber(receivable._sum.total) - decimalToNumber(receivable._sum.paidBase);

  return {
    kpis: {
      salesToday: decimalToNumber(today._sum.total),
      ordersToday: today._count._all,
      salesTodayDelta: pctChange(sumDays(-1), sumDays(-2, -1)),
      salesLast7Days: decimalToNumber(week._sum.total),
      ordersLast7Days: week._count._all,
      salesLast7DaysDelta: pctChange(sumDays(-7), sumDays(-14, -7)),
      receivable: Math.max(0, receivableTotal),
      receivableOrders: receivable._count._all,
      pendingOrders: byStatus.pending,
      readyOrders: byStatus.ready,
      deliveriesInProgress: (deliveryByStatus.assigned ?? 0) + (deliveryByStatus.in_transit ?? 0),
      deliveriesUnassigned: deliveryByStatus.pending ?? 0,
      lowStockVariants: lowStockCount,
      lowStockThreshold: settings.lowStockThreshold,
    },
    salesSeries,
    ordersByStatus: ORDER_STATUSES.map((status) => ({ status, count: byStatus[status] })),
    totalOrders: ORDER_STATUSES.reduce((sum, status) => sum + byStatus[status], 0),
    recentOrders: recentOrders.map((o) => ({
      orderId: o.orderId,
      orderNo: o.orderNo,
      customerName: o.customerName,
      total: decimalToNumber(o.total),
      status: o.status,
      paymentStatus: o.paymentStatus,
      createdAt: o.createdAt.toISOString(),
    })),
    activeDeliveries: activeDeliveries.map((d) => ({
      deliveryId: d.deliveryId,
      orderId: d.order.orderId,
      orderNo: d.order.orderNo,
      customerName: d.order.customerName,
      zoneName: d.zone?.name ?? null,
      courierName: d.courier?.user.fullName ?? null,
      status: d.status,
    })),
    lowStock: lowStockRows.map((v) => ({
      variantId: v.variantId,
      productId: v.product.productId,
      productName: v.product.name,
      variantName: v.name,
      sku: v.sku,
      unit: v.unit,
      stock: decimalToNumber(v.stock),
    })),
  };
}
