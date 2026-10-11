"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { assertRole, ForbiddenError, getSessionCourierId } from "@/lib/auth-guard";
import { createAuditLog } from "@/lib/audit";
import { failAction, firstIssueMessage, StaleVersionError } from "@/lib/action-utils";
import type { ActionResult } from "@/types";
import { isPaymentRuleError } from "@/modules/payments/lib/record-payment";
import {
  applyDeliveryTransition,
  DeliveryRuleError,
  isDeliveryRuleError,
  type CourierDeliveryTarget,
} from "../lib/delivery-effects";
import {
  assignCourierSchema,
  transitionDeliverySchema,
  type AssignCourierInput,
  type TransitionDeliveryInput,
} from "../lib/schemas";
import { canTransitionDelivery } from "../lib/state-machine";

function revalidateDeliveryPaths(orderId: number, deliveryId: number) {
  revalidatePath("/admin/entregas");
  revalidatePath("/admin/pedidos");
  revalidatePath(`/admin/pedidos/${orderId}`);
  revalidatePath("/admin");
  revalidatePath("/mensajero");
  revalidatePath(`/mensajero/entregas/${deliveryId}`);
  revalidatePath("/perfil/pedidos");
}

function isRuleError(error: unknown): error is Error {
  return error instanceof StaleVersionError || isDeliveryRuleError(error) || isPaymentRuleError(error);
}

/** pending | failed → assigned. Una entrega fallida se re-asigna conservando
 *  `attempts` y `failedReason` como historial. */
export async function assignCourier(input: AssignCourierInput): Promise<ActionResult<void>> {
  const parsed = assignCourierSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: firstIssueMessage(parsed.error, "Revisa los datos") };
  }
  const { deliveryId, version, courierId } = parsed.data;

  try {
    const userId = await assertRole("admin");
    const result = await db.$transaction(async (tx) => {
      const delivery = await tx.delivery.findUnique({
        where: { deliveryId },
        select: { deliveryId: true, orderId: true, status: true, courierId: true },
      });
      if (!delivery) throw new DeliveryRuleError("Entrega no encontrada");

      const courier = await tx.courier.findUnique({
        where: { courierId },
        select: { courierId: true, active: true, user: { select: { fullName: true } } },
      });
      if (!courier?.active) throw new DeliveryRuleError("El mensajero no está activo");

      const check = canTransitionDelivery(delivery.status, "assigned", "admin", {
        isAssignedCourier: false,
        courierId,
      });
      if (!check.ok) throw new DeliveryRuleError(check.reason);

      const updated = await tx.delivery.updateMany({
        where: { deliveryId, version },
        data: { courierId, status: "assigned", assignedAt: new Date(), version: { increment: 1 } },
      });
      if (updated.count !== 1) throw new StaleVersionError();

      await tx.deliveryEvent.create({
        data: {
          deliveryId,
          fromStatus: delivery.status,
          toStatus: "assigned",
          actorId: userId,
          note: `Asignada a ${courier.user.fullName}`,
        },
      });
      await createAuditLog(tx, {
        action: "transition:assigned",
        entityType: "Delivery",
        entityId: deliveryId,
        module: "deliveries",
        userId,
        oldValues: { status: delivery.status, courierId: delivery.courierId },
        newValues: { status: "assigned", courierId, courierName: courier.user.fullName },
      });
      return { orderId: delivery.orderId };
    });

    revalidateDeliveryPaths(result.orderId, deliveryId);
    return { success: true, data: undefined };
  } catch (error) {
    if (isRuleError(error)) return { success: false, error: error.message };
    return failAction("assignCourier", error, "No se pudo asignar el mensajero");
  }
}

