"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { assertRole, getSessionCourierId } from "@/lib/auth-guard";
import { failAction, firstIssueMessage, StaleVersionError } from "@/lib/action-utils";
import type { ActionResult } from "@/types";
import { isPaymentRuleError, recordOrderPayment } from "../lib/record-payment";
import { registerPaymentSchema, type RegisterPaymentInput } from "../lib/schemas";

export async function registerOrderPayment(
  input: RegisterPaymentInput
): Promise<ActionResult<{ paymentId: number }>> {
  const parsed = registerPaymentSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: firstIssueMessage(parsed.error, "Revisa los datos del cobro") };
  }
  const data = parsed.data;

  try {
    const userId = await assertRole("admin", "courier");

    // Un mensajero solo cobra lo que reparte él; el admin cobra cualquier pedido.
    const session = await auth();
    if (session?.user?.role !== "admin") {
      const [courierId, delivery] = await Promise.all([
        getSessionCourierId(),
        db.delivery.findUnique({ where: { orderId: data.orderId }, select: { courierId: true } }),
      ]);
      if (courierId == null || delivery?.courierId !== courierId) {
        return { success: false, error: "Solo puedes cobrar entregas asignadas a ti" };
      }
    }

    const result = await db.$transaction((tx) =>
      recordOrderPayment(tx, {
        orderId: data.orderId,
        paymentMethodId: data.paymentMethodId,
        amountTendered: data.amountTendered,
        reference: data.reference,
        notes: data.notes,
        receivedById: userId,
        actorRole: session?.user?.role === "admin" ? "admin" : "courier",
        origin: "manual",
        actorName: session?.user?.fullName ?? null,
      })
    );

    revalidatePath("/admin/pedidos");
    revalidatePath(`/admin/pedidos/${data.orderId}`);
    revalidatePath("/perfil/pedidos");
    revalidatePath("/mensajero");
    return { success: true, data: { paymentId: result.paymentId } };
  } catch (error) {
    if (error instanceof StaleVersionError || isPaymentRuleError(error)) {
      return { success: false, error: error.message };
    }
    return failAction("registerOrderPayment", error, "No se pudo registrar el cobro");
  }
}
