"use server";

import { auth } from "@/lib/auth";
import { assertRole } from "@/lib/auth-guard";
import { failAction, firstIssueMessage } from "@/lib/action-utils";
import type { ActionResult } from "@/types";
import {
  createOrderSchema,
  transitionOrderSchema,
  type CreateOrderInput,
  type TransitionOrderInput,
} from "../lib/schemas";

const PENDING = "Pendiente de implementar: la creación de pedidos llega en la siguiente fase";

// Cuando se implemente (ver plan §4.4 y §7): en una sola transacción,
// recalcular precios desde DB con las tasas vigentes, descontar stock con
// `updateMany { stock: { gte: qty } }` + verificar count, StockMovement por
// línea, folio con nextFolio, snapshot de dirección/método/tasa, cupón,
// Customer por normalizedPhone (invitado) o por sesión, audit.
export async function createOrder(
  input: CreateOrderInput
): Promise<ActionResult<{ orderId: number; orderNo: string }>> {
  const parsed = createOrderSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: firstIssueMessage(parsed.error, "Revisa los datos del pedido") };
  }
  try {
    // El checkout de invitado está permitido: la sesión solo enlaza el cliente.
    await auth();
    return { success: false, error: PENDING };
  } catch (error) {
    return failAction("createOrder", error, "No se pudo crear el pedido");
  }
}

// Cuando se implemente: canTransitionOrder(from, to, "admin", ctx), efectos
// de §7 (confirmedAt/readyAt + crear Delivery; cancelled repone stock y
// cancela la entrega; delivered), updateMany con version, audit, revalidate.
export async function transitionOrder(input: TransitionOrderInput): Promise<ActionResult<void>> {
  const parsed = transitionOrderSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: firstIssueMessage(parsed.error, "Revisa los datos") };
  }
  try {
    await assertRole("admin");
    return { success: false, error: "Pendiente de implementar: los cambios de estado llegan en la siguiente fase" };
  } catch (error) {
    return failAction("transitionOrder", error, "No se pudo cambiar el estado del pedido");
  }
}

/** Cancelación por el propio cliente (solo pedidos pendientes y suyos). */
export async function cancelMyOrder(orderId: number, reason: string | null): Promise<ActionResult<void>> {
  try {
    const session = await auth();
    if (!session?.user) throw new Error("No autenticado");
    void orderId;
    void reason;
    return { success: false, error: "Pendiente de implementar: la cancelación llega en la siguiente fase" };
  } catch (error) {
    return failAction("cancelMyOrder", error, "No se pudo cancelar el pedido");
  }
}
