import { Prisma } from "@/generated/prisma";
import { isAuthError } from "@/lib/audit";
import { isForbiddenError } from "@/lib/auth-guard";
import type { ActionResult } from "@/types";

/** Traduce los errores conocidos a un mensaje para el usuario y loguea el
 *  real. Toda action termina su `catch` aquí. */
export function failAction(context: string, error: unknown, fallback: string): ActionResult<never> {
  if (isAuthError(error)) {
    return { success: false, error: "Debes iniciar sesión para continuar" };
  }
  if (isForbiddenError(error)) {
    return { success: false, error: error.message };
  }
  console.error(`${context}:`, error);
  return { success: false, error: fallback };
}

/** Optimistic locking: tres intentos cortos ante `version` desfasada. */
export class StaleVersionError extends Error {
  constructor() {
    super("El registro cambió mientras lo editabas. Recarga e inténtalo de nuevo.");
    this.name = "StaleVersionError";
  }
}

export function isStaleVersionError(error: unknown): error is StaleVersionError {
  return error instanceof StaleVersionError;
}

export function firstIssueMessage(error: { issues: { message: string }[] }, fallback: string): string {
  return error.issues[0]?.message ?? fallback;
}

/** Violación de clave foránea (Prisma P2003): algo sigue referenciando la
 *  fila. Las actions de borrado comprueban antes las referencias conocidas;
 *  esto es la red de seguridad por si aparece una nueva relación. */
export function isForeignKeyViolation(error: unknown): boolean {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2003";
}

export function isValidId(id: unknown): id is number {
  return typeof id === "number" && Number.isInteger(id) && id > 0;
}

export const IN_USE_MESSAGE = "No se puede eliminar: otros registros lo utilizan. Desactívalo en su lugar.";

/** Violación de unicidad (Prisma P2002): la action traduce el índice que
 *  conoce (teléfono de cliente con cuenta, etc.) a un mensaje concreto. */
export function isUniqueViolation(error: unknown): boolean {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002";
}
