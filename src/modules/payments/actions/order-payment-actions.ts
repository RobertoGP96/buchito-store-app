"use server";

import { assertRole } from "@/lib/auth-guard";
import { failAction, firstIssueMessage } from "@/lib/action-utils";
import type { ActionResult } from "@/types";
import { registerPaymentSchema, type RegisterPaymentInput } from "../lib/schemas";

// Cuando se implemente (plan §4.4): en una tx, getRateToBase(currencyId del
// método) → OrderPayment { amountTendered, exchangeRate, amountBase },
// Order.paidBase += amountBase, paymentStatus = derivePaymentStatus(...),
// updateMany con version, audit module "payments", revalidate del pedido.
export async function registerOrderPayment(
  input: RegisterPaymentInput
): Promise<ActionResult<{ paymentId: number }>> {
  const parsed = registerPaymentSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: firstIssueMessage(parsed.error, "Revisa los datos del cobro") };
  }
  try {
    await assertRole("admin", "courier");
    return { success: false, error: "Pendiente de implementar: el registro de cobros llega en la siguiente fase" };
  } catch (error) {
    return failAction("registerOrderPayment", error, "No se pudo registrar el cobro");
  }
}
