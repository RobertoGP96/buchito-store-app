"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { assertRole } from "@/lib/auth-guard";
import { createAuditLog } from "@/lib/audit";
import { failAction, firstIssueMessage, IN_USE_MESSAGE, isForeignKeyViolation, isValidId } from "@/lib/action-utils";
import type { ActionResult } from "@/types";
import { couponSchema, type CouponInput } from "../lib/schemas";

function revalidateCouponPaths() {
  revalidatePath("/admin/cupones");
  revalidatePath("/checkout");
}

export async function createCoupon(input: CouponInput): Promise<ActionResult<{ couponId: number }>> {
  const parsed = couponSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: firstIssueMessage(parsed.error, "Revisa los datos") };
  }
  const data = parsed.data;

  try {
    const userId = await assertRole("admin");
    const duplicate = await db.coupon.findUnique({ where: { code: data.code }, select: { couponId: true } });
    if (duplicate) return { success: false, error: `Ya existe el cupón "${data.code}"` };

    const row = await db.$transaction(async (tx) => {
      const created = await tx.coupon.create({ data });
      await createAuditLog(tx, {
        action: "create",
        entityType: "Coupon",
        entityId: created.couponId,
        module: "coupons",
        userId,
        newValues: data,
      });
      return created;
    });

    revalidateCouponPaths();
    return { success: true, data: { couponId: row.couponId } };
  } catch (error) {
    return failAction("createCoupon", error, "No se pudo crear el cupón");
  }
}

export async function updateCoupon(couponId: number, input: CouponInput): Promise<ActionResult<void>> {
  const parsed = couponSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: firstIssueMessage(parsed.error, "Revisa los datos") };
  }
  const data = parsed.data;

  try {
    const userId = await assertRole("admin");
    const current = await db.coupon.findUnique({ where: { couponId } });
    if (!current) return { success: false, error: "Cupón no encontrado" };
    if (data.code !== current.code) {
      const duplicate = await db.coupon.findUnique({ where: { code: data.code }, select: { couponId: true } });
      if (duplicate) return { success: false, error: `Ya existe el cupón "${data.code}"` };
    }
    // El CHECK de la DB exige used_count <= max_uses; mejor avisar antes.
    if (data.maxUses != null && data.maxUses < current.usedCount) {
      return {
        success: false,
        error: `El límite no puede ser menor que los usos ya registrados (${current.usedCount})`,
      };
    }

    await db.$transaction(async (tx) => {
      await tx.coupon.update({ where: { couponId }, data });
      await createAuditLog(tx, {
        action: "update",
        entityType: "Coupon",
        entityId: couponId,
        module: "coupons",
        userId,
        oldValues: current,
        newValues: data,
      });
    });

    revalidateCouponPaths();
    return { success: true, data: undefined };
  } catch (error) {
    return failAction("updateCoupon", error, "No se pudo actualizar el cupón");
  }
}

/** Borra un cupón que ningún pedido ha usado; uno ya aplicado se desactiva. */
export async function deleteCoupon(couponId: number): Promise<ActionResult<void>> {
  if (!isValidId(couponId)) return { success: false, error: "Cupón no válido" };

  try {
    const userId = await assertRole("admin");
    const current = await db.coupon.findUnique({
      where: { couponId },
      include: { _count: { select: { orders: true } } },
    });
    if (!current) return { success: false, error: "Cupón no encontrado" };
    if (current._count.orders > 0 || current.usedCount > 0) {
      return { success: false, error: "Ya se ha usado en pedidos. Desactívalo en su lugar." };
    }

    await db.$transaction(async (tx) => {
      await tx.coupon.delete({ where: { couponId } });
      await createAuditLog(tx, {
        action: "delete",
        entityType: "Coupon",
        entityId: couponId,
        module: "coupons",
        userId,
        oldValues: {
          code: current.code,
          kind: current.kind,
          value: current.value.toString(),
          maxUses: current.maxUses,
          isActive: current.isActive,
        },
      });
    });

    revalidateCouponPaths();
    return { success: true, data: undefined };
  } catch (error) {
    if (isForeignKeyViolation(error)) return { success: false, error: IN_USE_MESSAGE };
    return failAction("deleteCoupon", error, "No se pudo eliminar el cupón");
  }
}
