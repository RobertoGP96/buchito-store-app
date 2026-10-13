"use server";

import { revalidatePath } from "next/cache";
import bcrypt from "bcryptjs";
import { db } from "@/lib/db";
import { assertRole } from "@/lib/auth-guard";
import { createAuditLog, getCurrentUserId } from "@/lib/audit";
import { failAction, firstIssueMessage, IN_USE_MESSAGE, isForeignKeyViolation, isValidId } from "@/lib/action-utils";
import type { ActionResult } from "@/types";
import { COURIER_MANAGED_MESSAGE } from "../lib/labels";
import { MIN_PASSWORD_LENGTH, userSchema, type UserInput } from "../lib/schemas";

const PASSWORD_MESSAGE = `La contraseña debe tener al menos ${MIN_PASSWORD_LENGTH} caracteres`;

function revalidateUserPaths() {
  revalidatePath("/admin/usuarios");
  revalidatePath("/admin/mensajeros");
}

export async function createUser(input: UserInput): Promise<ActionResult<{ userId: number }>> {
  const parsed = userSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: firstIssueMessage(parsed.error, "Revisa los datos") };
  }
  const data = parsed.data;
  if (data.role === "courier") return { success: false, error: COURIER_MANAGED_MESSAGE };
  if (!data.password || data.password.length < MIN_PASSWORD_LENGTH) {
    return { success: false, error: PASSWORD_MESSAGE };
  }

  try {
    const actorId = await assertRole("admin");
    const existing = await db.user.findUnique({ where: { email: data.email }, select: { userId: true } });
    if (existing) return { success: false, error: "Ya existe un usuario con ese correo" };

    const passwordHash = await bcrypt.hash(data.password, 12);
    const row = await db.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: { email: data.email, passwordHash, fullName: data.fullName, role: data.role, isActive: data.isActive },
      });
      await createAuditLog(tx, {
        action: "create",
        entityType: "User",
        entityId: user.userId,
        module: "users",
        userId: actorId,
        newValues: { fullName: data.fullName, email: data.email, role: data.role, isActive: data.isActive },
      });
      return user;
    });

    revalidateUserPaths();
    return { success: true, data: { userId: row.userId } };
  } catch (error) {
    return failAction("createUser", error, "No se pudo crear el usuario");
  }
}

export async function updateUser(userId: number, input: UserInput): Promise<ActionResult<void>> {
  const parsed = userSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: firstIssueMessage(parsed.error, "Revisa los datos") };
  }
  const data = parsed.data;
  if (data.password && data.password.length < MIN_PASSWORD_LENGTH) {
    return { success: false, error: PASSWORD_MESSAGE };
  }

  try {
    const actorId = await assertRole("admin");
    const sessionUserId = await getCurrentUserId();
    const current = await db.user.findUnique({
      where: { userId },
      select: {
        userId: true,
        fullName: true,
        email: true,
        role: true,
        isActive: true,
        courier: { select: { courierId: true } },
      },
    });
    if (!current) return { success: false, error: "Usuario no encontrado" };

    const isCourier = current.role === "courier" || current.courier !== null;
    if (isCourier && data.role !== "courier") return { success: false, error: COURIER_MANAGED_MESSAGE };
    if (!isCourier && data.role === "courier") return { success: false, error: COURIER_MANAGED_MESSAGE };

    const isSelf = sessionUserId === userId;
    if (isSelf && (!data.isActive || data.role !== "admin")) {
      return { success: false, error: "No puedes desactivarte ni quitarte el rol de administrador" };
    }

    const losesAdmin = current.role === "admin" && current.isActive && (data.role !== "admin" || !data.isActive);
    if (losesAdmin) {
      const otherAdmins = await db.user.count({
        where: { role: "admin", isActive: true, userId: { not: userId } },
      });
      if (otherAdmins === 0) {
        return { success: false, error: "La tienda debe conservar al menos un administrador activo" };
      }
    }

    if (data.email !== current.email) {
      const duplicate = await db.user.findUnique({ where: { email: data.email }, select: { userId: true } });
      if (duplicate) return { success: false, error: "Ya existe un usuario con ese correo" };
    }

    if (current.courier && !data.isActive) {
      const open = await db.delivery.count({
        where: { courierId: current.courier.courierId, status: { in: ["assigned", "in_transit"] } },
      });
      if (open > 0) {
        return { success: false, error: "Tiene entregas en curso. Reasígnalas antes de desactivarlo." };
      }
    }

    const passwordHash = data.password ? await bcrypt.hash(data.password, 12) : undefined;

    await db.$transaction(async (tx) => {
      await tx.user.update({
        where: { userId },
        data: {
          fullName: data.fullName,
          email: data.email,
          role: data.role,
          isActive: data.isActive,
          ...(passwordHash ? { passwordHash } : {}),
        },
      });
      // El perfil de mensajero sigue al usuario: inactivo aquí = inactivo allí.
      if (current.courier) {
        await tx.courier.update({
          where: { courierId: current.courier.courierId },
          data: { active: data.isActive, version: { increment: 1 } },
        });
      }
      // Un código 2FA enviado al buzón antiguo no debe seguir valiendo.
      if (data.email !== current.email) {
        await tx.userTwoFactor.updateMany({
          where: { userId },
          data: { emailCodeHash: null, emailCodeExpiresAt: null },
        });
      }
      await createAuditLog(tx, {
        action: "update",
        entityType: "User",
        entityId: userId,
        module: "users",
        userId: actorId,
        oldValues: { fullName: current.fullName, email: current.email, role: current.role, isActive: current.isActive },
        newValues: {
          fullName: data.fullName,
          email: data.email,
          role: data.role,
          isActive: data.isActive,
          passwordChanged: Boolean(passwordHash),
        },
      });
    });

    revalidateUserPaths();
    return { success: true, data: undefined };
  } catch (error) {
    return failAction("updateUser", error, "No se pudo actualizar el usuario");
  }
}

