"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { assertRole } from "@/lib/auth-guard";
import { createAuditLog } from "@/lib/audit";
import { failAction, firstIssueMessage, IN_USE_MESSAGE, isForeignKeyViolation, isValidId } from "@/lib/action-utils";
import type { ActionResult } from "@/types";
import { zoneSchema, type ZoneInput } from "../lib/schemas";

function revalidateZonePaths() {
  revalidatePath("/admin/entregas/zonas");
  revalidatePath("/admin/entregas");
  revalidatePath("/checkout");
}

export async function createZone(input: ZoneInput): Promise<ActionResult<{ zoneId: number }>> {
  const parsed = zoneSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: firstIssueMessage(parsed.error, "Revisa los datos") };
  }
  const data = parsed.data;

  try {
    const userId = await assertRole("admin");
    const duplicate = await db.deliveryZone.findUnique({ where: { name: data.name } });
    if (duplicate) return { success: false, error: `Ya existe la zona "${data.name}"` };

    const row = await db.$transaction(async (tx) => {
      const created = await tx.deliveryZone.create({ data });
      await createAuditLog(tx, {
        action: "create",
        entityType: "DeliveryZone",
        entityId: created.zoneId,
        module: "deliveries",
        userId,
        newValues: data,
      });
      return created;
    });

    revalidateZonePaths();
    return { success: true, data: { zoneId: row.zoneId } };
  } catch (error) {
    return failAction("createZone", error, "No se pudo crear la zona");
  }
}

export async function updateZone(zoneId: number, input: ZoneInput): Promise<ActionResult<void>> {
  const parsed = zoneSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: firstIssueMessage(parsed.error, "Revisa los datos") };
  }
  const data = parsed.data;

  try {
    const userId = await assertRole("admin");
    const current = await db.deliveryZone.findUnique({ where: { zoneId } });
    if (!current) return { success: false, error: "Zona no encontrada" };
    if (data.name !== current.name) {
      const duplicate = await db.deliveryZone.findUnique({ where: { name: data.name } });
      if (duplicate) return { success: false, error: `Ya existe la zona "${data.name}"` };
    }

    await db.$transaction(async (tx) => {
      await tx.deliveryZone.update({ where: { zoneId }, data });
      await createAuditLog(tx, {
        action: "update",
        entityType: "DeliveryZone",
        entityId: zoneId,
        module: "deliveries",
        userId,
        oldValues: current,
        newValues: data,
      });
    });

    revalidateZonePaths();
    return { success: true, data: undefined };
  } catch (error) {
    return failAction("updateZone", error, "No se pudo actualizar la zona");
  }
}

/** Borra una zona sin pedidos ni entregas. Las direcciones de clientes que la
 *  tenían asignada quedan sin zona (la DB las desenlaza sola). */
export async function deleteZone(zoneId: number): Promise<ActionResult<void>> {
  if (!isValidId(zoneId)) return { success: false, error: "Zona no válida" };

  try {
    const userId = await assertRole("admin");
    const current = await db.deliveryZone.findUnique({
      where: { zoneId },
      include: { _count: { select: { orders: true, deliveries: true, addresses: true } } },
    });
    if (!current) return { success: false, error: "Zona no encontrada" };
    if (current._count.orders > 0 || current._count.deliveries > 0) {
      return { success: false, error: "Hay pedidos o entregas en esta zona. Desactívala en su lugar." };
    }

    await db.$transaction(async (tx) => {
      await tx.deliveryZone.delete({ where: { zoneId } });
      await createAuditLog(tx, {
        action: "delete",
        entityType: "DeliveryZone",
        entityId: zoneId,
        module: "deliveries",
        userId,
        oldValues: {
          name: current.name,
          fee: current.fee.toString(),
          freeShippingThreshold: current.freeShippingThreshold?.toString() ?? null,
          active: current.active,
          unlinkedAddresses: current._count.addresses,
        },
      });
    });

    revalidateZonePaths();
    revalidatePath("/admin/clientes");
    return { success: true, data: undefined };
  } catch (error) {
    if (isForeignKeyViolation(error)) return { success: false, error: IN_USE_MESSAGE };
    return failAction("deleteZone", error, "No se pudo eliminar la zona");
  }
}
