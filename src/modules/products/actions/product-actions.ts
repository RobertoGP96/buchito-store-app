"use server";

import { assertRole } from "@/lib/auth-guard";
import { failAction, firstIssueMessage } from "@/lib/action-utils";
import type { ActionResult } from "@/types";
import { productSchema, type ProductInput } from "../lib/schemas";

const PENDING = "Pendiente de implementar: el alta de productos con variantes llega en la siguiente fase";

// Firmas estables para la UI; la implementación (validación de atributos
// contra el tipo, variantes, imágenes, audit) va en la fase C completa.

export async function createProduct(
  input: ProductInput
): Promise<ActionResult<{ productId: number }>> {
  const parsed = productSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: firstIssueMessage(parsed.error, "Revisa los datos") };
  }
  try {
    await assertRole("admin");
    return { success: false, error: PENDING };
  } catch (error) {
    return failAction("createProduct", error, "No se pudo crear el producto");
  }
}

export async function updateProduct(
  productId: number,
  version: number,
  input: ProductInput
): Promise<ActionResult<void>> {
  const parsed = productSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: firstIssueMessage(parsed.error, "Revisa los datos") };
  }
  try {
    await assertRole("admin");
    void productId;
    void version;
    return { success: false, error: PENDING };
  } catch (error) {
    return failAction("updateProduct", error, "No se pudo actualizar el producto");
  }
}

export async function setProductStatus(
  productId: number,
  status: "draft" | "active" | "archived"
): Promise<ActionResult<void>> {
  try {
    await assertRole("admin");
    void productId;
    void status;
    return { success: false, error: PENDING };
  } catch (error) {
    return failAction("setProductStatus", error, "No se pudo cambiar el estado del producto");
  }
}
