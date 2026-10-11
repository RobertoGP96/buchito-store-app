"use server";

import { assertRole } from "@/lib/auth-guard";
import { failAction, firstIssueMessage } from "@/lib/action-utils";
import type { ActionResult } from "@/types";
import { variantSchema, type VariantInput } from "../lib/schemas";

const PENDING = "Pendiente de implementar: las variantes se gestionan en la siguiente fase";

export async function createVariant(
  input: VariantInput
): Promise<ActionResult<{ variantId: number }>> {
  const parsed = variantSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: firstIssueMessage(parsed.error, "Revisa los datos") };
  }
  try {
    await assertRole("admin");
    return { success: false, error: PENDING };
  } catch (error) {
    return failAction("createVariant", error, "No se pudo crear la variante");
  }
}

export async function updateVariant(
  variantId: number,
  version: number,
  input: VariantInput
): Promise<ActionResult<void>> {
  const parsed = variantSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: firstIssueMessage(parsed.error, "Revisa los datos") };
  }
  try {
    await assertRole("admin");
    void variantId;
    void version;
    return { success: false, error: PENDING };
  } catch (error) {
    return failAction("updateVariant", error, "No se pudo actualizar la variante");
  }
}
