"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { assertRole } from "@/lib/auth-guard";
import { createAuditLog } from "@/lib/audit";
import { failAction, firstIssueMessage, StaleVersionError } from "@/lib/action-utils";
import { roundToCurrency } from "@/lib/currency-math";
import { decimalToNumber } from "@/lib/money";
import { Prisma } from "@/generated/prisma";
import type { ActionResult } from "@/types";
import { stockAdjustmentSchema, type StockAdjustmentInput } from "../lib/schemas";
import { isStockRuleError, planStockMovement, StockRuleError } from "../lib/stock";

function revalidateStockPaths(productId: number, slug: string) {
  revalidatePath("/admin/productos");
  revalidatePath(`/admin/productos/${productId}`);
  revalidatePath("/catalogo");
  revalidatePath("/");
  revalidatePath(`/producto/${slug}`);
}

/** Movimiento manual de stock. Nunca `decrement` ciego: las salidas van con
 *  `updateMany where stock >= qty` y los ajustes con `where stock = leído`,
 *  para no pisar una venta concurrente. Cada cambio deja su StockMovement. */
export async function adjustStock(
  input: StockAdjustmentInput
): Promise<ActionResult<{ stockAfter: number }>> {
  const parsed = stockAdjustmentSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: firstIssueMessage(parsed.error, "Revisa los datos") };
  }
  const { variantId, type, quantity, notes } = parsed.data;

  try {
    const userId = await assertRole("admin");
    const variant = await db.productVariant.findUnique({
      where: { variantId },
      select: {
        stock: true,
        productId: true,
        priceCurrencyId: true,
        costCurrencyId: true,
        product: { select: { slug: true } },
      },
    });
    if (!variant) return { success: false, error: "Variante no encontrada" };

    // Precio de compra de la entrada: pasa al kardex y actualiza el costo de
    // la variante. Sin moneda explícita se asume la del costo anterior o la
    // del precio.
    let purchase: { unitCost: Prisma.Decimal; costCurrencyId: number } | null = null;
    if (type === "entry" && parsed.data.unitCost != null) {
      const costCurrencyId = parsed.data.costCurrencyId ?? variant.costCurrencyId ?? variant.priceCurrencyId;
      const currency = await db.currency.findUnique({ where: { currencyId: costCurrencyId }, select: { decimalPlaces: true } });
      if (!currency) return { success: false, error: "La moneda del costo no existe" };
      purchase = {
        unitCost: new Prisma.Decimal(roundToCurrency(parsed.data.unitCost, currency.decimalPlaces)),
        costCurrencyId,
      };
    }

    const stockAfter = await db.$transaction(async (tx) => {
      const fresh = await tx.productVariant.findUniqueOrThrow({
        where: { variantId },
        select: { stock: true },
      });
      const currentStock = decimalToNumber(fresh.stock);
      const planned = planStockMovement(currentStock, type, quantity);
      if (!planned.ok) throw new StockRuleError(planned.error);
      const qty = planned.plan.movementQuantity;

      let after: number;
      switch (type) {
        case "entry": {
          const updated = await tx.productVariant.update({
            where: { variantId },
            data: {
              stock: { increment: qty },
              ...(purchase ? { cost: purchase.unitCost, costCurrencyId: purchase.costCurrencyId } : {}),
            },
            select: { stock: true },
          });
          after = decimalToNumber(updated.stock);
          break;
        }
        case "exit": {
          const result = await tx.productVariant.updateMany({
            where: { variantId, stock: { gte: qty } },
            data: { stock: { decrement: qty } },
          });
          if (result.count !== 1) throw new StockRuleError("Stock insuficiente");
          const row = await tx.productVariant.findUniqueOrThrow({
            where: { variantId },
            select: { stock: true },
          });
          after = decimalToNumber(row.stock);
          break;
        }
        case "adjustment": {
          const result = await tx.productVariant.updateMany({
            where: { variantId, stock: fresh.stock },
            data: { stock: planned.plan.stockAfter },
          });
          if (result.count !== 1) throw new StaleVersionError();
          after = planned.plan.stockAfter;
          break;
        }
      }

      await tx.stockMovement.create({
        data: {
          variantId,
          type,
          quantity: planned.plan.movementQuantity,
          stockAfter: after,
          referenceType: "manual",
          unitCost: purchase?.unitCost ?? null,
          costCurrencyId: purchase?.costCurrencyId ?? null,
          notes,
          createdById: userId,
        },
      });
      await createAuditLog(tx, {
        action: `stock_${type}`,
        entityType: "ProductVariant",
        entityId: variantId,
        module: "products",
        userId,
        oldValues: { stock: currentStock },
        newValues: {
          type,
          quantity: qty,
          stockAfter: after,
          notes,
          unitCost: purchase ? purchase.unitCost.toNumber() : null,
          costCurrencyId: purchase?.costCurrencyId ?? null,
        },
      });
      return after;
    });

    revalidateStockPaths(variant.productId, variant.product.slug);
    return { success: true, data: { stockAfter } };
  } catch (error) {
    if (isStockRuleError(error)) return { success: false, error: error.message };
    if (error instanceof StaleVersionError) return { success: false, error: error.message };
    return failAction("adjustStock", error, "No se pudo ajustar el stock");
  }
}
