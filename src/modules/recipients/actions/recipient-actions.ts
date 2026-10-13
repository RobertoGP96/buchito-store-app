"use server";

import { revalidatePath } from "next/cache";
import { Prisma } from "@/generated/prisma";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { createAuditLog } from "@/lib/audit";
import { failAction, firstIssueMessage, isValidId } from "@/lib/action-utils";
import { normalizePhone } from "@/lib/phone";
import type { ActionResult } from "@/types";
import { recipientSchema, type RecipientInput } from "../lib/schemas";
import { createRecipientInTx } from "../lib/save-recipient";

function revalidateRecipientPaths(customerId: number) {
  revalidatePath("/perfil/destinatarios");
  revalidatePath("/checkout");
  revalidatePath(`/admin/clientes/${customerId}`);
}

/** Ficha de cliente del usuario con sesión. Cualquier rol puede comprar en la
 *  tienda, así que si el usuario (p. ej. un admin) aún no tiene ficha se crea
 *  al vuelo con los datos de la cuenta; el teléfono lo completa el checkout. */
async function getSessionCustomer(tx: Prisma.TransactionClient): Promise<{ customerId: number; userId: number }> {
  const session = await auth();
  if (!session?.user) throw new Error("No autenticado");
  const userId = session.user.userId;
  const own = await tx.customer.findUnique({ where: { userId }, select: { customerId: true } });
  if (own) return { customerId: own.customerId, userId };
  const created = await tx.customer.create({
    data: {
      userId,
      name: session.user.fullName,
      phone: "",
      normalizedPhone: normalizePhone(""),
      email: session.user.email ?? null,
    },
    select: { customerId: true },
  });
  return { customerId: created.customerId, userId };
}

export async function createRecipient(input: RecipientInput): Promise<ActionResult<{ recipientId: number }>> {
  const parsed = recipientSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: firstIssueMessage(parsed.error, "Revisa los datos del destinatario") };
  }
  const data = parsed.data;

  try {
    const result = await db.$transaction(async (tx) => {
      const { customerId, userId } = await getSessionCustomer(tx);
      const row = await createRecipientInTx(tx, customerId, data);
      await createAuditLog(tx, {
        action: "create",
        entityType: "Recipient",
        entityId: row.recipientId,
        module: "recipients",
        userId,
        newValues: { ...data, customerId },
      });
      return { ...row, customerId };
    });

    revalidateRecipientPaths(result.customerId);
    return { success: true, data: { recipientId: result.recipientId } };
  } catch (error) {
    return failAction("createRecipient", error, "No se pudo guardar el destinatario");
  }
}

export async function updateRecipient(recipientId: number, input: RecipientInput): Promise<ActionResult<void>> {
  if (!isValidId(recipientId)) return { success: false, error: "Destinatario no válido" };
  const parsed = recipientSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: firstIssueMessage(parsed.error, "Revisa los datos del destinatario") };
  }
  const data = parsed.data;

  try {
    const customerId = await db.$transaction(async (tx) => {
      const { customerId, userId } = await getSessionCustomer(tx);
      // El where incluye al cliente: nadie edita destinatarios ajenos.
      const current = await tx.recipient.findFirst({ where: { recipientId, customerId } });
      if (!current) throw new NotFoundError();

      // No se puede quitar el "principal" sin elegir otro: siempre hay uno.
      const isDefault = current.isDefault || data.isDefault;
      if (isDefault && !current.isDefault) {
        await tx.recipient.updateMany({ where: { customerId, isDefault: true }, data: { isDefault: false } });
      }
      await tx.recipient.update({ where: { recipientId }, data: { ...data, isDefault } });
      await createAuditLog(tx, {
        action: "update",
        entityType: "Recipient",
        entityId: recipientId,
        module: "recipients",
        userId,
        oldValues: current,
        newValues: { ...data, isDefault },
      });
      return customerId;
    });

    revalidateRecipientPaths(customerId);
    return { success: true, data: undefined };
  } catch (error) {
    if (error instanceof NotFoundError) return { success: false, error: error.message };
    return failAction("updateRecipient", error, "No se pudo actualizar el destinatario");
  }
}

export async function setDefaultRecipient(recipientId: number): Promise<ActionResult<void>> {
  if (!isValidId(recipientId)) return { success: false, error: "Destinatario no válido" };

  try {
    const customerId = await db.$transaction(async (tx) => {
      const { customerId, userId } = await getSessionCustomer(tx);
      const current = await tx.recipient.findFirst({ where: { recipientId, customerId }, select: { isDefault: true } });
      if (!current) throw new NotFoundError();
      if (!current.isDefault) {
        await tx.recipient.updateMany({ where: { customerId, isDefault: true }, data: { isDefault: false } });
        await tx.recipient.update({ where: { recipientId }, data: { isDefault: true } });
        await createAuditLog(tx, {
          action: "update",
          entityType: "Recipient",
          entityId: recipientId,
          module: "recipients",
          userId,
          oldValues: { isDefault: false },
          newValues: { isDefault: true },
        });
      }
      return customerId;
    });

    revalidateRecipientPaths(customerId);
    return { success: true, data: undefined };
  } catch (error) {
    if (error instanceof NotFoundError) return { success: false, error: error.message };
    return failAction("setDefaultRecipient", error, "No se pudo cambiar el destinatario principal");
  }
}

/** Los pedidos guardan su propio snapshot del destinatario, así que borrar
 *  uno nunca toca el historial. Si era el principal, hereda el más antiguo. */
export async function deleteRecipient(recipientId: number): Promise<ActionResult<void>> {
  if (!isValidId(recipientId)) return { success: false, error: "Destinatario no válido" };

  try {
    const customerId = await db.$transaction(async (tx) => {
      const { customerId, userId } = await getSessionCustomer(tx);
      const current = await tx.recipient.findFirst({ where: { recipientId, customerId } });
      if (!current) throw new NotFoundError();

      await tx.recipient.delete({ where: { recipientId } });
      if (current.isDefault) {
        const next = await tx.recipient.findFirst({
          where: { customerId },
          orderBy: { recipientId: "asc" },
          select: { recipientId: true },
        });
        if (next) await tx.recipient.update({ where: { recipientId: next.recipientId }, data: { isDefault: true } });
      }
      await createAuditLog(tx, {
        action: "delete",
        entityType: "Recipient",
        entityId: recipientId,
        module: "recipients",
        userId,
        oldValues: current,
      });
      return customerId;
    });

    revalidateRecipientPaths(customerId);
    return { success: true, data: undefined };
  } catch (error) {
    if (error instanceof NotFoundError) return { success: false, error: error.message };
    return failAction("deleteRecipient", error, "No se pudo eliminar el destinatario");
  }
}

class NotFoundError extends Error {
  constructor() {
    super("Destinatario no encontrado");
    this.name = "NotFoundError";
  }
}
