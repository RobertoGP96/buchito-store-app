"use server";

import { revalidatePath } from "next/cache";
import { Prisma } from "@/generated/prisma";
import { db } from "@/lib/db";
import { assertRole } from "@/lib/auth-guard";
import { createAuditLog } from "@/lib/audit";
import { failAction, firstIssueMessage, IN_USE_MESSAGE, isForeignKeyViolation, isValidId, StaleVersionError } from "@/lib/action-utils";
import { slugify } from "@/lib/slug";
import { deleteObjectIfOurs } from "@/lib/storage";
import type { ActionResult } from "@/types";
import {
  parseAttributeSchema,
  validateAttributes,
  type AttributeValues,
} from "../lib/attribute-schema";
import { PRODUCT_STATUSES, type ProductStatus } from "../lib/labels";
import { productSchema, type ProductInput } from "../lib/schemas";
import { firstAttributeError, nextAvailableSlug } from "../lib/variant-rules";

type Check<T> = { ok: true; value: T } | { ok: false; error: string };

function revalidateProductPaths(productId: number, slugs: string[]) {
  revalidatePath("/admin/productos");
  revalidatePath(`/admin/productos/${productId}`);
  revalidatePath("/catalogo");
  revalidatePath("/");
  for (const slug of new Set(slugs)) revalidatePath(`/producto/${slug}`);
}

function isUniqueViolation(error: unknown): boolean {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002";
}

/** Comprueba el tipo y normaliza los atributos de scope "product" contra su
 *  esquema. `requireActive` solo al crear o al cambiar de tipo: un tipo
 *  desactivado después no debe bloquear la edición de sus productos. */
async function checkTypeAttributes(
  typeId: number,
  attributes: Record<string, unknown>,
  requireActive: boolean
): Promise<Check<AttributeValues>> {
  const type = await db.productType.findUnique({
    where: { typeId },
    select: { isActive: true, attributeSchema: true },
  });
  if (!type) return { ok: false, error: "El tipo de producto no existe" };
  if (requireActive && !type.isActive) {
    return { ok: false, error: "Elige un tipo de producto activo" };
  }
  const validation = validateAttributes(parseAttributeSchema(type.attributeSchema), attributes, "product");
  if (!validation.ok) {
    return { ok: false, error: firstAttributeError(validation.errors) ?? "Revisa los atributos" };
  }
  return { ok: true, value: validation.values };
}

async function categoryExists(categoryId: number | null): Promise<boolean> {
  if (categoryId == null) return true;
  const row = await db.category.findUnique({ where: { categoryId }, select: { categoryId: true } });
  return row != null;
}

/** Slug explícito: debe estar libre (salvo el propio producto). Vacío: se
 *  deriva del nombre y se le añade -2, -3… hasta que quede libre. */
async function resolveSlug(
  explicit: string,
  name: string,
  ownProductId: number | null
): Promise<Check<string>> {
  const notSelf = ownProductId != null ? { productId: { not: ownProductId } } : {};

  if (explicit !== "") {
    const taken = await db.product.findFirst({
      where: { slug: explicit, ...notSelf },
      select: { productId: true },
    });
    if (taken) return { ok: false, error: "Ya existe un producto con ese slug" };
    return { ok: true, value: explicit };
  }

  const base = slugify(name);
  if (base === "") return { ok: false, error: "El nombre no sirve para generar el slug" };
  const rows = await db.product.findMany({
    where: { slug: { startsWith: base }, ...notSelf },
    select: { slug: true },
  });
  return { ok: true, value: nextAvailableSlug(base, rows.map((r) => r.slug)) };
}

async function countActiveVariants(productId: number): Promise<number> {
  return db.productVariant.count({ where: { productId, isActive: true } });
}

