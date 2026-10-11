"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { assertRole } from "@/lib/auth-guard";
import { createAuditLog } from "@/lib/audit";
import { failAction, firstIssueMessage, StaleVersionError } from "@/lib/action-utils";
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
      select: { stock: true, productId: true, product: { select: { slug: true } } },
    });
    if (!variant) return { success: false, error: "Variante no encontrada" };

    const stockAfter = await db.$transaction(async (tx) => {
      const fresh = await tx.productVariant.findUniqueOrThrow({
        where: { variantId },
        select: { stock: true },
      });
      const planned = planStockMovement(fresh.stock, type, quantity);
      if (!planned.ok) throw new StockRuleError(planned.error);

      let after: number;
      switch (type) {
        case "entry": {
          const updated = await tx.productVariant.update({
            where: { variantId },
            data: { stock: { increment: quantity } },
            select: { stock: true },
          });
          after = updated.stock;
          break;
        }
        case "exit": {
          const result = await tx.productVariant.updateMany({
            where: { variantId, stock: { gte: quantity } },
            data: { stock: { decrement: quantity } },
          });
          if (result.count !== 1) throw new StockRuleError("Stock insuficiente");
          const row = await tx.productVariant.findUniqueOrThrow({
            where: { variantId },
            select: { stock: true },
          });
          after = row.stock;
          break;
        }
        case "adjustment": {
          const result = await tx.productVariant.updateMany({
            where: { variantId, stock: fresh.stock },
            data: { stock: quantity },
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
        oldValues: { stock: fresh.stock },
        newValues: { type, quantity, stockAfter: after, notes },
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
