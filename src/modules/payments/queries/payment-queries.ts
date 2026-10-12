import "server-only";
import { db } from "@/lib/db";
import type { CurrencyInfo } from "@/lib/format";
import { decimalToNullableNumber } from "@/lib/money";
import type { PaymentKind } from "../lib/labels";

export interface PaymentMethodRow {
  paymentMethodId: number;
  code: string;
  name: string;
  kind: PaymentKind;
  currency: CurrencyInfo;
  instructions: string | null;
  requiresReference: boolean;
  surchargePercent: number | null;
  isActive: boolean;
  sortOrder: number;
  version: number;
  orderCount: number;
  /** Cobros registrados con este método. */
  paymentCount: number;
}

export async function getPaymentMethods(): Promise<PaymentMethodRow[]> {
  const rows = await db.paymentMethod.findMany({
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    include: { currency: true, _count: { select: { orders: true, payments: true } } },
  });
  return rows.map((row) => ({
    paymentMethodId: row.paymentMethodId,
    code: row.code,
    name: row.name,
    kind: row.kind,
    currency: {
      currencyId: row.currency.currencyId,
      code: row.currency.code,
      symbol: row.currency.symbol,
      decimalPlaces: row.currency.decimalPlaces,
      name: row.currency.name,
    },
    instructions: row.instructions,
    requiresReference: row.requiresReference,
    surchargePercent: decimalToNullableNumber(row.surchargePercent),
    isActive: row.isActive,
    sortOrder: row.sortOrder,
    version: row.version,
    orderCount: row._count.orders,
    paymentCount: row._count.payments,
  }));
}

/** Lo que ve el cliente en el checkout: solo métodos activos cuya moneda
 *  esté activa. */
export async function getActivePaymentMethods(): Promise<PaymentMethodRow[]> {
  const rows = await getPaymentMethods();
  return rows.filter((r) => r.isActive);
}
