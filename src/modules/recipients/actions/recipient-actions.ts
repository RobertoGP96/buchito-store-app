"use server";

import { revalidatePath } from "next/cache";
import type { Prisma } from "@/generated/prisma";
import { db } from "@/lib/db";
import { assertSessionCustomer } from "@/lib/auth-guard";
import { createAuditLog } from "@/lib/audit";
import { failAction, firstIssueMessage, isValidId } from "@/lib/action-utils";
import type { ActionResult } from "@/types";
import { recipientSchema, type RecipientInput, type RecipientValues } from "../lib/schemas";

const NOT_FOUND = "Destinatario no encontrado";
const ZONE_UNAVAILABLE = "La zona ya no está disponible. Elige otra.";
const INVALID_MESSAGE = "Revisa los datos del destinatario";

/** Regla de negocio que se lanza dentro de la tx para revertirla con mensaje. */
class RecipientError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "RecipientError";
  }
}

function revalidateRecipientPaths() {
  revalidatePath("/perfil/destinatarios");
  revalidatePath("/checkout");
}

async function zoneIsActive(zoneId: number | null): Promise<boolean> {
  if (zoneId == null) return true;
  const zone = await db.deliveryZone.findFirst({ where: { zoneId, active: true }, select: { zoneId: true } });
  return zone != null;
}

function toColumns(data: RecipientValues) {
  return {
    recipientName: data.name,
    phone: data.phone,
    line1: data.line1,
    line2: data.line2,
    neighborhood: data.neighborhood,
    city: data.city,
    reference: data.reference,
    zoneId: data.zoneId,
  };
}

function auditValues(row: {
  recipientName: string | null;
  phone: string | null;
  line1: string;
  line2: string | null;
  neighborhood: string | null;
  city: string;
  reference: string | null;
  zoneId: number | null;
  isDefault: boolean;
}) {
  return {
    name: row.recipientName,
    phone: row.phone,
    line1: row.line1,
    line2: row.line2,
    neighborhood: row.neighborhood,
    city: row.city,
    reference: row.reference,
    zoneId: row.zoneId,
    isDefault: row.isDefault,
  };
}

/** El índice parcial `uq_address_default_per_customer` solo admite un
 *  principal por cliente: se limpia el anterior antes de marcar el nuevo. */
async function clearDefault(tx: Prisma.TransactionClient, customerId: number) {
  await tx.customerAddress.updateMany({ where: { customerId, isDefault: true }, data: { isDefault: false } });
}

export async function createRecipient(input: RecipientInput): Promise<ActionResult<{ addressId: number }>> {
  const parsed = recipientSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: firstIssueMessage(parsed.error, INVALID_MESSAGE) };
  }
  const data = parsed.data;

  try {
    const customer = await assertSessionCustomer();
    if (!(await zoneIsActive(data.zoneId))) return { success: false, error: ZONE_UNAVAILABLE };

    const row = await db.$transaction(async (tx) => {
      const count = await tx.customerAddress.count({ where: { customerId: customer.customerId } });
      // El primero del cliente nace principal: el checkout siempre tiene uno elegido.
      const isDefault = data.isDefault || count === 0;
      if (isDefault) await clearDefault(tx, customer.customerId);
      const created = await tx.customerAddress.create({
        data: { customerId: customer.customerId, isDefault, ...toColumns(data) },
      });
      await createAuditLog(tx, {
        action: "create",
        entityType: "CustomerAddress",
        entityId: created.addressId,
        module: "recipients",
        userId: customer.userId,
        newValues: auditValues(created),
      });
      return created;
    });

    revalidateRecipientPaths();
    return { success: true, data: { addressId: row.addressId } };
  } catch (error) {
    return failAction("createRecipient", error, "No se pudo guardar el destinatario");
  }
}

export async function updateRecipient(addressId: number, input: RecipientInput): Promise<ActionResult<void>> {
  if (!isValidId(addressId)) return { success: false, error: NOT_FOUND };
  const parsed = recipientSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: firstIssueMessage(parsed.error, INVALID_MESSAGE) };
  }
  const data = parsed.data;

  try {
    const customer = await assertSessionCustomer();
    // La propiedad se comprueba por `customerId`: un id ajeno es "no encontrado".
    const current = await db.customerAddress.findFirst({
      where: { addressId, customerId: customer.customerId },
    });
    if (!current) return { success: false, error: NOT_FOUND };
    if (!(await zoneIsActive(data.zoneId))) return { success: false, error: ZONE_UNAVAILABLE };

    // El principal no se "desmarca": se marca otro en su lugar.
    const isDefault = current.isDefault || data.isDefault;
    await db.$transaction(async (tx) => {
      if (isDefault && !current.isDefault) await clearDefault(tx, customer.customerId);
      const updated = await tx.customerAddress.updateMany({
        where: { addressId, customerId: customer.customerId },
        data: { ...toColumns(data), isDefault },
      });
      if (updated.count !== 1) throw new RecipientError(NOT_FOUND);
      await createAuditLog(tx, {
        action: "update",
        entityType: "CustomerAddress",
        entityId: addressId,
        module: "recipients",
        userId: customer.userId,
        oldValues: auditValues(current),
        newValues: auditValues({ ...toColumns(data), isDefault }),
      });
    });

    revalidateRecipientPaths();
    return { success: true, data: undefined };
  } catch (error) {
    if (error instanceof RecipientError) return { success: false, error: error.message };
    return failAction("updateRecipient", error, "No se pudo guardar el destinatario");
  }
}

/** Borrar es seguro: los pedidos guardan una copia del destinatario, no un
 *  enlace a esta fila. */
export async function deleteRecipient(addressId: number): Promise<ActionResult<void>> {
  if (!isValidId(addressId)) return { success: false, error: NOT_FOUND };

  try {
    const customer = await assertSessionCustomer();
    const current = await db.customerAddress.findFirst({
      where: { addressId, customerId: customer.customerId },
    });
    if (!current) return { success: false, error: NOT_FOUND };

    await db.$transaction(async (tx) => {
      const deleted = await tx.customerAddress.deleteMany({
        where: { addressId, customerId: customer.customerId },
      });
      if (deleted.count !== 1) throw new RecipientError(NOT_FOUND);
      // Si se va el principal, el siguiente ocupa su lugar.
      if (current.isDefault) {
        const next = await tx.customerAddress.findFirst({
          where: { customerId: customer.customerId },
          orderBy: { addressId: "asc" },
          select: { addressId: true },
        });
        if (next) {
          await tx.customerAddress.update({ where: { addressId: next.addressId }, data: { isDefault: true } });
        }
      }
      await createAuditLog(tx, {
        action: "delete",
        entityType: "CustomerAddress",
        entityId: addressId,
        module: "recipients",
        userId: customer.userId,
        oldValues: auditValues(current),
      });
    });

    revalidateRecipientPaths();
    return { success: true, data: undefined };
  } catch (error) {
    if (error instanceof RecipientError) return { success: false, error: error.message };
    return failAction("deleteRecipient", error, "No se pudo eliminar el destinatario");
  }
}
