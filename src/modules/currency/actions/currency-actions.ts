"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { assertRole } from "@/lib/auth-guard";
import { createAuditLog } from "@/lib/audit";
import { failAction, firstIssueMessage } from "@/lib/action-utils";
import type { ActionResult } from "@/types";
import { currencySchema, type CurrencyInput } from "../lib/schemas";

const PATHS = ["/admin/monedas", "/admin/monedas/tasas", "/admin/configuracion", "/admin/metodos-pago"];

function revalidateCurrencyPaths() {
  for (const path of PATHS) revalidatePath(path);
  revalidatePath("/", "layout");
}

export async function createCurrency(
  input: CurrencyInput
): Promise<ActionResult<{ currencyId: number }>> {
  const parsed = currencySchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: firstIssueMessage(parsed.error, "Revisa los datos") };
  }
  const data = parsed.data;

  try {
    const userId = await assertRole("admin");
    const existing = await db.currency.findUnique({ where: { code: data.code } });
    if (existing) {
      return { success: false, error: `Ya existe la moneda ${data.code}` };
    }

    const currency = await db.$transaction(async (tx) => {
      const row = await tx.currency.create({ data });
      await createAuditLog(tx, {
        action: "create",
        entityType: "Currency",
        entityId: row.currencyId,
        module: "currency",
        userId,
        newValues: data,
      });
      return row;
    });

    revalidateCurrencyPaths();
    return { success: true, data: { currencyId: currency.currencyId } };
  } catch (error) {
    return failAction("createCurrency", error, "No se pudo crear la moneda");
  }
}

export async function updateCurrency(
  currencyId: number,
  input: CurrencyInput
): Promise<ActionResult<void>> {
  const parsed = currencySchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: firstIssueMessage(parsed.error, "Revisa los datos") };
  }
  const data = parsed.data;

  try {
    const userId = await assertRole("admin");
    const current = await db.currency.findUnique({ where: { currencyId } });
    if (!current) return { success: false, error: "Moneda no encontrada" };

    if (data.code !== current.code) {
      const duplicate = await db.currency.findUnique({ where: { code: data.code } });
      if (duplicate) return { success: false, error: `Ya existe la moneda ${data.code}` };
    }

    if (!data.isActive) {
      const settings = await db.storeSetting.findUnique({ where: { id: 1 } });
      if (settings?.baseCurrencyId === currencyId) {
        return { success: false, error: "No puedes desactivar la moneda base" };
      }
      const activeMethods = await db.paymentMethod.count({
        where: { currencyId, isActive: true },
      });
      if (activeMethods > 0) {
        return {
          success: false,
          error: "Hay métodos de pago activos en esta moneda. Desactívalos primero.",
        };
      }
    }

    await db.$transaction(async (tx) => {
      await tx.currency.update({ where: { currencyId }, data });
      await createAuditLog(tx, {
        action: "update",
        entityType: "Currency",
        entityId: currencyId,
        module: "currency",
        userId,
        oldValues: current,
        newValues: data,
      });
    });

    revalidateCurrencyPaths();
    return { success: true, data: undefined };
  } catch (error) {
    return failAction("updateCurrency", error, "No se pudo actualizar la moneda");
  }
}