/** Borra una cuenta de acceso. No la propia, no la del último administrador
 *  activo y no la de un mensajero (esa se borra desde Mensajeros, con su
 *  perfil). La ficha de cliente, si la hay, se conserva como invitado y el
 *  historial (auditoría, cobros recibidos) queda sin autor. */
export async function deleteUser(userId: number): Promise<ActionResult<void>> {
  if (!isValidId(userId)) return { success: false, error: "Usuario no válido" };

  try {
    const actorId = await assertRole("admin");
    if (actorId === userId) return { success: false, error: "No puedes eliminar tu propia cuenta" };

    const current = await db.user.findUnique({
      where: { userId },
      select: {
        fullName: true,
        email: true,
        role: true,
        isActive: true,
        courier: { select: { courierId: true } },
        customer: { select: { customerId: true } },
      },
    });
    if (!current) return { success: false, error: "Usuario no encontrado" };
    if (current.role === "courier" || current.courier) {
      return { success: false, error: "Los mensajeros se eliminan desde Mensajeros." };
    }
    if (current.role === "admin" && current.isActive) {
      const otherAdmins = await db.user.count({
        where: { role: "admin", isActive: true, userId: { not: userId } },
      });
      if (otherAdmins === 0) {
        return { success: false, error: "La tienda debe conservar al menos un administrador activo" };
      }
    }

    await db.$transaction(async (tx) => {
      await tx.user.delete({ where: { userId } });
      await createAuditLog(tx, {
        action: "delete",
        entityType: "User",
        entityId: userId,
        module: "users",
        userId: actorId,
        oldValues: {
          fullName: current.fullName,
          email: current.email,
          role: current.role,
          isActive: current.isActive,
          customerId: current.customer?.customerId ?? null,
        },
      });
    });

    revalidateUserPaths();
    revalidatePath("/admin/clientes");
    return { success: true, data: undefined };
  } catch (error) {
    if (isForeignKeyViolation(error)) return { success: false, error: IN_USE_MESSAGE };
    return failAction("deleteUser", error, "No se pudo eliminar el usuario");
  }
}

/** Quita el segundo factor de una cuenta (teléfono perdido y sin códigos de
 *  respaldo). El usuario vuelve a entrar solo con su contraseña y puede
 *  activarlo de nuevo desde su perfil. Queda auditado. */
export async function resetUserTwoFactor(userId: number): Promise<ActionResult<void>> {
  if (!isValidId(userId)) return { success: false, error: "Usuario no válido" };

  try {
    const actorId = await assertRole("admin");
    const current = await db.userTwoFactor.findUnique({
      where: { userId },
      select: { method: true, enabledAt: true },
    });
    if (!current?.enabledAt) {
      return { success: false, error: "Este usuario no tiene activada la verificación en dos pasos" };
    }

    await db.$transaction(async (tx) => {
      await tx.userTwoFactor.delete({ where: { userId } });
      await createAuditLog(tx, {
        action: "two_factor.reset",
        entityType: "User",
        entityId: userId,
        module: "users",
        userId: actorId,
        oldValues: { method: current.method, enabledAt: current.enabledAt },
      });
    });

    revalidateUserPaths();
    revalidatePath("/perfil");
    return { success: true, data: undefined };
  } catch (error) {
    return failAction("resetUserTwoFactor", error, "No se pudo quitar la verificación en dos pasos");
  }
}
