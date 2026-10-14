import "server-only";
import type { Prisma } from "@/generated/prisma";
import { createAuditLog } from "@/lib/audit";
import { StaleVersionError } from "@/lib/action-utils";
import {
  BaseCurrencyNotConfiguredError,
  GlobalRateNotConfiguredError,
  getBaseCurrency,
  getRateToBase,
  type BaseCurrencyInfo,
} from "@/lib/currency";
import { roundToCurrency } from "@/lib/currency-math";
import { decimalToNumber } from "@/lib/money";
import { notify } from "@/modules/notifications/lib/notify";
import { orderPaymentTargets } from "@/modules/notifications/lib/targets";
import type { PaymentStatus } from "./labels";
import { derivePaymentStatus } from "./payment-status";

export interface RecordOrderPaymentInput {
  orderId: number;
  paymentMethodId: number;
  /** En la moneda del método de pago. */
  amountTendered: number;
  reference?: string | null;
  notes?: string | null;
  receivedById: number | null;
  paidAt?: Date;
  /** Quién cobra: decide si se avisa a los admins (solo cobros de mensajeros).
   *  Obligatorio para que ningún llamador nuevo lo olvide. */
  actorRole: "admin" | "courier";
  origin: "manual" | "cash_on_delivery";
  /** Nombre de quien cobra, para el texto del aviso a los admins. */
  actorName?: string | null;
}

export interface RecordOrderPaymentResult {
  paymentId: number;
  amountBase: number;
  paidBase: number;
  paymentStatus: PaymentStatus;
}

/** Regla de negocio incumplida: el mensaje se muestra tal cual al usuario. */
export class PaymentRuleError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PaymentRuleError";
  }
}

/** Errores cuyo mensaje (en español) puede devolverse directamente en un
 *  `ActionResult`; el resto son fallos inesperados que van a `failAction`. */
export function isPaymentRuleError(error: unknown): error is Error {
  return (
    error instanceof PaymentRuleError ||
    error instanceof GlobalRateNotConfiguredError ||
    error instanceof BaseCurrencyNotConfiguredError
  );
}

// Order.total está en la moneda base del pedido; si la tienda cambió de base
// después, el cobro se sigue convirtiendo a la del pedido para que paidBase y
// total sean comparables.
async function resolveOrderBase(
  tx: Prisma.TransactionClient,
  orderBaseCurrencyId: number
): Promise<BaseCurrencyInfo> {
  const storeBase = await getBaseCurrency(tx);
  if (storeBase.currencyId === orderBaseCurrencyId) return storeBase;
  const currency = await tx.currency.findUnique({ where: { currencyId: orderBaseCurrencyId } });
  if (!currency) throw new PaymentRuleError("La moneda base del pedido ya no existe");
  return {
    currencyId: currency.currencyId,
    code: currency.code,
    symbol: currency.symbol,
    decimalPlaces: currency.decimalPlaces,
  };
}

/** Registra un cobro contra un pedido dentro de la tx del llamador: crea el
 *  `OrderPayment`, acumula `paidBase`, deriva `paymentStatus` y audita. Lanza
 *  `PaymentRuleError` (o errores de tasa) con mensaje en español y
 *  `StaleVersionError` si el pedido cambió entre la lectura y la escritura.
 *  Un sobrepago se acepta y queda reflejado en `paidBase > total`. */