/** assigned → pending: libera al mensajero antes de que recoja el pedido. */
export async function unassignCourier(deliveryId: number, version: number): Promise<ActionResult<void>> {
  if (!Number.isInteger(deliveryId) || deliveryId <= 0 || !Number.isInteger(version) || version < 0) {
    return { success: false, error: "Revisa los datos" };
  }

  try {
    const userId = await assertRole("admin");
    const result = await db.$transaction(async (tx) => {
      const delivery = await tx.delivery.findUnique({
        where: { deliveryId },
        select: {
          deliveryId: true,
          orderId: true,
          status: true,
          courierId: true,
          courier: { select: { user: { select: { fullName: true } } } },
        },
      });
      if (!delivery) throw new DeliveryRuleError("Entrega no encontrada");

      const check = canTransitionDelivery(delivery.status, "pending", "admin", { isAssignedCourier: false });
      if (!check.ok) throw new DeliveryRuleError(check.reason);

      const updated = await tx.delivery.updateMany({
        where: { deliveryId, version },
        data: { courierId: null, assignedAt: null, status: "pending", version: { increment: 1 } },
      });
      if (updated.count !== 1) throw new StaleVersionError();

      const courierName = delivery.courier?.user.fullName ?? null;
      await tx.deliveryEvent.create({
        data: {
          deliveryId,
          fromStatus: delivery.status,
          toStatus: "pending",
          actorId: userId,
          note: courierName ? `Desasignada de ${courierName}` : null,
        },
      });
      await createAuditLog(tx, {
        action: "transition:pending",
        entityType: "Delivery",
        entityId: deliveryId,
        module: "deliveries",
        userId,
        oldValues: { status: delivery.status, courierId: delivery.courierId, courierName },
        newValues: { status: "pending", courierId: null },
      });
      return { orderId: delivery.orderId };
    });

    revalidateDeliveryPaths(result.orderId, deliveryId);
    return { success: true, data: undefined };
  } catch (error) {
    if (isRuleError(error)) return { success: false, error: error.message };
    return failAction("unassignCourier", error, "No se pudo desasignar el mensajero");
  }
}

function asCourierTarget(to: TransitionDeliveryInput["to"]): CourierDeliveryTarget | null {
  return to === "in_transit" || to === "delivered" || to === "failed" ? to : null;
}

/** Recoger / entregar / fallar, por el admin o por el mensajero asignado.
 *  El efecto sobre el pedido y el cobro contra entrega van en la misma tx. */
export async function transitionDelivery(input: TransitionDeliveryInput): Promise<ActionResult<void>> {
  const parsed = transitionDeliverySchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: firstIssueMessage(parsed.error, "Revisa los datos") };
  }
  const data = parsed.data;

  const to = asCourierTarget(data.to);
  if (!to) {
    return {
      success: false,
      error:
        data.to === "cancelled"
          ? "La entrega se cancela cancelando el pedido"
          : "Asignar o desasignar el mensajero se hace desde la lista de entregas",
    };
  }

  try {
    const session = await auth();
    if (!session?.user) throw new Error("No autenticado");
    const userId = session.user.userId;
    const isAdmin = session.user.role === "admin";
    if (!isAdmin && session.user.role !== "courier") throw new ForbiddenError();

    let sessionCourierId: number | null = null;
    if (!isAdmin) {
      sessionCourierId = await getSessionCourierId();
      if (sessionCourierId == null) {
        return { success: false, error: "Tu cuenta de mensajero no está activa" };
      }
    }

    const result = await db.$transaction((tx) =>
      applyDeliveryTransition(tx, {
        deliveryId: data.deliveryId,
        expectedVersion: data.version,
        to,
        actor: isAdmin ? "admin" : "courier",
        userId,
        sessionCourierId,
        failedReason: data.failedReason,
        proofPhotoUrl: data.proofPhotoUrl,
        amountCollected: data.amountCollected ?? null,
        note: data.note,
      })
    );

    revalidateDeliveryPaths(result.orderId, result.deliveryId);
    return { success: true, data: undefined };
  } catch (error) {
    if (isRuleError(error)) return { success: false, error: error.message };
    return failAction("transitionDelivery", error, "No se pudo actualizar la entrega");
  }
}