export async function createProduct(
  input: ProductInput
): Promise<ActionResult<{ productId: number }>> {
  const parsed = productSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: firstIssueMessage(parsed.error, "Revisa los datos") };
  }
  const data = parsed.data;

  try {
    const userId = await assertRole("admin");
    if (data.status === "active") {
      return {
        success: false,
        error: "Un producto nuevo no tiene variantes: guárdalo como borrador y publícalo cuando tenga una",
      };
    }

    const attributes = await checkTypeAttributes(data.typeId, data.attributes, true);
    if (!attributes.ok) return { success: false, error: attributes.error };
    if (!(await categoryExists(data.categoryId))) {
      return { success: false, error: "La categoría no existe" };
    }
    const slug = await resolveSlug(data.slug, data.name, null);
    if (!slug.ok) return { success: false, error: slug.error };

    const values = {
      typeId: data.typeId,
      categoryId: data.categoryId,
      name: data.name,
      slug: slug.value,
      description: data.description,
      attributes: attributes.value,
      status: data.status,
      featured: data.featured,
      sortOrder: data.sortOrder,
    };

    const row = await db.$transaction(async (tx) => {
      const created = await tx.product.create({ data: values });
      await createAuditLog(tx, {
        action: "create",
        entityType: "Product",
        entityId: created.productId,
        module: "products",
        userId,
        newValues: values,
      });
      return created;
    });

    revalidateProductPaths(row.productId, [row.slug]);
    return { success: true, data: { productId: row.productId } };
  } catch (error) {
    if (isUniqueViolation(error)) {
      return { success: false, error: "Ya existe un producto con ese slug" };
    }
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
  const data = parsed.data;

  try {
    const userId = await assertRole("admin");
    const current = await db.product.findUnique({
      where: { productId },
      include: { _count: { select: { variants: true } } },
    });
    if (!current) return { success: false, error: "Producto no encontrado" };

    const typeChanged = data.typeId !== current.typeId;
    if (typeChanged && current._count.variants > 0) {
      return { success: false, error: "Cambia el tipo antes de crear variantes" };
    }
    const attributes = await checkTypeAttributes(data.typeId, data.attributes, typeChanged);
    if (!attributes.ok) return { success: false, error: attributes.error };
    if (!(await categoryExists(data.categoryId))) {
      return { success: false, error: "La categoría no existe" };
    }
    const slug = await resolveSlug(data.slug, data.name, productId);
    if (!slug.ok) return { success: false, error: slug.error };
    if (data.status === "active" && (await countActiveVariants(productId)) === 0) {
      return { success: false, error: "Publica al menos una variante" };
    }

    const values = {
      typeId: data.typeId,
      categoryId: data.categoryId,
      name: data.name,
      slug: slug.value,
      description: data.description,
      attributes: attributes.value,
      status: data.status,
      featured: data.featured,
      sortOrder: data.sortOrder,
    };
    const { _count, ...oldValues } = current;
    void _count;

    await db.$transaction(async (tx) => {
      const updated = await tx.product.updateMany({
        where: { productId, version },
        data: { ...values, version: { increment: 1 } },
      });
      if (updated.count !== 1) throw new StaleVersionError();
      await createAuditLog(tx, {
        action: "update",
        entityType: "Product",
        entityId: productId,
        module: "products",
        userId,
        oldValues,
        newValues: values,
      });
    });

    revalidateProductPaths(productId, [current.slug, slug.value]);
    return { success: true, data: undefined };
  } catch (error) {
    if (error instanceof StaleVersionError) return { success: false, error: error.message };
    if (isUniqueViolation(error)) {
      return { success: false, error: "Ya existe un producto con ese slug" };
    }
    return failAction("updateProduct", error, "No se pudo actualizar el producto");
  }
}

export async function setProductStatus(
  productId: number,
  status: "draft" | "active" | "archived"
): Promise<ActionResult<void>> {
  if (!PRODUCT_STATUSES.includes(status as ProductStatus)) {
    return { success: false, error: "Estado no válido" };
  }

  try {
    const userId = await assertRole("admin");
    const current = await db.product.findUnique({
      where: { productId },
      select: { status: true, slug: true },
    });
    if (!current) return { success: false, error: "Producto no encontrado" };
    if (current.status === status) return { success: true, data: undefined };
    if (status === "active" && (await countActiveVariants(productId)) === 0) {
      return { success: false, error: "Publica al menos una variante" };
    }

    await db.$transaction(async (tx) => {
      // Sube `version` para que un formulario abierto con el estado anterior
      // reciba StaleVersionError en vez de pisar el cambio.
      await tx.product.update({
        where: { productId },
        data: { status, version: { increment: 1 } },
      });
      await createAuditLog(tx, {
        action: "status_change",
        entityType: "Product",
        entityId: productId,
        module: "products",
        userId,
        oldValues: { status: current.status },
        newValues: { status },
      });
    });

    revalidateProductPaths(productId, [current.slug]);
    return { success: true, data: undefined };
  } catch (error) {
    return failAction("setProductStatus", error, "No se pudo cambiar el estado del producto");
  }
}

/** Borra un producto que nunca se vendió, con sus variantes, movimientos de
 *  stock manuales y fotos. Con líneas de pedido no se puede: el pedido apunta
 *  a la variante y es historial; ahí se archiva. */
export async function deleteProduct(productId: number): Promise<ActionResult<void>> {
  if (!isValidId(productId)) return { success: false, error: "Producto no válido" };

  try {
    const userId = await assertRole("admin");
    const current = await db.product.findUnique({
      where: { productId },
      select: {
        name: true,
        slug: true,
        status: true,
        images: { select: { url: true } },
        variants: {
          select: { variantId: true, sku: true, imageUrl: true, _count: { select: { orderLines: true } } },
        },
      },
    });
    if (!current) return { success: false, error: "Producto no encontrado" };
    if (current.variants.some((v) => v._count.orderLines > 0)) {
      return { success: false, error: "Tiene pedidos registrados. Archívalo en su lugar." };
    }

    const variantIds = current.variants.map((v) => v.variantId);
    await db.$transaction(async (tx) => {
      if (variantIds.length > 0) {
        await tx.stockMovement.deleteMany({ where: { variantId: { in: variantIds } } });
        await tx.productVariant.deleteMany({ where: { variantId: { in: variantIds } } });
      }
      // Las fotos (ProductImage) caen en cascada con el producto.
      await tx.product.delete({ where: { productId } });
      await createAuditLog(tx, {
        action: "delete",
        entityType: "Product",
        entityId: productId,
        module: "products",
        userId,
        oldValues: {
          name: current.name,
          slug: current.slug,
          status: current.status,
          variants: current.variants.map((v) => v.sku),
          images: current.images.length,
        },
      });
    });

    // Fuera de la tx: un objeto huérfano en el bucket no afecta a la tienda.
    const urls = [...current.images.map((i) => i.url), ...current.variants.map((v) => v.imageUrl)];
    await Promise.all(urls.map((url) => deleteObjectIfOurs(url)));

    revalidateProductPaths(productId, [current.slug]);
    revalidatePath("/admin/inventario");
    return { success: true, data: undefined };
  } catch (error) {
    if (isForeignKeyViolation(error)) return { success: false, error: IN_USE_MESSAGE };
    return failAction("deleteProduct", error, "No se pudo eliminar el producto");
  }
}
