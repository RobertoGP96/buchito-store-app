"use server";

import { revalidatePath, revalidateTag } from "next/cache";
import { CACHE_TAGS } from "@/lib/cache-tags";
import { db } from "@/lib/db";
import { assertRole } from "@/lib/auth-guard";
import { createAuditLog } from "@/lib/audit";
import { failAction, firstIssueMessage } from "@/lib/action-utils";
import type { ActionResult } from "@/types";
import { categorySchema, type CategoryInput } from "../lib/schemas";

function revalidateCategoryPaths() {
  revalidateTag(CACHE_TAGS.categories);
  revalidatePath("/admin/categorias");
  revalidatePath("/admin/productos");
  revalidatePath("/catalogo");
}

/** true si `candidateParentId` es la propia categoría o desciende de ella. */
async function wouldCreateCycle(categoryId: number, candidateParentId: number | null): Promise<boolean> {
  let cursor = candidateParentId;
  const seen = new Set<number>();
  while (cursor != null) {
    if (cursor === categoryId || seen.has(cursor)) return true;
    seen.add(cursor);
    const parent = await db.category.findUnique({
      where: { categoryId: cursor },
      select: { parentId: true },
    });
    cursor = parent?.parentId ?? null;
  }
  return false;
}

export async function createCategory(
  input: CategoryInput
): Promise<ActionResult<{ categoryId: number }>> {
  const parsed = categorySchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: firstIssueMessage(parsed.error, "Revisa los datos") };
  }
  const data = parsed.data;

  try {
    const userId = await assertRole("admin");
    const duplicate = await db.category.findFirst({
      where: { OR: [{ slug: data.slug }, { parentId: data.parentId, name: data.name }] },
      select: { categoryId: true },
    });
    if (duplicate) {
      return { success: false, error: "Ya existe una categoría con ese nombre o slug en el mismo nivel" };
    }

    const row = await db.$transaction(async (tx) => {
      const created = await tx.category.create({ data });
      await createAuditLog(tx, {
        action: "create",
        entityType: "Category",
        entityId: created.categoryId,
        module: "products",
        userId,
        newValues: data,
      });
      return created;
    });

    revalidateCategoryPaths();
    return { success: true, data: { categoryId: row.categoryId } };
  } catch (error) {
    return failAction("createCategory", error, "No se pudo crear la categoría");
  }
}

export async function updateCategory(
  categoryId: number,
  input: CategoryInput
): Promise<ActionResult<void>> {
  const parsed = categorySchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: firstIssueMessage(parsed.error, "Revisa los datos") };
  }
  const data = parsed.data;

  try {
    const userId = await assertRole("admin");
    const current = await db.category.findUnique({ where: { categoryId } });
    if (!current) return { success: false, error: "Categoría no encontrada" };

    if (await wouldCreateCycle(categoryId, data.parentId)) {
      return { success: false, error: "Una categoría no puede colgar de sí misma ni de sus hijas" };
    }
    const duplicate = await db.category.findFirst({
      where: {
        categoryId: { not: categoryId },
        OR: [{ slug: data.slug }, { parentId: data.parentId, name: data.name }],
      },
      select: { categoryId: true },
    });
    if (duplicate) {
      return { success: false, error: "Ya existe otra categoría con ese nombre o slug en el mismo nivel" };
    }

    await db.$transaction(async (tx) => {
      await tx.category.update({ where: { categoryId }, data });
      await createAuditLog(tx, {
        action: "update",
        entityType: "Category",
        entityId: categoryId,
        module: "products",
        userId,
        oldValues: current,
        newValues: data,
      });
    });

    revalidateCategoryPaths();
    return { success: true, data: undefined };
  } catch (error) {
    return failAction("updateCategory", error, "No se pudo actualizar la categoría");
  }
}
