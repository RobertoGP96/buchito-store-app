"use server";

import { assertRole } from "@/lib/auth-guard";
import { failAction, firstIssueMessage } from "@/lib/action-utils";
import type { ActionResult } from "@/types";
import { stockAdjustmentSchema, type StockAdjustmentInput } from "../lib/schemas";

// Cuando se implemente: nunca `decrement` ciego. `updateMany` condicional
// (`stock: { gte: qty }` para salidas) + verificar `count`, StockMovement con
// `stockAfter` y audit, todo en una transacción.
export async function adjustStock(
  input: StockAdjustmentInput
): Promise<ActionResult<{ stockAfter: number }>> {
  const parsed = stockAdjustmentSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: firstIssueMessage(parsed.error, "Revisa los datos") };
  }
  try {
    await assertRole("admin");
    return {
      success: false,
      error: "Pendiente de implementar: los ajustes de stock llegan en la siguiente fase",
    };
  } catch (error) {
    return failAction("adjustStock", error, "No se pudo ajustar el stock");
  }
}
