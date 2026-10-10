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
