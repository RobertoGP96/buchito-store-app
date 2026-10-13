"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { assertRole } from "@/lib/auth-guard";
import { createAuditLog } from "@/lib/audit";
import { failAction, firstIssueMessage, IN_USE_MESSAGE, isForeignKeyViolation, isValidId } from "@/lib/action-utils";
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

/** Borra una ficha de cliente sin pedidos, con sus destinatarios. Si tiene
 *  cuenta de cliente, la cuenta se va con ella (sin ficha no tiene sentido);
 *  una cuenta con otro rol solo se desenlaza. */
export async function deleteCustomer(customerId: number): Promise<ActionResult<void>> {
  if (!isValidId(customerId)) return { success: false, error: "Cliente no válido" };

  try {
    const actorId = await assertRole("admin");
    const current = await db.customer.findUnique({
      where: { customerId },
      include: {
        user: { select: { userId: true, role: true, email: true } },
        _count: { select: { orders: true, recipients: true } },
      },
    });
    if (!current) return { success: false, error: "Cliente no encontrado" };
    if (current._count.orders > 0) {
      return { success: false, error: "Tiene pedidos registrados: su ficha forma parte del historial." };
    }
    if (current.user?.userId === actorId) {
      return { success: false, error: "No puedes eliminar tu propia ficha" };
    }

    const deleteAccount = current.user?.role === "customer";
    await db.$transaction(async (tx) => {
      await tx.customer.delete({ where: { customerId } });
      if (current.user && deleteAccount) {
        await tx.user.delete({ where: { userId: current.user.userId } });
      }
      await createAuditLog(tx, {
        action: "delete",
        entityType: "Customer",
        entityId: customerId,
        module: "customers",
        userId: actorId,
        oldValues: {
          name: current.name,
          phone: current.phone,
          email: current.email,
          userId: current.user?.userId ?? null,
          accountDeleted: deleteAccount,
          recipients: current._count.recipients,
        },
      });
    });

    revalidatePath("/admin/clientes");
    revalidatePath(`/admin/clientes/${customerId}`);
    if (deleteAccount) revalidatePath("/admin/usuarios");
    return { success: true, data: undefined };
  } catch (error) {
    if (isForeignKeyViolation(error)) return { success: false, error: IN_USE_MESSAGE };
    return failAction("deleteCustomer", error, "No se pudo eliminar el cliente");
  }
}
