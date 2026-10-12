"use server";

import { revalidatePath } from "next/cache";
import { Prisma } from "@/generated/prisma";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { assertRole } from "@/lib/auth-guard";
import { createAuditLog } from "@/lib/audit";
import { failAction, firstIssueMessage, StaleVersionError } from "@/lib/action-utils";
import { BaseCurrencyNotConfiguredError } from "@/lib/currency";
import { roundToCurrency } from "@/lib/currency-math";
import { DOC_TYPES, nextFolio } from "@/lib/folio";
import { decimalToNullableNumber, decimalToNumber } from "@/lib/money";
import type { ActionResult } from "@/types";
import { computeCartTotals } from "@/modules/cart/cart-totals";
import { prorateComboLines } from "@/modules/combos/lib/combo-pricing";
import { getOrderCombos } from "@/modules/combos/queries/order-combo-queries";
import { fmtQty, isValidQty, roundQty } from "@/modules/products/lib/units";
import { resolveCustomer } from "@/modules/customers/lib/resolve-customer";
import { validateCoupon } from "../lib/coupon";
import {
  createOrderSchema,
  transitionOrderSchema,
  type CreateOrderInput,
  type TransitionOrderInput,
} from "../lib/schemas";
import { applyOrderTransition } from "../lib/transition";
import { getOrderVariants } from "../queries/order-pricing-queries";

/** Regla de negocio que aborta el checkout con un mensaje para el cliente
 *  (stock, tasa, zona...). Se lanza dentro de la tx para revertirla. */
class CheckoutError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "CheckoutError";
  }
}

function isUniqueViolation(error: unknown): boolean {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002";
}

