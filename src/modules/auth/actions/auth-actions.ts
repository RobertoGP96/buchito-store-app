"use server";

import { redirect } from "next/navigation";
import { AuthError } from "next-auth";
import bcrypt from "bcryptjs";
import { db } from "@/lib/db";
import { auth, signIn, signOut } from "@/lib/auth";
import { createAuditLog } from "@/lib/audit";
import { homeForRole } from "@/lib/roles";
import { normalizePhone } from "@/lib/phone";
import type { ActionResult } from "@/types";
import {
  loginSchema,
  registerSchema,
  safeCallbackUrl,
  type LoginInput,
  type RegisterInput,
} from "../lib/schemas";

/** Con credenciales válidas no devuelve: redirige desde el servidor. La
 *  respuesta de la action ya trae el destino renderizado con la cookie nueva
 *  (layout incluido), así el cliente no necesita `push` + `refresh`, que
 *  pintaban dos veces y competían con el middleware de `/login`. */
export async function loginUser(input: LoginInput): Promise<ActionResult<never>> {
  const parsed = loginSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: "Revisa el correo y la contraseña" };
  }
  const { email, password, callbackUrl } = parsed.data;

  try {
    await signIn("credentials", { email, password, redirect: false });
  } catch (error) {
    if (error instanceof AuthError) {
      return { success: false, error: "Correo o contraseña incorrectos" };
    }
    console.error("loginUser:", error);
    return { success: false, error: "No se pudo iniciar sesión. Inténtalo de nuevo." };
  }

  // La cookie recién puesta no se refleja en auth() dentro de esta misma
  // petición: el rol se lee de la DB para decidir el destino.
  const user = await db.user.findUnique({ where: { email }, select: { role: true } });
  redirect(safeCallbackUrl(callbackUrl, homeForRole(user?.role)));
}

/** Igual que `loginUser`: con éxito redirige desde el servidor. */
export async function registerCustomer(input: RegisterInput): Promise<ActionResult<never>> {
  const parsed = registerSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message ?? "Revisa los datos del formulario",
    };
  }
  const { fullName, email, phone, password } = parsed.data;

  try {
    const existing = await db.user.findUnique({ where: { email }, select: { userId: true } });
    if (existing) {
      return { success: false, error: "Ya existe una cuenta con ese correo" };
    }

    const passwordHash = await bcrypt.hash(password, 12);
    const normalizedPhone = normalizePhone(phone);

    await db.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: { email, passwordHash, fullName, role: "customer" },
      });
      // Si ya compró como invitado con este teléfono, se le enlaza ese cliente.
      const guest = await tx.customer.findFirst({
        where: { normalizedPhone, userId: null },
        orderBy: { createdAt: "desc" },
      });
      const customer = guest
        ? await tx.customer.update({
            where: { customerId: guest.customerId },
            data: { userId: user.userId, name: fullName, email },
          })
        : await tx.customer.create({
            data: { userId: user.userId, name: fullName, phone, normalizedPhone, email },
          });
      await createAuditLog(tx, {
        action: "create",
        entityType: "Customer",
        entityId: customer.customerId,
        module: "auth",
        userId: user.userId,
        newValues: { fullName, email, phone },
      });
    });
  } catch (error) {
    console.error("registerCustomer:", error);
    return { success: false, error: "No se pudo crear la cuenta. Inténtalo de nuevo." };
  }

  let signedIn = true;
  try {
    await signIn("credentials", { email, password, redirect: false });
  } catch (error) {
    console.error("registerCustomer signIn:", error);
    signedIn = false;
  }
  // `redirect` lanza: fuera del try para que el catch no la trague.
  redirect(signedIn ? "/" : "/login");
}

export async function logoutUser(): Promise<void> {
  await signOut({ redirectTo: "/" });
}

export async function getSessionUser() {
  const session = await auth();
  return session?.user ?? null;
}
