"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { assertRole } from "@/lib/auth-guard";
import { createAuditLog } from "@/lib/audit";
import { failAction, firstIssueMessage, StaleVersionError } from "@/lib/action-utils";
import { getBaseCurrency } from "@/lib/currency";
import { roundToCurrency } from "@/lib/currency-math";
import { decimalToNumber } from "@/lib/money";
import type { ActionResult } from "@/types";
import { DeliveryRuleError, isDeliveryRuleError } from "../lib/delivery-effects";
import { courierPaymentSchema, type CourierPaymentInput } from "../lib/schemas";

function revalidateCourierPaymentPaths() {
  revalidatePath("/admin/mensajeros");
  revalidatePath("/admin/mensajeros/pagos");
  revalidatePath("/admin/finanzas");
  revalidatePath("/mensajero");
}

/** Liquida al mensajero TODAS sus entregas completadas pendientes: crea el
 *  pago y las marca con su id en la misma tx. El monto puede diferir de la
 *  suma de tarifas (bonos, descuentos) y se explica en las notas. */
export async function createCourierPayment(
  input: CourierPaymentInput
): Promise<ActionResult<{ courierPaymentId: number; deliveryCount: number }>> {
  const parsed = courierPaymentSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: firstIssueMessage(parsed.error, "Revisa los datos") };
  }
  const data = parsed.data;

  try {
    const userId = await assertRole("admin");
    const result = await db.$transaction(async (tx) => {
      const courier = await tx.courier.findUnique({
        where: { courierId: data.courierId },
        select: { courierId: true, user: { select: { fullName: true } } },
      });
      if (!courier) throw new DeliveryRuleError("Mensajero no encontrado");

      const pending = await tx.delivery.findMany({
        where: { courierId: data.courierId, status: "delivered", courierPaymentId: null },
        select: { deliveryId: true, courierFee: true },
        orderBy: { deliveryId: "asc" },
      });
      if (pending.length === 0) throw new DeliveryRuleError("Este mensajero no tiene entregas pendientes de pago");

      const base = await getBaseCurrency(tx);
      const amountBase = roundToCurrency(data.amountBase, base.decimalPlaces);
      if (amountBase <= 0) throw new DeliveryRuleError("El monto debe ser mayor que cero");
      const feesBase = roundToCurrency(
        pending.reduce((sum, d) => sum + decimalToNumber(d.courierFee), 0),
        base.decimalPlaces
      );

      const payment = await tx.courierPayment.create({
        data: {
          courierId: data.courierId,
          amountBase,
          feesBase,
          deliveryCount: pending.length,
          notes: data.notes,
          paidAt: new Date(),
          paidById: userId,
        },
        select: { courierPaymentId: true },
      });

      // Si otra liquidación concurrente ya saldó alguna, el conteo no cuadra
      // y se aborta todo: ninguna entrega se paga dos veces.
      const ids = pending.map((d) => d.deliveryId);
      const marked = await tx.delivery.updateMany({
        where: { deliveryId: { in: ids }, courierPaymentId: null },
        data: { courierPaymentId: payment.courierPaymentId },
      });
      if (marked.count !== ids.length) throw new StaleVersionError();

      await createAuditLog(tx, {
        action: "create",
        entityType: "CourierPayment",
        entityId: payment.courierPaymentId,
        module: "deliveries",
        userId,
        newValues: {
          courierId: data.courierId,
          courierName: courier.user.fullName,
          amountBase,
          feesBase,
          deliveryIds: ids,
          notes: data.notes,
        },
      });
      return { courierPaymentId: payment.courierPaymentId, deliveryCount: ids.length };
    });

    revalidateCourierPaymentPaths();
    return { success: true, data: result };
  } catch (error) {
    if (error instanceof StaleVersionError || isDeliveryRuleError(error)) {
      return { success: false, error: error.message };
    }
    return failAction("createCourierPayment", error, "No se pudo registrar el pago al mensajero");
  }
}