export async function createOrder(
  input: CreateOrderInput
): Promise<ActionResult<{ orderId: number; orderNo: string }>> {
  const parsed = createOrderSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: firstIssueMessage(parsed.error, "Revisa los datos del pedido") };
  }
  const data = parsed.data;

  try {
    // El checkout de invitado está permitido: la sesión solo enlaza el cliente.
    const session = await auth();
    const userId = session?.user?.userId ?? null;

    const created = await db.$transaction(async (tx) => {
      const settings = await tx.storeSetting.findUnique({ where: { id: 1 }, include: { baseCurrency: true } });
      if (!settings?.baseCurrency) throw new BaseCurrencyNotConfiguredError();
      const base = {
        currencyId: settings.baseCurrency.currencyId,
        code: settings.baseCurrency.code,
        symbol: settings.baseCurrency.symbol,
        decimalPlaces: settings.baseCurrency.decimalPlaces,
      };

      // El carrito puede repetir una variante o un combo: se consolidan para
      // descontar stock y crear cada línea una sola vez.
      const qtyByVariant = new Map<number, number>();
      for (const line of data.lines) {
        qtyByVariant.set(line.variantId, (qtyByVariant.get(line.variantId) ?? 0) + line.qty);
      }
      const qtyByCombo = new Map<number, number>();
      for (const c of data.combos) {
        qtyByCombo.set(c.comboId, (qtyByCombo.get(c.comboId) ?? 0) + c.qty);
      }
      const comboIds = [...qtyByCombo.keys()].sort((a, b) => a - b);
      const combos = await getOrderCombos(tx, comboIds, new Date());
      for (const comboId of comboIds) {
        if (!combos.has(comboId)) throw new CheckoutError("Un combo de tu bolsa ya no está disponible");
      }

      // Orden ascendente: las filas de stock se bloquean siempre en el mismo
      // orden en todas las transacciones (checkout y cancelación) para evitar
      // deadlocks entre pedidos concurrentes con las mismas variantes.
      const variantIds = [
        ...new Set([...qtyByVariant.keys(), ...[...combos.values()].flatMap((c) => c.items.map((i) => i.variantId))]),
      ].sort((a, b) => a - b);
      const { variants, rates } = await getOrderVariants(tx, variantIds, base);
      const byId = new Map(variants.map((v) => [v.variantId, v]));

      const requireVariant = (variantId: number, missing: string) => {
        const variant = byId.get(variantId);
        if (!variant) throw new CheckoutError(missing);
        if (variant.rateToBase == null) {
          throw new CheckoutError(`${variant.productName} no tiene tasa de cambio configurada`);
        }
        const inBase = variant.priceCurrency.currencyId === base.currencyId;
        const unitPrice = inBase
          ? roundToCurrency(variant.origUnitPrice, base.decimalPlaces)
          : roundToCurrency(variant.origUnitPrice * variant.rateToBase, base.decimalPlaces);
        return {
          variant,
          unitPriceBase: unitPrice,
          origCurrencyId: inBase ? null : variant.priceCurrency.currencyId,
          origUnitPrice: inBase ? null : variant.origUnitPrice,
          exchangeRate: inBase ? null : variant.rateToBase,
        };
      };

      type OrderLineDraft = ReturnType<typeof requireVariant> & {
        qty: number;
        unitPrice: number;
        lineTotal: number;
        combo: { comboId: number; name: string; qty: number } | null;
      };

      const lines: OrderLineDraft[] = [...qtyByVariant.keys()]
        .sort((a, b) => a - b)
        .map((variantId) => {
          const priced = requireVariant(variantId, "Un producto de tu bolsa ya no está disponible");
          const qty = roundQty(qtyByVariant.get(variantId)!);
          // La UI ya ajusta al paso, pero el cliente controla el payload.
          if (!isValidQty(qty, priced.variant.qtyStep)) {
            throw new CheckoutError(
              `${priced.variant.productName} se vende en múltiplos de ${fmtQty(priced.variant.qtyStep, priced.variant.unit)}`
            );
          }
          return {
            ...priced,
            qty,
            unitPrice: priced.unitPriceBase,
            lineTotal: roundToCurrency(priced.unitPriceBase * qty, base.decimalPlaces),
            combo: null,
          };
        });

      // Cada componente del combo es una línea con el precio del combo
      // prorrateado: stock y costo siguen siendo por variante y la suma de las
      // líneas del combo es exactamente su precio.
      const comboPriceLines: { unitPrice: number; qty: number }[] = [];
      for (const comboId of comboIds) {
        const combo = combos.get(comboId)!;
        const comboQty = qtyByCombo.get(comboId)!;
        const comboRate = rates.get(combo.priceCurrencyId)?.rate;
        if (comboRate == null) {
          throw new CheckoutError(`El combo "${combo.name}" no tiene tasa de cambio configurada`);
        }
        const comboPriceBase = roundToCurrency(combo.origPrice * comboRate, base.decimalPlaces);
        const items = combo.items.map((item) => ({
          ...requireVariant(item.variantId, `Un producto del combo "${combo.name}" ya no está disponible`),
          qty: item.qty,
        }));
        const prorated = prorateComboLines({ comboPriceBase, comboQty, items, decimals: base.decimalPlaces });
        for (const p of prorated) {
          lines.push({
            ...p.item,
            qty: roundQty(p.qty),
            unitPrice: p.unitPrice,
            lineTotal: p.lineTotal,
            combo: { comboId: combo.comboId, name: combo.name, qty: comboQty },
          });
        }
        comboPriceLines.push({ unitPrice: comboPriceBase, qty: comboQty });
      }

      // La UI oculta la recogida cuando está deshabilitada, pero el cliente
      // controla el payload: sin esta comprobación anularía el envío.
      if (data.fulfillment === "pickup" && !settings.allowPickup) {
        throw new CheckoutError("La tienda no ofrece recogida en tienda. Elige entrega a domicilio.");
      }

      let zone: { zoneId: number; fee: number; freeShippingThreshold: number | null } | null = null;
      if (data.fulfillment === "delivery") {
        const row = await tx.deliveryZone.findFirst({ where: { zoneId: data.zoneId ?? -1, active: true } });
        if (!row) throw new CheckoutError("La zona de entrega ya no está disponible. Elige otra.");
        zone = {
          zoneId: row.zoneId,
          fee: decimalToNumber(row.fee),
          freeShippingThreshold: decimalToNullableNumber(row.freeShippingThreshold),
        };
      }
      const storeThreshold = decimalToNullableNumber(settings.freeShippingThreshold);
      const shipping = {
        fee: zone ? zone.fee : decimalToNumber(settings.defaultShippingFee),
        freeThreshold: zone ? (zone.freeShippingThreshold ?? storeThreshold) : storeThreshold,
      };

      const method = await tx.paymentMethod.findFirst({
        where: { paymentMethodId: data.paymentMethodId, isActive: true },
        include: { currency: true },
      });
      if (!method) throw new CheckoutError("El método de pago ya no está disponible. Elige otro.");
      // Misma lectura de tasas que las líneas: una moneda no puede tener dos
      // tasas distintas dentro del mismo pedido.
      const paymentRate = rates.get(method.currencyId)?.rate;
      if (paymentRate == null) {
        throw new CheckoutError(`El método de pago "${method.name}" no tiene tasa de cambio configurada`);
      }
      const payment = {
        surchargePercent: decimalToNullableNumber(method.surchargePercent),
        exchangeRate: paymentRate,
        decimals: method.currency.decimalPlaces,
      };
      // Misma fórmula que el carrito: los productos sueltos por su precio y cada
      // combo por el suyo (no por sus líneas prorrateadas, que ya suman igual).
      const totalsInput = {
        lines: [
          ...lines.filter((l) => l.combo == null).map((l) => ({ unitPrice: l.unitPrice, qty: l.qty })),
          ...comboPriceLines,
        ],
        baseDecimals: base.decimalPlaces,
        fulfillment: data.fulfillment,
        shipping,
        payment,
      };

      let coupon: { couponId: number; code: string; usedCount: number } | null = null;
      let discount: ReturnType<typeof validateCoupon> | null = null;
      if (data.couponCode) {
        const row = await tx.coupon.findFirst({
          where: { code: { equals: data.couponCode, mode: "insensitive" } },
        });
        const { subtotal } = computeCartTotals(totalsInput);
        discount = validateCoupon({
          coupon: row
            ? {
                code: row.code,
                kind: row.kind,
                value: decimalToNumber(row.value),
                minSubtotal: decimalToNullableNumber(row.minSubtotal),
                maxUses: row.maxUses,
                usedCount: row.usedCount,
                startsAt: row.startsAt,
                endsAt: row.endsAt,
                isActive: row.isActive,
              }
            : null,
          subtotal,
          now: new Date(),
        });
        if (!discount.ok) throw new CheckoutError(discount.reason);
        coupon = { couponId: row!.couponId, code: row!.code, usedCount: row!.usedCount };
      }

      const totals = computeCartTotals({
        ...totalsInput,
        coupon: discount?.ok ? discount.discountKindValue : null,
      });

      const customer = await resolveCustomer(tx, {
        userId,
        name: data.customerName,
        phone: data.customerPhone,
        email: data.customerEmail,
      });

      // Salida de stock condicionada: nunca un decrement ciego. Una variante
      // puede venir suelta y dentro de combos: se descuenta su total una vez.
      const stockNeeded = new Map<number, number>();
      for (const line of lines) {
        stockNeeded.set(line.variant.variantId, roundQty((stockNeeded.get(line.variant.variantId) ?? 0) + line.qty));
      }
      const stockAfter = new Map<number, number>();
      for (const variantId of [...stockNeeded.keys()].sort((a, b) => a - b)) {
        const qty = stockNeeded.get(variantId)!;
        const variant = byId.get(variantId)!;
        const taken = await tx.productVariant.updateManyAndReturn({
          where: { variantId, stock: { gte: qty } },
          data: { stock: { decrement: qty } },
          select: { stock: true },
        });
        if (taken.length !== 1) {
          const label = variant.variantName ? `${variant.productName} (${variant.variantName})` : variant.productName;
          throw new CheckoutError(`No hay stock suficiente de ${label}`);
        }
        stockAfter.set(variantId, decimalToNumber(taken[0].stock));
      }

      const orderNo = await nextFolio(tx, DOC_TYPES.ORDER, settings.orderPrefix);

      // No hay columna para la referencia de pago: viaja en las notas.
      const notes = [data.paymentReference ? `Ref. pago: ${data.paymentReference}` : null, data.notes]
        .filter((n): n is string => Boolean(n))
        .join("\n");

      const order = await tx.order.create({
        data: {
          orderNo,
          customerId: customer.customerId,
          status: "pending",
          fulfillment: data.fulfillment,
          baseCurrencyId: base.currencyId,
          subtotal: totals.subtotal,
          shippingFee: totals.shippingFee,
          discount: totals.discount,
          paymentSurcharge: totals.paymentSurcharge,
          total: totals.total,
          paymentMethodId: method.paymentMethodId,
          paymentMethodName: method.name,
          paymentCurrencyId: method.currencyId,
          paymentExchangeRate: paymentRate,
          totalInPaymentCurrency: totals.totalInPaymentCurrency ?? totals.total,
          paymentStatus: "unpaid",
          paidBase: 0,
          couponId: coupon?.couponId ?? null,
          couponCode: coupon?.code ?? null,
          zoneId: zone?.zoneId ?? null,
          customerName: data.customerName,
          customerPhone: data.customerPhone,
          deliveryAddress:
            data.fulfillment === "delivery" && data.address
              ? (data.address as Prisma.InputJsonValue)
              : Prisma.DbNull,
          notes: notes || null,
          lines: {
            create: lines.map((l) => ({
              variantId: l.variant.variantId,
              productName: l.variant.productName,
              variantName: l.variant.variantName,
              sku: l.variant.sku,
              attributes: l.variant.attributes as Prisma.InputJsonValue,
              imageUrl: l.variant.imageUrl,
              unitPrice: l.unitPrice,
              qty: l.qty,
              unit: l.variant.unit,
              lineTotal: l.lineTotal,
              origCurrencyId: l.origCurrencyId,
              origUnitPrice: l.origUnitPrice,
              exchangeRate: l.exchangeRate,
              unitCost: l.variant.costBase,
              comboId: l.combo?.comboId ?? null,
              comboName: l.combo?.name ?? null,
              comboQty: l.combo?.qty ?? null,
            })),
          },
        },
        select: { orderId: true, orderNo: true },
      });

      await tx.stockMovement.createMany({
        data: [...stockNeeded.entries()].map(([variantId, qty]) => ({
          variantId,
          type: "exit" as const,
          quantity: qty,
          stockAfter: stockAfter.get(variantId) ?? 0,
          referenceType: "order",
          referenceId: order.orderId,
          notes: `Pedido ${order.orderNo}`,
          createdById: userId,
        })),
      });

      // Incremento condicionado al contador que se validó: dos pedidos que
      // compitan por el último uso no pueden pasar ambos.
      if (coupon) {
        const taken = await tx.coupon.updateMany({
          where: { couponId: coupon.couponId, usedCount: coupon.usedCount },
          data: { usedCount: { increment: 1 } },
        });
        if (taken.count !== 1) throw new CheckoutError("Este cupón ya alcanzó su límite de usos");
      }

      await createAuditLog(tx, {
        module: "orders",
        entityType: "Order",
        entityId: order.orderId,
        action: "create",
        userId,
        newValues: {
          orderNo: order.orderNo,
          customerId: customer.customerId,
          fulfillment: data.fulfillment,
          zoneId: zone?.zoneId ?? null,
          paymentMethodId: method.paymentMethodId,
          couponCode: coupon?.code ?? null,
          subtotal: totals.subtotal,
          shippingFee: totals.shippingFee,
          discount: totals.discount,
          paymentSurcharge: totals.paymentSurcharge,
          total: totals.total,
          lines: lines.map((l) => ({
            variantId: l.variant.variantId,
            sku: l.variant.sku,
            qty: l.qty,
            unitPrice: l.unitPrice,
            lineTotal: l.lineTotal,
            unitCost: l.variant.costBase,
            comboId: l.combo?.comboId ?? null,
          })),
          combos: comboIds.map((comboId) => ({ comboId, qty: qtyByCombo.get(comboId) })),
        },
      });

      return order;
    });

    revalidatePath("/admin/pedidos");
    revalidatePath("/admin");
    revalidatePath("/perfil/pedidos");
    return { success: true, data: { orderId: created.orderId, orderNo: created.orderNo } };
  } catch (error) {
    if (error instanceof CheckoutError || error instanceof BaseCurrencyNotConfiguredError) {
      return { success: false, error: error.message };
    }
    if (isUniqueViolation(error)) {
      return { success: false, error: "Este teléfono ya está asociado a otra cuenta. Inicia sesión para continuar." };
    }
    return failAction("createOrder", error, "No se pudo crear el pedido");
  }
}

