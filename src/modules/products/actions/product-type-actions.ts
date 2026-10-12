"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { assertRole } from "@/lib/auth-guard";
import { createAuditLog } from "@/lib/audit";
import { failAction, firstIssueMessage, IN_USE_MESSAGE, isForeignKeyViolation, isValidId } from "@/lib/action-utils";
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

/** Borra un tipo sin productos: los atributos de cada producto se validan
 *  contra el esquema de su tipo, así que uno en uso no puede desaparecer. */
export async function deleteProductType(typeId: number): Promise<ActionResult<void>> {
  if (!isValidId(typeId)) return { success: false, error: "Tipo de producto no válido" };

  try {
    const userId = await assertRole("admin");
    const current = await db.productType.findUnique({
      where: { typeId },
      include: { _count: { select: { products: true } } },
    });
    if (!current) return { success: false, error: "Tipo de producto no encontrado" };
    if (current._count.products > 0) {
      return { success: false, error: "Hay productos de este tipo. Cámbialos de tipo o elimínalos primero." };
    }

    await db.$transaction(async (tx) => {
      await tx.productType.delete({ where: { typeId } });
      await createAuditLog(tx, {
        action: "delete",
        entityType: "ProductType",
        entityId: typeId,
        module: "products",
        userId,
        oldValues: {
          name: current.name,
          slug: current.slug,
          attributeSchema: current.attributeSchema,
          isActive: current.isActive,
        },
      });
    });

    revalidateTypePaths();
    return { success: true, data: undefined };
  } catch (error) {
    if (isForeignKeyViolation(error)) return { success: false, error: IN_USE_MESSAGE };
    return failAction("deleteProductType", error, "No se pudo eliminar el tipo de producto");
  }
}
