"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { assertRole } from "@/lib/auth-guard";
import { createAuditLog } from "@/lib/audit";
import { failAction, firstIssueMessage } from "@/lib/action-utils";
import type { ActionResult } from "@/types";
import { productTypeSchema, type ProductTypeInput } from "../lib/schemas";

function revalidateTypePaths() {
  revalidatePath("/admin/productos/tipos");
  revalidatePath("/admin/productos");
}

export async function createProductType(
  input: ProductTypeInput
): Promise<ActionResult<{ typeId: number }>> {
  const parsed = productTypeSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: firstIssueMessage(parsed.error, "Revisa los datos") };
  }
  const data = parsed.data;

  try {
    const userId = await assertRole("admin");
    const duplicate = await db.productType.findFirst({
      where: { OR: [{ name: data.name }, { slug: data.slug }] },
      select: { name: true },
    });
    if (duplicate) {
      return { success: false, error: `Ya existe un tipo con ese nombre o slug` };
    }

    const row = await db.$transaction(async (tx) => {
      const created = await tx.productType.create({
        data: { ...data, attributeSchema: data.attributeSchema },
      });
      await createAuditLog(tx, {
        action: "create",
        entityType: "ProductType",
        entityId: created.typeId,
        module: "products",
        userId,
        newValues: data,
      });
      return created;
    });

    revalidateTypePaths();
    return { success: true, data: { typeId: row.typeId } };
  } catch (error) {
    return failAction("createProductType", error, "No se pudo crear el tipo de producto");
  }
}

export async function updateProductType(
  typeId: number,
  input: ProductTypeInput
): Promise<ActionResult<void>> {
  const parsed = productTypeSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: firstIssueMessage(parsed.error, "Revisa los datos") };
  }
  const data = parsed.data;

  try {
    const userId = await assertRole("admin");
    const current = await db.productType.findUnique({ where: { typeId } });
    if (!current) return { success: false, error: "Tipo de producto no encontrado" };

    const duplicate = await db.productType.findFirst({
      where: {
        typeId: { not: typeId },
        OR: [{ name: data.name }, { slug: data.slug }],
      },
      select: { typeId: true },
    });
    if (duplicate) {
      return { success: false, error: "Ya existe otro tipo con ese nombre o slug" };
    }

    await db.$transaction(async (tx) => {
      await tx.productType.update({
        where: { typeId },
        data: { ...data, attributeSchema: data.attributeSchema },
      });
      await createAuditLog(tx, {
        action: "update",
        entityType: "ProductType",
        entityId: typeId,
        module: "products",
        userId,
        oldValues: current,
        newValues: data,
      });
    });

    revalidateTypePaths();
    return { success: true, data: undefined };
  } catch (error) {
    return failAction("updateProductType", error, "No se pudo actualizar el tipo de producto");
  }
}
