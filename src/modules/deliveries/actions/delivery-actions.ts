"use server";

import { assertRole, getSessionCourierId } from "@/lib/auth-guard";
import { failAction, firstIssueMessage } from "@/lib/action-utils";
import type { ActionResult } from "@/types";
import {
  assignCourierSchema,
  transitionDeliverySchema,
  type AssignCourierInput,
  type TransitionDeliveryInput,
} from "../lib/schemas";

const PENDING = "Pendiente de implementar: la gestión de entregas llega en la siguiente fase";

// Cuando se implemente (plan §7): canTransitionDelivery(from, "assigned",
// "admin", { courierId }) → courier activo, assignedAt, DeliveryEvent, audit,
// updateMany con version.
export async function assignCourier(input: AssignCourierInput): Promise<ActionResult<void>> {
  const parsed = assignCourierSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: firstIssueMessage(parsed.error, "Revisa los datos") };
  }
  try {
    await assertRole("admin");
    return { success: false, error: PENDING };
  } catch (error) {
    return failAction("assignCourier", error, "No se pudo asignar el mensajero");
  }
}

export async function unassignCourier(deliveryId: number, version: number): Promise<ActionResult<void>> {
  try {
    await assertRole("admin");
    void deliveryId;
    void version;
    return { success: false, error: PENDING };
  } catch (error) {
    return failAction("unassignCourier", error, "No se pudo desasignar el mensajero");
  }
}

// Cuando se implemente: actor = admin o el courier de sesión (isAssignedCourier
// = getSessionCourierId() === delivery.courierId); efectos sobre Order con la
// máquina de pedidos como `system` (orderEffectFor), cobro contra entrega →
// registerOrderPayment, DeliveryEvent, audit, revalidate de /mensajero y
// /admin/entregas.
export async function transitionDelivery(input: TransitionDeliveryInput): Promise<ActionResult<void>> {
  const parsed = transitionDeliverySchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: firstIssueMessage(parsed.error, "Revisa los datos") };
  }
  try {
    const courierId = await getSessionCourierId();
    if (courierId == null) await assertRole("admin");
    return { success: false, error: PENDING };
  } catch (error) {
    return failAction("transitionDelivery", error, "No se pudo actualizar la entrega");
  }
}
