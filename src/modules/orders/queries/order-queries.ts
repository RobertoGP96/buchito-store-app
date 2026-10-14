import "server-only";
import { db } from "@/lib/db";
import { Prisma } from "@/generated/prisma";
import type { CurrencyInfo } from "@/lib/format";
import { decimalToNullableNumber, decimalToNumber } from "@/lib/money";
import type { DeliveryStatus } from "@/modules/deliveries/lib/labels";
import type { PaymentStatus } from "@/modules/payments/lib/labels";
import type { SaleUnit } from "@/modules/products/lib/units";
import type { FulfillmentType, OrderStatus } from "../lib/labels";
import type { DeliveryAddress } from "../lib/schemas";

export interface OrderSummaryRow {
  orderId: number;
  orderNo: string;
  status: OrderStatus;
  paymentStatus: PaymentStatus;
  fulfillment: FulfillmentType;
  customerName: string;
  customerPhone: string;
  /** En base. */
  total: number;
  totalInPaymentCurrency: number;
  paymentCurrency: CurrencyInfo;
  paymentMethodName: string;
  lineCount: number;
  deliveryStatus: DeliveryStatus | null;
  createdAt: string;
}

export interface OrderLineRow {
  lineId: number;
  productName: string;
  variantName: string | null;
  sku: string;
  /** En `unit` (snapshot de la unidad de la variante). */
  qty: number;
  unit: SaleUnit;
  unitPrice: number;
  lineTotal: number;
  imageUrl: string | null;
  /** Costo de compra por unidad en base (snapshot); null si no se registró. */
  unitCost: number | null;
  /** Línea generada por un combo: las del mismo combo se agrupan en la ficha. */
  comboId: number | null;
  comboName: string | null;
  comboQty: number | null;
}

export interface OrderPaymentRow {
  paymentId: number;
  methodName: string;
  amountTendered: number;
  currency: CurrencyInfo;
  exchangeRate: number;
  amountBase: number;
  reference: string | null;
  receivedBy: string | null;
  paidAt: string;
}

export interface OrderDetailData extends OrderSummaryRow {
  version: number;
  customerId: number;
  customerUserId: number | null;
  customerEmail: string | null;
  baseCurrency: CurrencyInfo;
  subtotal: number;
  shippingFee: number;
  discount: number;
  paymentSurcharge: number;
  paidBase: number;
  paymentExchangeRate: number;
  /** Instrucciones vigentes del método (cuenta, etc.) para coordinar el pago. */
  paymentInstructions: string | null;
  couponCode: string | null;
  zoneName: string | null;
  deliveryAddress: DeliveryAddress | null;
  notes: string | null;
  cancelReason: string | null;
  confirmedAt: string | null;
  readyAt: string | null;
  deliveredAt: string | null;
  cancelledAt: string | null;
  lines: OrderLineRow[];
  payments: OrderPaymentRow[];
  delivery: {
    deliveryId: number;
    status: DeliveryStatus;
    courierName: string | null;
    assignedAt: string | null;
    deliveredAt: string | null;
    failedReason: string | null;
  } | null;
}

const SUMMARY_INCLUDE = {
  paymentCurrency: true,
  _count: { select: { lines: true } },
  delivery: { select: { status: true } },
} satisfies Prisma.OrderInclude;

type SummaryRow = Prisma.OrderGetPayload<{ include: typeof SUMMARY_INCLUDE }>;

function toCurrency(c: { currencyId: number; code: string; symbol: string; decimalPlaces: number }): CurrencyInfo {
  return { currencyId: c.currencyId, code: c.code, symbol: c.symbol, decimalPlaces: c.decimalPlaces };
}

function toSummary(row: SummaryRow): OrderSummaryRow {
  return {
    orderId: row.orderId,
    orderNo: row.orderNo,
    status: row.status,
    paymentStatus: row.paymentStatus,
    fulfillment: row.fulfillment,
    customerName: row.customerName,
    customerPhone: row.customerPhone,
    total: decimalToNumber(row.total),
    totalInPaymentCurrency: decimalToNumber(row.totalInPaymentCurrency),
    paymentCurrency: toCurrency(row.paymentCurrency),
    paymentMethodName: row.paymentMethodName,
    lineCount: row._count.lines,
    deliveryStatus: row.delivery?.status ?? null,
    createdAt: row.createdAt.toISOString(),
  };
}

export async function getOrders(filters: { status?: OrderStatus } = {}): Promise<OrderSummaryRow[]> {
  const rows = await db.order.findMany({
    where: filters.status ? { status: filters.status } : undefined,
    include: SUMMARY_INCLUDE,
    orderBy: { createdAt: "desc" },
    take: 200,
  });
  return rows.map(toSummary);
}

export async function getOrdersForUser(userId: number): Promise<OrderSummaryRow[]> {
  const rows = await db.order.findMany({
    where: { customer: { userId } },
    include: SUMMARY_INCLUDE,
    orderBy: { createdAt: "desc" },
  });
  return rows.map(toSummary);
}

