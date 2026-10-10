import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { homeForRole, type Role } from "@/lib/roles";

export class ForbiddenError extends Error {
  constructor(message = "No tienes permisos para realizar esta acción") {
    super(message);
    this.name = "ForbiddenError";
  }
}

/** Para layouts: sin sesión redirige al login conservando la ruta pedida. */
export async function requireAuth(callbackUrl?: string) {
  const session = await auth();
  if (!session?.user) {
    const target = callbackUrl
      ? `/login?callbackUrl=${encodeURIComponent(callbackUrl)}`
      : "/login";
    redirect(target);
  }
  return session;
}

/** Para layouts: un rol ajeno va a su propio inicio, no a una pantalla de error. */
export async function requireRole(...roles: Role[]) {
  const session = await requireAuth();
  const role = session.user.role as Role;
  if (role === "admin" || roles.includes(role)) return session;
  redirect(homeForRole(role));
}

/** Para server actions: lanza `ForbiddenError` para que la action la capture
 *  en su `catch` y devuelva un `ActionResult` con mensaje en español. Admin
 *  siempre pasa. */
export async function assertRole(...roles: Role[]): Promise<number> {
  const session = await auth();
  if (!session?.user) throw new Error("No autenticado");
  const role = session.user.role as Role;
  if (role !== "admin" && !roles.includes(role)) throw new ForbiddenError();
  return session.user.userId;
}

export function isForbiddenError(error: unknown): error is ForbiddenError {
  return error instanceof ForbiddenError;
}

/** Mensajero de la sesión actual; null si el usuario no tiene perfil activo. */
export async function getSessionCourierId(): Promise<number | null> {
  const session = await auth();
  if (!session?.user) return null;
  const courier = await db.courier.findUnique({
    where: { userId: session.user.userId },
    select: { courierId: true, active: true },
  });
  return courier?.active ? courier.courierId : null;
}
