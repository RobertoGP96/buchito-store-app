"use server";

import { revalidatePath } from "next/cache";
import bcrypt from "bcryptjs";
import { db } from "@/lib/db";
import { assertRole } from "@/lib/auth-guard";
import { createAuditLog } from "@/lib/audit";
import { failAction, firstIssueMessage, IN_USE_MESSAGE, isForeignKeyViolation, isValidId, StaleVersionError } from "@/lib/action-utils";
import type { ActionResult } from "@/types";
import { courierSchema, type CourierInput } from "../lib/schemas";

function revalidateCourierPaths() {
  revalidatePath("/admin/mensajeros");
  revalidatePath("/admin/entregas");
}

/** Alta de mensajero = User con rol courier + perfil Courier, en una tx. */
export async function createCourier(input: CourierInput): Promise<ActionResult<{ courierId: number }>> {
  const parsed = courierSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: firstIssueMessage(parsed.error, "Revisa los datos") };
  }
  const data = parsed.data;
  if (!data.password || data.password.length < 8) {
    return { success: false, error: "La contraseña debe tener al menos 8 caracteres" };
  }

  try {
    const userId = await assertRole("admin");
    const existing = await db.user.findUnique({ where: { email: data.email }, select: { userId: true } });
    if (existing) return { success: false, error: "Ya existe un usuario con ese correo" };

    const passwordHash = await bcrypt.hash(data.password, 12);
    const row = await db.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: { email: data.email, passwordHash, fullName: data.fullName, role: "courier", isActive: data.active },
      });
      const courier = await tx.courier.create({
        data: { userId: user.userId, phone: data.phone, vehicle: data.vehicle, notes: data.notes, active: data.active },
      });
      await createAuditLog(tx, {
        action: "create",
        entityType: "Courier",
        entityId: courier.courierId,
        module: "deliveries",
        userId,
        newValues: { fullName: data.fullName, email: data.email, phone: data.phone, vehicle: data.vehicle },
      });
      return courier;
    });

    revalidateCourierPaths();
    return { success: true, data: { courierId: row.courierId } };
  } catch (error) {
    return failAction("createCourier", error, "No se pudo crear el mensajero");
  }
}

export async function updateCourier(
  courierId: number,
  version: number,
  input: CourierInput
): Promise<ActionResult<void>> {
  const parsed = courierSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: firstIssueMessage(parsed.error, "Revisa los datos") };
  }
  const data = parsed.data;
  if (data.password && data.password.length < 8) {
    return { success: false, error: "La contraseña debe tener al menos 8 caracteres" };
  }

  try {
    const userId = await assertRole("admin");
    const current = await db.courier.findUnique({ where: { courierId }, include: { user: true } });
    if (!current) return { success: false, error: "Mensajero no encontrado" };

    if (data.email !== current.user.email) {
      const duplicate = await db.user.findUnique({ where: { email: data.email }, select: { userId: true } });
      if (duplicate) return { success: false, error: "Ya existe un usuario con ese correo" };
    }
    if (!data.active) {
      const open = await db.delivery.count({
        where: { courierId, status: { in: ["assigned", "in_transit"] } },
      });
      if (open > 0) {
        return { success: false, error: "Tiene entregas en curso. Reasígnalas antes de desactivarlo." };
      }
    }

    const passwordHash = data.password ? await bcrypt.hash(data.password, 12) : undefined;

    await db.$transaction(async (tx) => {
      const updated = await tx.courier.updateMany({
        where: { courierId, version },
        data: { phone: data.phone, vehicle: data.vehicle, notes: data.notes, active: data.active, version: { increment: 1 } },
      });
      if (updated.count !== 1) throw new StaleVersionError();
      await tx.user.update({
        where: { userId: current.userId },
        data: { fullName: data.fullName, email: data.email, isActive: data.active, ...(passwordHash ? { passwordHash } : {}) },
      });
      await createAuditLog(tx, {
        action: "update",
        entityType: "Courier",
        entityId: courierId,
        module: "deliveries",
        userId,
        oldValues: { fullName: current.user.fullName, email: current.user.email, phone: current.phone, vehicle: current.vehicle, active: current.active },
        newValues: { fullName: data.fullName, email: data.email, phone: data.phone, vehicle: data.vehicle, active: data.active, passwordChanged: Boolean(passwordHash) },
      });
    });

    revalidateCourierPaths();
    return { success: true, data: undefined };
  } catch (error) {
    if (error instanceof StaleVersionError) return { success: false, error: error.message };
    return failAction("updateCourier", error, "No se pudo actualizar el mensajero");
  }
}

/** Borra el mensajero y su cuenta de acceso. Solo si nunca tuvo entregas:
 *  las entregas (incluso las ya cerradas) apuntan a su fila y son historial. */
export async function deleteCourier(courierId: number): Promise<ActionResult<void>> {
  if (!isValidId(courierId)) return { success: false, error: "Mensajero no válido" };

  try {
    const userId = await assertRole("admin");
    const current = await db.courier.findUnique({
      where: { courierId },
      include: {
        user: { select: { userId: true, fullName: true, email: true } },
        _count: { select: { deliveries: true } },
      },
    });
    if (!current) return { success: false, error: "Mensajero no encontrado" };
    if (current._count.deliveries > 0) {
      return { success: false, error: "Tiene entregas registradas. Desactívalo en su lugar." };
    }

    await db.$transaction(async (tx) => {
      await tx.courier.delete({ where: { courierId } });
      await tx.user.delete({ where: { userId: current.user.userId } });
      await createAuditLog(tx, {
        action: "delete",
        entityType: "Courier",
        entityId: courierId,
        module: "deliveries",
        userId,
        oldValues: {
          userId: current.user.userId,
          fullName: current.user.fullName,
          email: current.user.email,
          phone: current.phone,
          vehicle: current.vehicle,
          active: current.active,
        },
      });
    });

    revalidateCourierPaths();
    revalidatePath("/admin/usuarios");
    return { success: true, data: undefined };
  } catch (error) {
    if (isForeignKeyViolation(error)) return { success: false, error: IN_USE_MESSAGE };
    return failAction("deleteCourier", error, "No se pudo eliminar el mensajero");
  }
}
