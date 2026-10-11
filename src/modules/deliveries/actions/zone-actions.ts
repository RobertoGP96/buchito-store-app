"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { assertRole } from "@/lib/auth-guard";
import { createAuditLog } from "@/lib/audit";
import { failAction, firstIssueMessage } from "@/lib/action-utils";
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
