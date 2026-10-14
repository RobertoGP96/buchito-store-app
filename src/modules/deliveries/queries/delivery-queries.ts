import "server-only";
import { db } from "@/lib/db";
import { Prisma } from "@/generated/prisma";
import type { CurrencyInfo } from "@/lib/format";
import { decimalToNumber } from "@/lib/money";
import type { DeliveryAddress } from "@/modules/orders/lib/schemas";
import type { SaleUnit } from "@/modules/products/lib/units";
import type { DeliveryStatus } from "../lib/labels";

export interface DeliveryRow {
  deliveryId: number;
  version: number;
  status: DeliveryStatus;
  orderId: number;
  orderNo: string;
  customerName: string;
  customerPhone: string;
  /** Quien recibe (destinatario del pedido); en pedidos antiguos, el cliente. */
  recipientName: string;
  recipientPhone: string;
  /** Dirección en una línea para la lista; null en pedidos sin dirección. */
  addressLine: string | null;
  zoneName: string | null;
  courierId: number | null;
  courierName: string | null;
  /** En base. */
  fee: number;
  /** Servicio del mensajero fijado al entregar, en base. */
  courierFee: number;
  /** Ya liquidada al mensajero. */
  isPaidToCourier: boolean;
  attempts: number;
  assignedAt: string | null;
  pickedUpAt: string | null;
  deliveredAt: string | null;
  failedAt: string | null;
  failedReason: string | null;
  proofPhotoUrl: string | null;
  createdAt: string;
}

function addressLineOf(address: DeliveryAddress | null): string | null {
  if (!address) return null;
  return [address.line1, address.line2, address.neighborhood].filter(Boolean).join(", ") || null;
}

export interface DeliveryDetailData extends DeliveryRow {
  address: DeliveryAddress | null;
  notes: string | null;
  orderNotes: string | null;
  /** Lo que el mensajero debe cobrar si el pedido no está pagado. */
  amountToCollect: number;
  paymentCurrency: CurrencyInfo;
  paymentMethodName: string;
  paymentStatus: string;
  lines: { productName: string; variantName: string | null; qty: number; unit: SaleUnit }[];
  events: { eventId: number; fromStatus: DeliveryStatus | null; toStatus: DeliveryStatus; actor: string | null; note: string | null; createdAt: string }[];
}

const ROW_INCLUDE = {
  order: { select: { orderId: true, orderNo: true, customerName: true, customerPhone: true, deliveryAddress: true } },
  zone: { select: { name: true } },
  courier: { select: { courierId: true, user: { select: { fullName: true } } } },
} satisfies Prisma.DeliveryInclude;

type Row = Prisma.DeliveryGetPayload<{ include: typeof ROW_INCLUDE }>;

function toRow(row: Row): DeliveryRow {
  const address = (row.order.deliveryAddress as DeliveryAddress | null) ?? null;
  return {
    deliveryId: row.deliveryId,
    version: row.version,
    status: row.status,
    orderId: row.order.orderId,
    orderNo: row.order.orderNo,
    customerName: row.order.customerName,
    customerPhone: row.order.customerPhone,
    recipientName: address?.recipientName ?? row.order.customerName,
    recipientPhone: address?.recipientPhone ?? row.order.customerPhone,
    addressLine: addressLineOf(address),
    zoneName: row.zone?.name ?? null,
    courierId: row.courier?.courierId ?? null,
    courierName: row.courier?.user.fullName ?? null,
    fee: decimalToNumber(row.fee),
    courierFee: decimalToNumber(row.courierFee),
    isPaidToCourier: row.courierPaymentId != null,
    attempts: row.attempts,
    assignedAt: row.assignedAt?.toISOString() ?? null,
    pickedUpAt: row.pickedUpAt?.toISOString() ?? null,
    deliveredAt: row.deliveredAt?.toISOString() ?? null,
    failedAt: row.failedAt?.toISOString() ?? null,
    failedReason: row.failedReason,
    proofPhotoUrl: row.proofPhotoUrl,
    createdAt: row.createdAt.toISOString(),
  };
}

export async function getDeliveries(filters: { status?: DeliveryStatus } = {}): Promise<DeliveryRow[]> {
  const rows = await db.delivery.findMany({
    where: filters.status ? { status: filters.status } : undefined,
    include: ROW_INCLUDE,
    orderBy: [{ createdAt: "desc" }],
    take: 200,
  });
  return rows.map(toRow);
}

/** Entregas activas del mensajero (asignadas o en camino), las más antiguas primero. */
export async function getCourierOpenDeliveries(courierId: number): Promise<DeliveryRow[]> {
  const rows = await db.delivery.findMany({
    where: { courierId, status: { in: ["assigned", "in_transit"] } },
    include: ROW_INCLUDE,
    orderBy: [{ assignedAt: "asc" }],
  });
  return rows.map(toRow);
}

