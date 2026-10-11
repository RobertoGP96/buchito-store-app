"use server";

import { revalidatePath, revalidateTag } from "next/cache";
import { CACHE_TAGS } from "@/lib/cache-tags";
import { db } from "@/lib/db";
import { assertRole } from "@/lib/auth-guard";
import { createAuditLog } from "@/lib/audit";
import { failAction, firstIssueMessage } from "@/lib/action-utils";
import type { ActionResult } from "@/types";
import { storeSettingsSchema, type StoreSettingsInput } from "../lib/schemas";

export async function updateStoreSettings(input: StoreSettingsInput): Promise<ActionResult<void>> {
  const parsed = storeSettingsSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: firstIssueMessage(parsed.error, "Revisa los datos") };
  }
  const data = parsed.data;

  try {
    const userId = await assertRole("admin");

    const currency = await db.currency.findUnique({
      where: { currencyId: data.baseCurrencyId },
      select: { isActive: true },
    });
    if (!currency?.isActive) {
      return { success: false, error: "La moneda base debe ser una moneda activa" };
    }

    await db.$transaction(async (tx) => {
      const before = await tx.storeSetting.findUnique({ where: { id: 1 } });
      const after = await tx.storeSetting.upsert({
        where: { id: 1 },
        create: { id: 1, ...data },
        update: data,
      });
      await createAuditLog(tx, {
        action: before ? "update" : "create",
        entityType: "StoreSetting",
        entityId: after.id,
        module: "settings",
        userId,
        oldValues: before,
        newValues: data,
      });
    });

    // La moneda base vive en la configuración: también cambia base y tasas.
    revalidateTag(CACHE_TAGS.settings);
    revalidateTag(CACHE_TAGS.currency);
    revalidatePath("/admin/configuracion");
    revalidatePath("/", "layout");
    return { success: true, data: undefined };
  } catch (error) {
    return failAction("updateStoreSettings", error, "No se pudo guardar la configuración");
  }
}
