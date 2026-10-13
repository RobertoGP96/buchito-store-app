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

export const NO_CUSTOMER_MESSAGE =
  "Esta cuenta no tiene ficha de cliente. Los pedidos se hacen con una cuenta de cliente: entra con la tuya o crea una nueva.";

export interface SessionCustomer {
  userId: number;
  customerId: number;
  name: string;
  phone: string;
  email: string | null;
}

const CUSTOMER_SELECT = { customerId: true, name: true, phone: true, email: true } as const;

/** Ficha de cliente del usuario de la sesión, para páginas: null sin sesión
 *  o si la cuenta no tiene ficha (admin, mensajero, usuarios creados desde
 *  el panel). El correo cae al de la cuenta si la ficha no lo tiene. */
export async function getSessionCustomer(): Promise<SessionCustomer | null> {
  const session = await auth();
  if (!session?.user) return null;
  const customer = await db.customer.findUnique({
    where: { userId: session.user.userId },
    select: CUSTOMER_SELECT,
  });
  if (!customer) return null;
  return {
    userId: session.user.userId,
    customerId: customer.customerId,
    name: customer.name,
    phone: customer.phone,
    email: customer.email ?? session.user.email ?? null,
  };
}

/** Para server actions del cliente (pedidos, destinatarios, perfil): exige
 *  sesión con rol customer (admin pasa) y ficha de cliente; sin ficha lanza
 *  `ForbiddenError` con el aviso, que `failAction` devuelve tal cual. */
export async function assertSessionCustomer(): Promise<SessionCustomer> {
  const userId = await assertRole("customer");
  const customer = await db.customer.findUnique({ where: { userId }, select: CUSTOMER_SELECT });
  if (!customer) throw new ForbiddenError(NO_CUSTOMER_MESSAGE);
  return {
    userId,
    customerId: customer.customerId,
    name: customer.name,
    phone: customer.phone,
    email: customer.email,
  };
}
