"use server";

import { revalidatePath, revalidateTag } from "next/cache";
import { CACHE_TAGS } from "@/lib/cache-tags";
import { Prisma } from "@/generated/prisma";
import { db } from "@/lib/db";
import { assertRole } from "@/lib/auth-guard";
import { createAuditLog } from "@/lib/audit";
import { getBaseCurrency } from "@/lib/currency";
import { failAction, firstIssueMessage, StaleVersionError } from "@/lib/action-utils";
import type { ActionResult } from "@/types";
import { rateSchema, type RateInput } from "../lib/schemas";

function revalidateRatePaths() {
  revalidateTag(CACHE_TAGS.currency);
  revalidatePath("/admin/monedas/tasas");
  revalidatePath("/admin/monedas");
  revalidatePath("/", "layout");
}

/** Fija la tasa `currencyId → base` (base por 1 unidad de la moneda). Crea
 *  el par si no existe; si existe, exige la `version` conocida (optimistic
 *  locking) y escribe el historial. Un solo par por combinación: si existe
 *  el inverso (base → moneda) se actualiza ese con 1/rate para no tener dos
 *  verdades. */
export async function upsertRate(
  input: RateInput
): Promise<ActionResult<{ exchangeRateId: number }>> {
  const parsed = rateSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: firstIssueMessage(parsed.error, "Revisa los datos") };
  }
  const { currencyId, rate, note, version } = parsed.data;

  try {
    const userId = await assertRole("admin");
    const base = await getBaseCurrency(db);
    if (currencyId === base.currencyId) {
      return { success: false, error: "La moneda base no necesita tasa" };
    }
    const currency = await db.currency.findUnique({ where: { currencyId } });
    if (!currency) return { success: false, error: "Moneda no encontrada" };

    const result = await db.$transaction(async (tx) => {
      const direct = await tx.exchangeRate.findUnique({
        where: {
          baseCurrencyId_quoteCurrencyId: {
            baseCurrencyId: currencyId,
            quoteCurrencyId: base.currencyId,
          },
        },
      });
      const inverse = direct
        ? null
        : await tx.exchangeRate.findUnique({
            where: {
              baseCurrencyId_quoteCurrencyId: {
                baseCurrencyId: base.currencyId,
                quoteCurrencyId: currencyId,
              },
            },
          });

      const target = direct ?? inverse;
      const newRate = direct || !inverse
        ? new Prisma.Decimal(rate)
        : new Prisma.Decimal(1).dividedBy(rate);

      if (!target) {
        const created = await tx.exchangeRate.create({
          data: {
            baseCurrencyId: currencyId,
            quoteCurrencyId: base.currencyId,
            rate: newRate,
            updatedById: userId,
          },
        });
        await tx.exchangeRateHistory.create({
          data: { exchangeRateId: created.exchangeRateId, oldRate: null, newRate, changedById: userId, note },
        });
        await createAuditLog(tx, {
          action: "create",
          entityType: "ExchangeRate",
          entityId: created.exchangeRateId,
          module: "currency",
          userId,
          newValues: { from: currency.code, to: base.code, rate },
        });
        return created;
      }

      const updated = await tx.exchangeRate.updateMany({
        where: {
          exchangeRateId: target.exchangeRateId,
          ...(version != null ? { version } : {}),
        },
        data: { rate: newRate, version: { increment: 1 }, updatedById: userId },
      });
      if (updated.count !== 1) throw new StaleVersionError();

      await tx.exchangeRateHistory.create({
        data: {
          exchangeRateId: target.exchangeRateId,
          oldRate: target.rate,
          newRate,
          changedById: userId,
          note,
        },
      });
      await createAuditLog(tx, {
        action: "update",
        entityType: "ExchangeRate",
        entityId: target.exchangeRateId,
        module: "currency",
        userId,
        oldValues: { rate: target.rate.toString() },
        newValues: { from: currency.code, to: base.code, rate, note },
      });
      return target;
    });

    revalidateRatePaths();
    return { success: true, data: { exchangeRateId: result.exchangeRateId } };
  } catch (error) {
    if (error instanceof StaleVersionError) {
      return { success: false, error: error.message };
    }
    return failAction("upsertRate", error, "No se pudo guardar la tasa");
  }
}