/** Estados que el mensajero ve en su historial. Una fallida reasignada a
 *  otro mensajero ya no aparece: `courierId` apunta al nuevo. */
export type CourierHistoryStatus = Extract<DeliveryStatus, "delivered" | "failed" | "cancelled">;
export const COURIER_HISTORY_STATUSES: readonly CourierHistoryStatus[] = ["delivered", "failed", "cancelled"];

/** Entregas cerradas del mensajero, las más recientes primero. */
export async function getCourierDeliveryHistory(
  courierId: number,
  filters: { status?: CourierHistoryStatus } = {}
): Promise<DeliveryRow[]> {
  const rows = await db.delivery.findMany({
    where: { courierId, status: filters.status ?? { in: [...COURIER_HISTORY_STATUSES] } },
    include: ROW_INCLUDE,
    orderBy: [{ updatedAt: "desc" }],
    take: 100,
  });
  return rows.map(toRow);
}

export interface CourierUnpaidDelivery {
  deliveryId: number;
  orderNo: string;
  deliveredAt: string | null;
  /** En base. */
  courierFee: number;
}

/** Entregas completadas que aún no se le han liquidado al mensajero. */
export async function getCourierUnpaidDeliveries(courierId: number): Promise<CourierUnpaidDelivery[]> {
  const rows = await db.delivery.findMany({
    where: { courierId, status: "delivered", courierPaymentId: null },
    select: { deliveryId: true, deliveredAt: true, courierFee: true, order: { select: { orderNo: true } } },
    orderBy: [{ deliveredAt: "desc" }],
    take: 100,
  });
  return rows.map((row) => ({
    deliveryId: row.deliveryId,
    orderNo: row.order.orderNo,
    deliveredAt: row.deliveredAt?.toISOString() ?? null,
    courierFee: decimalToNumber(row.courierFee),
  }));
}

const DETAIL_INCLUDE = {
  ...ROW_INCLUDE,
  order: {
    select: {
      orderId: true,
      orderNo: true,
      customerName: true,
      customerPhone: true,
      deliveryAddress: true,
      notes: true,
      paymentStatus: true,
      paymentMethodName: true,
      totalInPaymentCurrency: true,
      paidBase: true,
      total: true,
      paymentExchangeRate: true,
      paymentCurrency: true,
      lines: { select: { productName: true, variantName: true, qty: true, unit: true } },
    },
  },
  events: { orderBy: { createdAt: "desc" as const }, include: { actor: { select: { fullName: true } } } },
} satisfies Prisma.DeliveryInclude;

type DetailRow = Prisma.DeliveryGetPayload<{ include: typeof DETAIL_INCLUDE }>;

function toDetail(row: DetailRow): DeliveryDetailData {
  const base = toRow(row);
  const order = row.order;
  const outstandingBase = Math.max(0, decimalToNumber(order.total) - decimalToNumber(order.paidBase));
  const rate = decimalToNumber(order.paymentExchangeRate) || 1;
  const currency = order.paymentCurrency;
  const factor = 10 ** currency.decimalPlaces;
  return {
    ...base,
    address: (order.deliveryAddress as DeliveryAddress | null) ?? null,
    notes: row.notes,
    orderNotes: order.notes,
    amountToCollect: Math.round((outstandingBase / rate + Number.EPSILON) * factor) / factor,
    paymentCurrency: {
      currencyId: currency.currencyId,
      code: currency.code,
      symbol: currency.symbol,
      decimalPlaces: currency.decimalPlaces,
    },
    paymentMethodName: order.paymentMethodName,
    paymentStatus: order.paymentStatus,
    lines: order.lines.map((l) => ({ ...l, qty: decimalToNumber(l.qty) })),
    events: row.events.map((e) => ({
      eventId: e.eventId,
      fromStatus: e.fromStatus,
      toStatus: e.toStatus,
      actor: e.actor?.fullName ?? null,
      note: e.note,
      createdAt: e.createdAt.toISOString(),
    })),
  };
}

/** Solo la entrega asignada a ese mensajero: una ajena es un 404, no un 403. */
export async function getDeliveryForCourier(deliveryId: number, courierId: number): Promise<DeliveryDetailData | null> {
  const row = await db.delivery.findFirst({ where: { deliveryId, courierId }, include: DETAIL_INCLUDE });
  return row ? toDetail(row) : null;
}

export async function getDeliveryCounts(): Promise<{ inTransit: number; pending: number }> {
  const [inTransit, pending] = await Promise.all([
    db.delivery.count({ where: { status: { in: ["assigned", "in_transit"] } } }),
    db.delivery.count({ where: { status: "pending" } }),
  ]);
  return { inTransit, pending };
}
