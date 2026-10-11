"use server";

import { assertRole } from "@/lib/auth-guard";
import { failAction, firstIssueMessage } from "@/lib/action-utils";
import type { ActionResult } from "@/types";
import { adminSearchSchema, type AdminSearchInput, type AdminSearchResult } from "../lib/schemas";
import { searchAdmin } from "../queries/search-queries";

/** Solo lectura: alimenta la paleta de búsqueda de la cabecera del panel. */
export async function searchAdminAction(input: AdminSearchInput): Promise<ActionResult<AdminSearchResult>> {
  const parsed = adminSearchSchema.safeParse(input);
  if (!parsed.success) return { success: false, error: firstIssueMessage(parsed.error, "Escribe algo para buscar") };
  try {
    await assertRole("admin");
    const data = await searchAdmin(parsed.data.term);
    return { success: true, data };
  } catch (error) {
    return failAction("searchAdminAction", error, "No se pudo buscar. Inténtalo de nuevo.");
  }
}
