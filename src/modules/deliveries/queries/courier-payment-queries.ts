import "server-only";
import { db } from "@/lib/db";
import { decimalToNumber } from "@/lib/money";

/** Saldo de cada mensajero: entregas completadas sin liquidar y lo ya pagado. */
export interface CourierBalanceRow {
  courierId: number;
  fullName: string;
  active: boolean;
  /** Tarifa actual por entrega, en base. */
  deliveryFee: number;
  pendingCount: number;
  /** Σ courierFee de las entregas completadas sin liquidar, en base. */
  pendingFees: number;
  paidTotal: number;
  lastPaidAt: string | null;
}

export async function getCourierBalances(): Promise<CourierBalanceRow[]> {
  const rows = await db.courier.findMany({
    orderBy: { user: { fullName: "asc" } },
    include: {
      user: { select: { fullName: true } },
      deliveries: {
        where: { status: "delivered", courierPaymentId: null },
        select: { courierFee: true },
      },
      payments: { orderBy: { paidAt: "desc" }, select: { amountBase: true, paidAt: true } },
    },
  });
  return rows.map((row) => ({
    courierId: row.courierId,
    fullName: row.user.fullName,
    active: row.active,
    deliveryFee: decimalToNumber(row.deliveryFee),
    pendingCount: row.deliveries.length,
    pendingFees: row.deliveries.reduce((sum, d) => sum + decimalToNumber(d.courierFee), 0),
    paidTotal: row.payments.reduce((sum, p) => sum + decimalToNumber(p.amountBase), 0),
    lastPaidAt: row.payments[0]?.paidAt.toISOString() ?? null,
  }));
}

export interface CourierPaymentRow {
  courierPaymentId: number;
  courierId: number;
  courierName: string;
  amountBase: number;
  feesBase: number;
  deliveryCount: number;
  notes: string | null;
  paidBy: string | null;
  paidAt: string;
}

export interface CourierPaymentsResult {
  rows: CourierPaymentRow[];
  totalBase: number;
}

export async function getCourierPayments(filter: { from?: Date } = {}): Promise<CourierPaymentsResult> {
  const rows = await db.courierPayment.findMany({
    where: filter.from ? { paidAt: { gte: filter.from } } : undefined,
    orderBy: [{ paidAt: "desc" }, { courierPaymentId: "desc" }],
    take: 200,
    include: {
      courier: { select: { courierId: true, user: { select: { fullName: true } } } },
      paidBy: { select: { fullName: true } },
    },
  });
  let totalBase = 0;
  const mapped = rows.map((p) => {
    const amountBase = decimalToNumber(p.amountBase);
    totalBase += amountBase;
    return {
      courierPaymentId: p.courierPaymentId,
      courierId: p.courier.courierId,
      courierName: p.courier.user.fullName,
      amountBase,
      feesBase: decimalToNumber(p.feesBase),
      deliveryCount: p.deliveryCount,
      notes: p.notes,
      paidBy: p.paidBy?.fullName ?? null,
      paidAt: p.paidAt.toISOString(),
    };
  });
  return { rows: mapped, totalBase };
}

export interface CourierOwnPayment {
  courierPaymentId: number;
  amountBase: number;
  feesBase: number;
  deliveryCount: number;
  notes: string | null;
  paidAt: string;
}

/** Liquidaciones recibidas por un mensajero, para su app. */
export async function getCourierPaymentsFor(courierId: number): Promise<CourierOwnPayment[]> {
  const rows = await db.courierPayment.findMany({
    where: { courierId },
    orderBy: [{ paidAt: "desc" }, { courierPaymentId: "desc" }],
    take: 100,
    select: { courierPaymentId: true, amountBase: true, feesBase: true, deliveryCount: true, notes: true, paidAt: true },
  });
  return rows.map((p) => ({
    courierPaymentId: p.courierPaymentId,
    amountBase: decimalToNumber(p.amountBase),
    feesBase: decimalToNumber(p.feesBase),
    deliveryCount: p.deliveryCount,
    notes: p.notes,
    paidAt: p.paidAt.toISOString(),
  }));
}

/** Lo que ve el mensajero en su app: entregas completadas y lo que se le debe. */
export interface CourierEarnings {
  deliveredCount: number;
  pendingCount: number;
  pendingFees: number;
  paidTotal: number;
}

export async function getCourierEarnings(courierId: number): Promise<CourierEarnings> {
  const [delivered, pending, paid] = await Promise.all([
    db.delivery.count({ where: { courierId, status: "delivered" } }),
    db.delivery.aggregate({
      where: { courierId, status: "delivered", courierPaymentId: null },
      _sum: { courierFee: true },
      _count: { _all: true },
    }),
    db.courierPayment.aggregate({ where: { courierId }, _sum: { amountBase: true } }),
  ]);
  return {
    deliveredCount: delivered,
    pendingCount: pending._count._all,
    pendingFees: decimalToNumber(pending._sum.courierFee),
    paidTotal: decimalToNumber(paid._sum.amountBase),
  };
}