function revalidateOrderPaths(orderId: number, orderNo: string) {
  revalidatePath("/admin/pedidos");
  revalidatePath(`/admin/pedidos/${orderId}`);
  revalidatePath("/admin/entregas");
  revalidatePath("/admin");
  revalidatePath("/perfil/pedidos");
  revalidatePath(`/pedido-confirmado/${orderNo}`);
}

export async function transitionOrder(input: TransitionOrderInput): Promise<ActionResult<void>> {
  const parsed = transitionOrderSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: firstIssueMessage(parsed.error, "Revisa los datos") };
  }
  const { orderId, version, to, reason } = parsed.data;

  try {
    const userId = await assertRole("admin");
    const result = await db.$transaction((tx) =>
      applyOrderTransition(tx, { orderId, to, actor: "admin", userId, reason, expectedVersion: version })
    );
    if (!result.ok) return { success: false, error: result.error };

    revalidateOrderPaths(orderId, result.order.orderNo);
    return { success: true, data: undefined };
  } catch (error) {
    if (error instanceof StaleVersionError) return { success: false, error: error.message };
    return failAction("transitionOrder", error, "No se pudo cambiar el estado del pedido");
  }
}

/** Cancelación por el propio cliente (solo pedidos pendientes y suyos). */
export async function cancelMyOrder(orderId: number, reason: string | null): Promise<ActionResult<void>> {
  try {
    const session = await auth();
    if (!session?.user) throw new Error("No autenticado");
    const userId = session.user.userId;

    const result = await db.$transaction(async (tx) => {
      // La propiedad se comprueba dentro de la tx para que la máquina reciba
      // un `isOwner` coherente con lo que se va a modificar.
      const order = await tx.order.findUnique({
        where: { orderId },
        select: { customer: { select: { userId: true } } },
      });
      if (!order) return { ok: false as const, error: "Pedido no encontrado" };
      if (order.customer.userId !== userId) return { ok: false as const, error: "Este pedido no es tuyo" };

      return applyOrderTransition(tx, {
        orderId,
        to: "cancelled",
        actor: "customer",
        userId,
        reason,
        isOwner: true,
      });
    });
    if (!result.ok) return { success: false, error: result.error };

    revalidateOrderPaths(orderId, result.order.orderNo);
    return { success: true, data: undefined };
  } catch (error) {
    if (error instanceof StaleVersionError) return { success: false, error: error.message };
    return failAction("cancelMyOrder", error, "No se pudo cancelar el pedido");
  }
}
