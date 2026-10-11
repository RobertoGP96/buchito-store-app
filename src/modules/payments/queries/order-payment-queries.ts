import "server-only";
import { db } from "@/lib/db";
import type { CurrencyInfo } from "@/lib/format";
import { decimalToNumber } from "@/lib/money";

export interface OrderPaymentRow {
  paymentId: number;
  orderId: number;
  orderNo: string;
  customerName: string;
  methodName: string;
  /** Monto en la moneda pagada (`currency`). */
  amountTendered: number;
  currency: CurrencyInfo;
  /** Base por 1 unidad de `currency` (snapshot al cobrar). */
  exchangeRate: number;
  /** Lo que alimenta Order.paidBase, en moneda base. */
  amountBase: number;
  reference: string | null;
  notes: string | null;
  receivedBy: string | null;
  paidAt: string;
}

export interface CurrencyTotal {
  currency: CurrencyInfo;
  amount: number;
}

export interface OrderPaymentsResult {
  rows: OrderPaymentRow[];
  /** Σ amountBase del listado. */
  totalBase: number;
  /** Σ amountTendered agrupado por moneda pagada. */
  totalsByCurrency: CurrencyTotal[];
  /** El listado quedó recortado por `limit`: los totales son parciales. */
  truncated: boolean;
}

export interface OrderPaymentFilter {
  from?: Date;
  to?: Date;
  limit?: number;
}

const CURRENCY_SELECT = { currencyId: true, code: true, symbol: true, decimalPlaces: true } as const;

/** Cobros registrados, del más reciente al más antiguo, con totales. */
export async function getOrderPayments({ from, to, limit = 200 }: OrderPaymentFilter = {}): Promise<OrderPaymentsResult> {
  const rows = await db.orderPayment.findMany({
    where:
      from || to
        ? { paidAt: { ...(from ? { gte: from } : {}), ...(to ? { lt: to } : {}) } }
        : undefined,
    orderBy: [{ paidAt: "desc" }, { paymentId: "desc" }],
    // Una fila de más para saber si el listado quedó recortado.
    take: limit + 1,
    include: {
      order: { select: { orderId: true, orderNo: true, customerName: true } },
      paymentMethod: { select: { name: true } },
      currency: { select: CURRENCY_SELECT },
      receivedBy: { select: { fullName: true } },
    },
  });

  const truncated = rows.length > limit;
  const visible = truncated ? rows.slice(0, limit) : rows;

  let totalBase = 0;
  const byCurrency = new Map<number, CurrencyTotal>();
  const mapped = visible.map((p) => {
    const amountTendered = decimalToNumber(p.amountTendered);
    const amountBase = decimalToNumber(p.amountBase);
    totalBase += amountBase;
    const bucket = byCurrency.get(p.currencyId);
    if (bucket) bucket.amount += amountTendered;
    else byCurrency.set(p.currencyId, { currency: p.currency, amount: amountTendered });
    return {
      paymentId: p.paymentId,
      orderId: p.order.orderId,
      orderNo: p.order.orderNo,
      customerName: p.order.customerName,
      methodName: p.paymentMethod.name,
      amountTendered,
      currency: p.currency,
      exchangeRate: decimalToNumber(p.exchangeRate),
      amountBase,
      reference: p.reference,
      notes: p.notes,
      receivedBy: p.receivedBy?.fullName ?? null,
      paidAt: p.paidAt.toISOString(),
    };
  });

  return {
    rows: mapped,
    totalBase,
    totalsByCurrency: [...byCurrency.values()].sort((a, b) => a.currency.code.localeCompare(b.currency.code)),
    truncated,
  };
}
