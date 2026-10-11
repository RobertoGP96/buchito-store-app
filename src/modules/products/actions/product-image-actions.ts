"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { assertRole } from "@/lib/auth-guard";
import { createAuditLog } from "@/lib/audit";
import { failAction, firstIssueMessage } from "@/lib/action-utils";
import { MEDIA_PREFIX } from "@/lib/image-url";
import { deleteObjectIfOurs } from "@/lib/storage";
import type { ActionResult } from "@/types";

const MAX_IMAGES = 10;

const addImageSchema = z.object({
  productId: z.coerce.number().int().positive(),
  // `/media/<clave>` (subida propia) o una URL externa.
  url: z
    .string()
    .trim()
    .refine((v) => v.startsWith(MEDIA_PREFIX) || /^https?:\/\//.test(v), "URL de imagen no válida"),
  alt: z
    .string()
    .trim()
    .max(160)
    .transform((v) => (v === "" ? null : v))
    .nullable()
    .optional(),
});

async function revalidateProduct(productId: number) {
  const product = await db.product.findUnique({ where: { productId }, select: { slug: true } });
  revalidatePath("/admin/productos");
  revalidatePath(`/admin/productos/${productId}`);
  revalidatePath("/catalogo");
  revalidatePath("/");
  if (product) revalidatePath(`/producto/${product.slug}`);
}

export async function addProductImage(
  input: z.input<typeof addImageSchema>
): Promise<ActionResult<{ imageId: number }>> {
  const parsed = addImageSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: firstIssueMessage(parsed.error, "Revisa la imagen") };
  }
  const { productId, url, alt } = parsed.data;

  try {
    const userId = await assertRole("admin");
    const row = await db.$transaction(async (tx) => {
      const product = await tx.product.findUnique({
        where: { productId },
        select: { productId: true, _count: { select: { images: true } } },
      });
      if (!product) throw new Error("Producto no encontrado");
      if (product._count.images >= MAX_IMAGES) {
        throw new Error(`Máximo ${MAX_IMAGES} fotos por producto`);
      }
      const last = await tx.productImage.aggregate({ where: { productId }, _max: { sortOrder: true } });
      const created = await tx.productImage.create({
        data: { productId, url, alt: alt ?? null, sortOrder: (last._max.sortOrder ?? -1) + 1 },
      });
      await createAuditLog(tx, {
        action: "create",
        entityType: "ProductImage",
        entityId: created.imageId,
        module: "products",
        userId,
        newValues: { productId, url },
      });
      return created;
    });

    await revalidateProduct(productId);
    return { success: true, data: { imageId: row.imageId } };
  } catch (error) {
    if (error instanceof Error && /no encontrado|Máximo/.test(error.message)) {
      return { success: false, error: error.message };
    }
    return failAction("addProductImage", error, "No se pudo guardar la imagen");
  }
}

export async function deleteProductImage(imageId: number): Promise<ActionResult<void>> {
  if (!Number.isInteger(imageId) || imageId <= 0) return { success: false, error: "Imagen no válida" };

  try {
    const userId = await assertRole("admin");
    const image = await db.productImage.findUnique({ where: { imageId } });
    if (!image) return { success: false, error: "Imagen no encontrada" };

    await db.$transaction(async (tx) => {
      await tx.productImage.delete({ where: { imageId } });
      await createAuditLog(tx, {
        action: "delete",
        entityType: "ProductImage",
        entityId: imageId,
        module: "products",
        userId,
        oldValues: { productId: image.productId, url: image.url },
      });
    });
    // Fuera de la tx: si el borrado del objeto falla, la fila ya no existe y
    // el huérfano no afecta a la tienda.
    await deleteObjectIfOurs(image.url);

    await revalidateProduct(image.productId);
    return { success: true, data: undefined };
  } catch (error) {
    return failAction("deleteProductImage", error, "No se pudo eliminar la imagen");
  }
}

/** Nuevo orden: la primera imagen es la portada en catálogo y card. */
export async function reorderProductImages(
  productId: number,
  imageIds: number[]
): Promise<ActionResult<void>> {
  if (!Number.isInteger(productId) || !Array.isArray(imageIds)) {
    return { success: false, error: "Datos no válidos" };
  }

  try {
    const userId = await assertRole("admin");
    await db.$transaction(async (tx) => {
      const existing = await tx.productImage.findMany({ where: { productId }, select: { imageId: true } });
      const known = new Set(existing.map((i) => i.imageId));
      if (imageIds.length !== known.size || !imageIds.every((id) => known.has(id))) {
        throw new Error("El orden no coincide con las imágenes del producto. Recarga la página.");
      }
      for (const [index, imageId] of imageIds.entries()) {
        await tx.productImage.update({ where: { imageId }, data: { sortOrder: index } });
      }
      await createAuditLog(tx, {
        action: "update",
        entityType: "Product",
        entityId: productId,
        module: "products",
        userId,
        newValues: { imageOrder: imageIds },
      });
    });

    await revalidateProduct(productId);
    return { success: true, data: undefined };
  } catch (error) {
    if (error instanceof Error && error.message.startsWith("El orden")) {
      return { success: false, error: error.message };
    }
    return failAction("reorderProductImages", error, "No se pudo reordenar las imágenes");
  }
}
