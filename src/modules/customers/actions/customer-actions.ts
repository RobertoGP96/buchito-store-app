"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { assertRole } from "@/lib/auth-guard";
import { createAuditLog } from "@/lib/audit";
import { failAction, firstIssueMessage } from "@/lib/action-utils";
import type { ActionResult } from "@/types";
import { customerNotesSchema } from "../lib/schemas";

export async function updateCustomerNotes(
  customerId: number,
  notes: string | null
): Promise<ActionResult<void>> {
  const parsed = customerNotesSchema.safeParse({ notes });
  if (!parsed.success) {
    return { success: false, error: firstIssueMessage(parsed.error, "Revisa las notas") };
  }
  const data = parsed.data;

  try {
    const userId = await assertRole("admin");
    const current = await db.customer.findUnique({
      where: { customerId },
      select: { customerId: true, notes: true },
    });
    if (!current) return { success: false, error: "Cliente no encontrado" };

    await db.$transaction(async (tx) => {
      await tx.customer.update({
        where: { customerId },
        data: { notes: data.notes, version: { increment: 1 } },
      });
      await createAuditLog(tx, {
        action: "update",
        entityType: "Customer",
        entityId: customerId,
        module: "customers",
        userId,
        oldValues: { notes: current.notes },
        newValues: { notes: data.notes },
      });
    });

    revalidatePath(`/admin/clientes/${customerId}`);
    revalidatePath("/admin/clientes");
    return { success: true, data: undefined };
  } catch (error) {
    return failAction("updateCustomerNotes", error, "No se pudieron guardar las notas");
  }
}
