"use server";

import { revalidatePath, revalidateTag } from "next/cache";
import { CACHE_TAGS } from "@/lib/cache-tags";
import { db } from "@/lib/db";
import { assertRole } from "@/lib/auth-guard";
import { createAuditLog } from "@/lib/audit";
import { failAction, firstIssueMessage, IN_USE_MESSAGE, isForeignKeyViolation, isValidId } from "@/lib/action-utils";
import type { ActionResult } from "@/types";
import { currencySchema, type CurrencyInput } from "../lib/schemas";

const PATHS = ["/admin/monedas", "/admin/monedas/tasas", "/admin/configuracion", "/admin/metodos-pago"];

function revalidateCurrencyPaths() {
  revalidateTag(CACHE_TAGS.currency);
  // setBaseCurrency escribe en StoreSetting: la configuración cacheada también cambia.
  revalidateTag(CACHE_TAGS.settings);
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

/** Cambia la moneda base de la tienda. Solo entre monedas activas; el resto
 *  de pantallas (catálogo, tasas, pedidos nuevos) la leen de StoreSetting. */
export async function setBaseCurrency(currencyId: number): Promise<ActionResult<void>> {
  if (!Number.isInteger(currencyId) || currencyId <= 0) {
    return { success: false, error: "Elige una moneda" };
  }
  try {
    const userId = await assertRole("admin");
    const currency = await db.currency.findUnique({ where: { currencyId } });
    if (!currency?.isActive) return { success: false, error: "La moneda base debe ser una moneda activa" };

    await db.$transaction(async (tx) => {
      const before = await tx.storeSetting.findUnique({ where: { id: 1 }, select: { baseCurrencyId: true } });
      if (before?.baseCurrencyId === currencyId) return;
      await tx.storeSetting.upsert({
        where: { id: 1 },
        create: { id: 1, baseCurrencyId: currencyId },
        update: { baseCurrencyId: currencyId },
      });
      await createAuditLog(tx, {
        action: "update",
        entityType: "StoreSetting",
        entityId: 1,
        module: "currency",
        userId,
        oldValues: { baseCurrencyId: before?.baseCurrencyId ?? null },
        newValues: { baseCurrencyId: currencyId, code: currency.code },
      });
    });

    revalidateCurrencyPaths();
    return { success: true, data: undefined };
  } catch (error) {
    return failAction("setBaseCurrency", error, "No se pudo cambiar la moneda base");
  }
}

/** Borra una moneda sin uso. La base, las que fijan precios de variantes o
 *  métodos de pago y las que aparecen en pedidos o cobros no se pueden borrar
 *  (ahí se desactivan). Sus tasas de cambio se van con ella: sin la moneda no
 *  significan nada. */
export async function deleteCurrency(currencyId: number): Promise<ActionResult<void>> {
  if (!isValidId(currencyId)) return { success: false, error: "Moneda no válida" };

  try {
    const userId = await assertRole("admin");
    const current = await db.currency.findUnique({
      where: { currencyId },
      include: {
        _count: {
          select: {
            settingsAsBase: true,
            variants: true,
            paymentMethods: true,
            orderPayments: true,
            orderLinesOrig: true,
            ordersAsBase: true,
            ordersAsPayment: true,
          },
        },
      },
    });
    if (!current) return { success: false, error: "Moneda no encontrada" };
    const used = current._count;
    if (used.settingsAsBase > 0) {
      return { success: false, error: "Es la moneda base. Elige otra moneda base antes de eliminarla." };
    }
    if (used.paymentMethods > 0) {
      return { success: false, error: "Hay métodos de pago en esta moneda. Elimínalos o cámbialos de moneda primero." };
    }
    if (used.variants > 0) {
      return { success: false, error: "Hay variantes con precio en esta moneda. Cambia su moneda primero." };
    }
    if (used.ordersAsBase + used.ordersAsPayment + used.orderPayments + used.orderLinesOrig > 0) {
      return { success: false, error: "Hay pedidos o cobros registrados en esta moneda. Desactívala en su lugar." };
    }

    await db.$transaction(async (tx) => {
      const rates = await tx.exchangeRate.findMany({
        where: { OR: [{ baseCurrencyId: currencyId }, { quoteCurrencyId: currencyId }] },
        select: { exchangeRateId: true },
      });
      const rateIds = rates.map((r) => r.exchangeRateId);
      if (rateIds.length > 0) {
        await tx.exchangeRateHistory.deleteMany({ where: { exchangeRateId: { in: rateIds } } });
        await tx.exchangeRate.deleteMany({ where: { exchangeRateId: { in: rateIds } } });
      }
      await tx.currency.delete({ where: { currencyId } });
      await createAuditLog(tx, {
        action: "delete",
        entityType: "Currency",
        entityId: currencyId,
        module: "currency",
        userId,
        oldValues: {
          code: current.code,
          name: current.name,
          symbol: current.symbol,
          decimalPlaces: current.decimalPlaces,
          isActive: current.isActive,
          deletedRates: rateIds.length,
        },
      });
    });

    revalidateCurrencyPaths();
    return { success: true, data: undefined };
  } catch (error) {
    if (isForeignKeyViolation(error)) return { success: false, error: IN_USE_MESSAGE };
    return failAction("deleteCurrency", error, "No se pudo eliminar la moneda");
  }
}