const DETAIL_INCLUDE = {
  ...SUMMARY_INCLUDE,
  // Instrucciones vigentes del método, no snapshot: si la tienda cambia la
  // cuenta, el cliente debe ver la nueva. La relación es obligatoria y Restrict:
  // el método puede estar inactivo, nunca ausente.
  paymentMethod: { select: { instructions: true } },
  customer: { select: { customerId: true, userId: true, email: true } },
  baseCurrency: true,
  zone: { select: { name: true } },
  lines: { orderBy: { lineId: "asc" as const } },
  payments: {
    orderBy: { paidAt: "desc" as const },
    include: { currency: true, paymentMethod: { select: { name: true } }, receivedBy: { select: { fullName: true } } },
  },
  delivery: {
    select: {
      deliveryId: true,
      status: true,
      assignedAt: true,
      deliveredAt: true,
      failedReason: true,
      courier: { select: { user: { select: { fullName: true } } } },
    },
  },
} satisfies Prisma.OrderInclude;

type DetailRow = Prisma.OrderGetPayload<{ include: typeof DETAIL_INCLUDE }>;

function toDetail(row: DetailRow): OrderDetailData {
  const summary = toSummary({ ...row, delivery: row.delivery ? { status: row.delivery.status } : null });
  return {
    ...summary,
    version: row.version,
    customerId: row.customer.customerId,
    customerUserId: row.customer.userId,
    customerEmail: row.customer.email,
    baseCurrency: toCurrency(row.baseCurrency),
    subtotal: decimalToNumber(row.subtotal),
    shippingFee: decimalToNumber(row.shippingFee),
    discount: decimalToNumber(row.discount),
    paymentSurcharge: decimalToNumber(row.paymentSurcharge),
    paidBase: decimalToNumber(row.paidBase),
    paymentExchangeRate: decimalToNumber(row.paymentExchangeRate),
    paymentInstructions: row.paymentMethod.instructions,
    couponCode: row.couponCode,
    zoneName: row.zone?.name ?? null,
    deliveryAddress: (row.deliveryAddress as DeliveryAddress | null) ?? null,
    notes: row.notes,
    cancelReason: row.cancelReason,
    confirmedAt: row.confirmedAt?.toISOString() ?? null,
    readyAt: row.readyAt?.toISOString() ?? null,
    deliveredAt: row.deliveredAt?.toISOString() ?? null,
    cancelledAt: row.cancelledAt?.toISOString() ?? null,
    lines: row.lines.map((l) => ({
      lineId: l.lineId,
      productName: l.productName,
      variantName: l.variantName,
      sku: l.sku,
      qty: decimalToNumber(l.qty),
      unit: l.unit,
      unitPrice: decimalToNumber(l.unitPrice),
      lineTotal: decimalToNumber(l.lineTotal),
      imageUrl: l.imageUrl,
      unitCost: decimalToNullableNumber(l.unitCost),
      comboId: l.comboId,
      comboName: l.comboName,
      comboQty: l.comboQty,
    })),
    payments: row.payments.map((p) => ({
      paymentId: p.paymentId,
      methodName: p.paymentMethod.name,
      amountTendered: decimalToNumber(p.amountTendered),
      currency: toCurrency(p.currency),
      exchangeRate: decimalToNumber(p.exchangeRate),
      amountBase: decimalToNumber(p.amountBase),
      reference: p.reference,
      receivedBy: p.receivedBy?.fullName ?? null,
      paidAt: p.paidAt.toISOString(),
    })),
    delivery: row.delivery
      ? {
          deliveryId: row.delivery.deliveryId,
          status: row.delivery.status,
          courierName: row.delivery.courier?.user.fullName ?? null,
          assignedAt: row.delivery.assignedAt?.toISOString() ?? null,
          deliveredAt: row.delivery.deliveredAt?.toISOString() ?? null,
          failedReason: row.delivery.failedReason,
        }
      : null,
  };
}

export async function getOrderById(orderId: number): Promise<OrderDetailData | null> {
  const row = await db.order.findUnique({ where: { orderId }, include: DETAIL_INCLUDE });
  return row ? toDetail(row) : null;
}

export async function getOrderByNo(orderNo: string): Promise<OrderDetailData | null> {
  const row = await db.order.findUnique({ where: { orderNo }, include: DETAIL_INCLUDE });
  return row ? toDetail(row) : null;
}

export interface OrderCounts {
  pending: number;
  ready: number;
  byStatus: Record<OrderStatus, number>;
}

export async function getOrderCounts(): Promise<OrderCounts> {
  const groups = await db.order.groupBy({ by: ["status"], _count: { _all: true } });
  const byStatus: Record<OrderStatus, number> = {
    pending: 0,
    confirmed: 0,
    ready: 0,
    out_for_delivery: 0,
    delivered: 0,
    cancelled: 0,
  };
  for (const g of groups) byStatus[g.status] = g._count._all;
  return { pending: byStatus.pending, ready: byStatus.ready, byStatus };
}

export { decimalToNullableNumber };
