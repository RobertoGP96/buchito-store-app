"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { assertRole } from "@/lib/auth-guard";
import { createAuditLog } from "@/lib/audit";
import { failAction, firstIssueMessage, IN_USE_MESSAGE, isForeignKeyViolation, isValidId, StaleVersionError } from "@/lib/action-utils";
import type { ActionResult } from "@/types";
import { paymentMethodSchema, type PaymentMethodInput } from "../lib/schemas";

function revalidatePaymentPaths() {
  revalidatePath("/admin/metodos-pago");
  revalidatePath("/checkout");
}

export async function createPaymentMethod(
  input: PaymentMethodInput
): Promise<ActionResult<{ paymentMethodId: number }>> {
  const parsed = paymentMethodSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: firstIssueMessage(parsed.error, "Revisa los datos") };
  }
  const data = parsed.data;

  try {
    const userId = await assertRole("admin");
    const [duplicate, currency] = await Promise.all([
      db.paymentMethod.findUnique({ where: { code: data.code } }),
      db.currency.findUnique({ where: { currencyId: data.currencyId } }),
    ]);
    if (duplicate) return { success: false, error: `Ya existe un método con el código ${data.code}` };
    if (!currency?.isActive) return { success: false, error: "Elige una moneda activa" };

    const row = await db.$transaction(async (tx) => {
      const created = await tx.paymentMethod.create({ data });
      await createAuditLog(tx, {
        action: "create",
        entityType: "PaymentMethod",
        entityId: created.paymentMethodId,
        module: "payments",
        userId,
        newValues: data,
      });
      return created;
    });

    revalidatePaymentPaths();
    return { success: true, data: { paymentMethodId: row.paymentMethodId } };
  } catch (error) {
    return failAction("createPaymentMethod", error, "No se pudo crear el método de pago");
  }
}

export async function updatePaymentMethod(
  paymentMethodId: number,
  version: number,
  input: PaymentMethodInput
): Promise<ActionResult<void>> {
  const parsed = paymentMethodSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: firstIssueMessage(parsed.error, "Revisa los datos") };
  }
  const data = parsed.data;

  try {
    const userId = await assertRole("admin");
    const current = await db.paymentMethod.findUnique({ where: { paymentMethodId } });
    if (!current) return { success: false, error: "Método de pago no encontrado" };

    if (data.code !== current.code) {
      const duplicate = await db.paymentMethod.findUnique({ where: { code: data.code } });
      if (duplicate) return { success: false, error: `Ya existe un método con el código ${data.code}` };
    }
    if (data.isActive) {
      const currency = await db.currency.findUnique({ where: { currencyId: data.currencyId } });
      if (!currency?.isActive) return { success: false, error: "Elige una moneda activa" };
    }

    await db.$transaction(async (tx) => {
      const updated = await tx.paymentMethod.updateMany({
        where: { paymentMethodId, version },
        data: { ...data, version: { increment: 1 } },
      });
      if (updated.count !== 1) throw new StaleVersionError();
      await createAuditLog(tx, {
        action: "update",
        entityType: "PaymentMethod",
        entityId: paymentMethodId,
        module: "payments",
        userId,
        oldValues: current,
        newValues: data,
      });
    });

    revalidatePaymentPaths();
    return { success: true, data: undefined };
  } catch (error) {
    if (error instanceof StaleVersionError) return { success: false, error: error.message };
    return failAction("updatePaymentMethod", error, "No se pudo actualizar el método de pago");
  }
}

/** Borra un método de pago que ningún pedido ni cobro referencia; los que
 *  ya se usaron se desactivan (el pedido guarda el nombre, pero el cobro
 *  apunta a la fila). */
export async function deletePaymentMethod(paymentMethodId: number): Promise<ActionResult<void>> {
  if (!isValidId(paymentMethodId)) return { success: false, error: "Método de pago no válido" };

  try {
    const userId = await assertRole("admin");
    const current = await db.paymentMethod.findUnique({
      where: { paymentMethodId },
      include: { _count: { select: { orders: true, payments: true } } },
    });
    if (!current) return { success: false, error: "Método de pago no encontrado" };
    if (current._count.orders > 0 || current._count.payments > 0) {
      return { success: false, error: "Hay pedidos o cobros con este método. Desactívalo en su lugar." };
    }

    await db.$transaction(async (tx) => {
      await tx.paymentMethod.delete({ where: { paymentMethodId } });
      await createAuditLog(tx, {
        action: "delete",
        entityType: "PaymentMethod",
        entityId: paymentMethodId,
        module: "payments",
        userId,
        oldValues: {
          code: current.code,
          name: current.name,
          kind: current.kind,
          currencyId: current.currencyId,
          surchargePercent: current.surchargePercent?.toString() ?? null,
          isActive: current.isActive,
        },
      });
    });

    revalidatePaymentPaths();
    return { success: true, data: undefined };
  } catch (error) {
    if (isForeignKeyViolation(error)) return { success: false, error: IN_USE_MESSAGE };
    return failAction("deletePaymentMethod", error, "No se pudo eliminar el método de pago");
  }
}
