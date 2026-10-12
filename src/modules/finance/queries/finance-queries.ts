import "server-only";
import { db } from "@/lib/db";
import { BaseCurrencyNotConfiguredError, getBaseCurrencyCached } from "@/lib/currency";
import { roundToCurrency } from "@/lib/currency-math";
import { decimalToNullableNumber, decimalToNumber } from "@/lib/money";
import { summarizeProfit } from "../lib/profit";

/** Todo en moneda base. "Ventas" son pedidos creados en el rango que no se
 *  cancelaron; los costos de reparto y los cobros van por su propia fecha. */
export interface FinanceSummary {
  orders: number;
  /** Σ Order.total. */
  sales: number;
  /** Σ subtotal − descuentos: lo cobrado por mercancía. */
  productRevenue: number;
  discounts: number;
  shippingCollected: number;
  surcharges: number;
  /** Costo de la mercancía vendida (Σ unitCost × qty de las líneas con costo). */
  cogs: number;
  grossProfit: number;
  grossMarginPct: number | null;
  linesWithoutCost: number;
  /** Σ Delivery.courierFee de entregas completadas en el rango. */
  courierCosts: number;
  /** Envío cobrado − pagos devengados a mensajeros. */
  shippingNet: number;
  /** grossProfit + shippingNet + surcharges. */
  netProfit: number;
  /** Σ cobros registrados (OrderPayment.amountBase) en el rango. */
  collected: number;
  /** Pendiente de cobro global (no depende del rango). */
  receivable: number;
  /** Liquidaciones pagadas a mensajeros en el rango. */
  courierPaid: number;
  byProduct: ProductProfitRow[];
}

export interface ProductProfitRow {
  productId: number;
  productName: string;
  qty: number;
  revenue: number;
  /** null cuando alguna línea del producto no tenía costo. */
  cost: number | null;
  profit: number | null;
  marginPct: number | null;
  /** Unidades vendidas dentro de combos. */
  inComboQty: number;
}

const TOP_PRODUCTS = 25;

export async function getFinanceSummary(from?: Date): Promise<FinanceSummary> {
  let decimals = 0;
  try {
    decimals = (await getBaseCurrencyCached()).decimalPlaces;
  } catch (error) {
    if (!(error instanceof BaseCurrencyNotConfiguredError)) throw error;
  }
  const round = (n: number) => roundToCurrency(n, decimals);
  const since = from ? { gte: from } : undefined;
  const notCancelled = { status: { not: "cancelled" as const } };

  const [orders, lines, courierFees, payments, receivable, courierPaid] = await Promise.all([
    db.order.aggregate({
      where: { ...notCancelled, ...(since ? { createdAt: since } : {}) },
      _sum: { total: true, subtotal: true, discount: true, shippingFee: true, paymentSurcharge: true },
      _count: { _all: true },
    }),
    db.orderLine.findMany({
      where: { order: { ...notCancelled, ...(since ? { createdAt: since } : {}) } },
      select: {
        qty: true,
        lineTotal: true,
        unitCost: true,
        comboId: true,
        productName: true,
        variant: { select: { productId: true } },
      },
    }),
    db.delivery.aggregate({
      where: { status: "delivered", ...(since ? { deliveredAt: since } : {}) },
      _sum: { courierFee: true },
    }),
    db.orderPayment.aggregate({ where: since ? { paidAt: since } : undefined, _sum: { amountBase: true } }),
    db.order.aggregate({
      where: { ...notCancelled, paymentStatus: { not: "paid" } },
      _sum: { total: true, paidBase: true },
    }),
    db.courierPayment.aggregate({ where: since ? { paidAt: since } : undefined, _sum: { amountBase: true } }),
  ]);

  const profitLines = lines.map((l) => ({
    lineTotal: decimalToNumber(l.lineTotal),
    qty: l.qty,
    unitCost: decimalToNullableNumber(l.unitCost),
  }));
  const profit = summarizeProfit(profitLines, decimals);

  // Agrupado por producto: la línea guarda el nombre como snapshot, pero el
  // id viene de la variante para enlazar a la ficha actual.
  const byProduct = new Map<number, ProductProfitRow & { missingCost: boolean }>();
  for (const l of lines) {
    const productId = l.variant.productId;
    const row = byProduct.get(productId) ?? {
      productId,
      productName: l.productName,
      qty: 0,
      revenue: 0,
      cost: 0,
      profit: null,
      marginPct: null,
      inComboQty: 0,
      missingCost: false,
    };
    const lineTotal = decimalToNumber(l.lineTotal);
    const unitCost = decimalToNullableNumber(l.unitCost);
    row.qty += l.qty;
    row.revenue += lineTotal;
    if (unitCost == null) row.missingCost = true;
    else row.cost = (row.cost ?? 0) + unitCost * l.qty;
    if (l.comboId != null) row.inComboQty += l.qty;
    byProduct.set(productId, row);
  }
  const products: ProductProfitRow[] = [...byProduct.values()]
    .map((row) => {
      const revenue = round(row.revenue);
      const cost = row.missingCost ? null : round(row.cost ?? 0);
      const rowProfit = cost == null ? null : round(revenue - cost);
      return {
        productId: row.productId,
        productName: row.productName,
        qty: row.qty,
        revenue,
        cost,
        profit: rowProfit,
        marginPct: rowProfit != null && revenue > 0 ? Math.round((rowProfit / revenue) * 1000) / 10 : null,
        inComboQty: row.inComboQty,
      };
    })
    .sort((a, b) => (b.profit ?? Number.NEGATIVE_INFINITY) - (a.profit ?? Number.NEGATIVE_INFINITY) || b.revenue - a.revenue)
    .slice(0, TOP_PRODUCTS);

  const sales = decimalToNumber(orders._sum.total);
  const subtotal = decimalToNumber(orders._sum.subtotal);
  const discounts = decimalToNumber(orders._sum.discount);
  const shippingCollected = decimalToNumber(orders._sum.shippingFee);
  const surcharges = decimalToNumber(orders._sum.paymentSurcharge);
  const productRevenue = round(subtotal - discounts);
  // La ganancia bruta sale de las líneas (lo cobrado por mercancía) menos los
  // descuentos de cupón, que no están repartidos por línea.
  const grossProfit = round(profit.revenue - discounts - profit.cost);
  const courierCosts = decimalToNumber(courierFees._sum.courierFee);
  const shippingNet = round(shippingCollected - courierCosts);
  const receivableTotal = decimalToNumber(receivable._sum.total) - decimalToNumber(receivable._sum.paidBase);

  return {
    orders: orders._count._all,
    sales,
    productRevenue,
    discounts,
    shippingCollected,
    surcharges,
    cogs: profit.cost,
    grossProfit,
    grossMarginPct: productRevenue > 0 ? Math.round((grossProfit / productRevenue) * 1000) / 10 : null,
    linesWithoutCost: profit.linesWithoutCost,
    courierCosts,
    shippingNet,
    netProfit: round(grossProfit + shippingNet + surcharges),
    collected: decimalToNumber(payments._sum.amountBase),
    receivable: Math.max(0, receivableTotal),
    courierPaid: decimalToNumber(courierPaid._sum.amountBase),
    byProduct: products,
  };
}