export async function recordOrderPayment(
  tx: Prisma.TransactionClient,
  input: RecordOrderPaymentInput
): Promise<RecordOrderPaymentResult> {
  if (!Number.isFinite(input.amountTendered) || input.amountTendered <= 0) {
    throw new PaymentRuleError("El monto debe ser mayor que cero");
  }

  const order = await tx.order.findUnique({
    where: { orderId: input.orderId },
    select: {
      orderId: true,
      orderNo: true,
      customer: { select: { userId: true } },
      status: true,
      version: true,
      total: true,
      paidBase: true,
      paymentStatus: true,
      baseCurrencyId: true,
      paymentMethodId: true,
      paymentCurrencyId: true,
      paymentExchangeRate: true,
    },
  });
  if (!order) throw new PaymentRuleError("Pedido no encontrado");
  if (order.status === "cancelled") {
    throw new PaymentRuleError("No se puede registrar un cobro en un pedido cancelado");
  }

  const method = await tx.paymentMethod.findUnique({
    where: { paymentMethodId: input.paymentMethodId },
    select: {
      paymentMethodId: true,
      name: true,
      currencyId: true,
      isActive: true,
      currency: { select: { code: true, decimalPlaces: true } },
    },
  });
  if (!method) throw new PaymentRuleError("Método de pago no encontrado");
  // Desactivar un método solo bloquea pedidos nuevos: el cobro de un pedido
  // que ya lo tenía elegido (p. ej. contra entrega) debe poder registrarse.
  if (!method.isActive && method.paymentMethodId !== order.paymentMethodId) {
    throw new PaymentRuleError("El método de pago está inactivo");
  }

  // El efectivo no admite fracciones que la moneda no tiene.
  const amountTendered = roundToCurrency(input.amountTendered, method.currency.decimalPlaces);
  if (amountTendered <= 0) throw new PaymentRuleError("El monto debe ser mayor que cero");

  const base = await resolveOrderBase(tx, order.baseCurrencyId);
  // En la moneda de pago del pedido manda la tasa que el pedido fijó al
  // crearse: es la que usa el monto que la app pide cobrar (mensajero y
  // admin). Con la tasa vigente, cobrar exactamente lo indicado dejaría el
  // pedido en "partial" o con sobrepago fantasma si la tasa cambió.
  const rate =
    method.currencyId === order.paymentCurrencyId
      ? decimalToNumber(order.paymentExchangeRate)
      : (await getRateToBase(tx, method.currencyId, base)).rate;

  const amountBase = roundToCurrency(amountTendered * rate, base.decimalPlaces);
  // La DB exige amount_base > 0: un monto ínfimo en una moneda débil puede
  // redondear a cero y conviene explicarlo en vez de dejar que falle el CHECK.
  if (amountBase <= 0) {
    throw new PaymentRuleError(
      `El monto es demasiado pequeño: equivale a 0 ${base.code} tras la conversión`
    );
  }

  const total = decimalToNumber(order.total);
  const paidBefore = decimalToNumber(order.paidBase);
  const paidBase = roundToCurrency(paidBefore + amountBase, base.decimalPlaces);
  const paymentStatus = derivePaymentStatus(paidBase, total, order.paymentStatus);
  const paidAt = input.paidAt ?? new Date();

  const payment = await tx.orderPayment.create({
    data: {
      orderId: order.orderId,
      paymentMethodId: method.paymentMethodId,
      currencyId: method.currencyId,
      amountTendered,
      exchangeRate: rate,
      amountBase,
      reference: input.reference ?? null,
      notes: input.notes ?? null,
      paidAt,
      receivedById: input.receivedById,
    },
    select: { paymentId: true },
  });

  const updated = await tx.order.updateMany({
    where: { orderId: order.orderId, version: order.version },
    data: { paidBase, paymentStatus, version: { increment: 1 } },
  });
  if (updated.count !== 1) throw new StaleVersionError();

  await createAuditLog(tx, {
    action: "create",
    entityType: "OrderPayment",
    entityId: payment.paymentId,
    module: "payments",
    userId: input.receivedById,
    oldValues: { paidBase: paidBefore, paymentStatus: order.paymentStatus },
    newValues: {
      orderId: order.orderId,
      paymentMethodId: method.paymentMethodId,
      paymentMethodName: method.name,
      currencyId: method.currencyId,
      currencyCode: method.currency.code,
      amountTendered,
      exchangeRate: rate,
      amountBase,
      baseCurrencyCode: base.code,
      total,
      paidBase,
      paymentStatus,
      reference: input.reference ?? null,
      notes: input.notes ?? null,
      paidAt,
    },
  });


  await notify(
    tx,
    input.receivedById,
    orderPaymentTargets({
      actorRole: input.actorRole,
      origin: input.origin,
      actorName: input.actorName ?? null,
      orderId: order.orderId,
      orderNo: order.orderNo,
      customerUserId: order.customer.userId,
      amount: { amount: amountTendered, currency: method.currency },
      outstanding: { amount: Math.max(0, roundToCurrency(total - paidBase, base.decimalPlaces)), currency: base },
      paymentMethodName: method.name,
      paymentStatus,
    })
  );

  return { paymentId: payment.paymentId, amountBase, paidBase, paymentStatus };
}
