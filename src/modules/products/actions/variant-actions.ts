"use server";

import { revalidatePath } from "next/cache";
import { Prisma } from "@/generated/prisma";
import { db } from "@/lib/db";
import { assertRole } from "@/lib/auth-guard";
import { createAuditLog } from "@/lib/audit";
import { failAction, firstIssueMessage, StaleVersionError } from "@/lib/action-utils";
import { roundToCurrency } from "@/lib/currency-math";
import type { ActionResult } from "@/types";
import {
  parseAttributeSchema,
  validateAttributes,
  type AttributeValues,
} from "../lib/attribute-schema";
import { variantSchema, type VariantInput, type VariantValues } from "../lib/schemas";
import { firstAttributeError, resolveIsDefault, resolveVariantName } from "../lib/variant-rules";

const UNIQUE_CONFLICT =
  "Ya existe una variante con ese SKU o la predeterminada cambió. Recarga e inténtalo de nuevo.";

function revalidateVariantPaths(productId: number, slug: string) {
  revalidatePath("/admin/productos");
  revalidatePath(`/admin/productos/${productId}`);
  revalidatePath("/catalogo");
  revalidatePath("/");
  revalidatePath(`/producto/${slug}`);
}

function isUniqueViolation(error: unknown): boolean {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002";
}

const PRICE_ORDER_ERROR = "El precio anterior debe ser mayor que el precio actual";

function getCurrency(currencyId: number) {
  return db.currency.findUnique({
    where: { currencyId },
    select: { isActive: true, decimalPlaces: true },
  });
}

/** Redondea a los decimales de la moneda elegida: catálogo y pedidos siempre
 *  redondean al convertir, así que un precio con más decimales se vendería
 *  distinto de como lo ve el admin y ese valor no quedaría en ningún pedido.
 *  Devuelve null si tras redondear el precio anterior deja de ser mayor. */
function roundPrices(data: VariantValues, decimalPlaces: number) {
  const price = roundToCurrency(data.price, decimalPlaces);
  const compareAtPrice =
    data.compareAtPrice == null ? null : roundToCurrency(data.compareAtPrice, decimalPlaces);
  if (compareAtPrice != null && compareAtPrice <= price) return null;
  return { price, compareAtPrice };
}

/** La unicidad en DB distingue mayúsculas; aquí no, para que "cam-neg-m" y
 *  "CAM-NEG-M" no convivan y confundan al inventariar. */
async function skuTaken(sku: string, excludeVariantId?: number): Promise<boolean> {
  const row = await db.productVariant.findFirst({
    where: {
      sku: { equals: sku, mode: "insensitive" },
      ...(excludeVariantId != null ? { variantId: { not: excludeVariantId } } : {}),
    },
    select: { variantId: true },
  });
  return row != null;
}

type CostColumns = { cost: Prisma.Decimal | null; costCurrencyId: number | null };

/** Costo de compra: sin moneda propia se asume la del precio; se redondea a
 *  los decimales de su moneda. Null si no se registró. */
async function resolveCost(data: VariantValues): Promise<{ ok: true; value: CostColumns } | { ok: false; error: string }> {
  if (data.cost == null) return { ok: true, value: { cost: null, costCurrencyId: null } };
  const costCurrencyId = data.costCurrencyId ?? data.priceCurrencyId;
  const currency = await getCurrency(costCurrencyId);
  if (!currency) return { ok: false, error: "La moneda del costo no existe" };
  return {
    ok: true,
    value: { cost: new Prisma.Decimal(roundToCurrency(data.cost, currency.decimalPlaces)), costCurrencyId },
  };
}

/** Columnas que escriben create/update. Nunca `stock`: solo adjustStock. */
function toVariantColumns(
  data: VariantValues,
  attributes: AttributeValues,
  name: string | null,
  prices: { price: number; compareAtPrice: number | null },
  cost: CostColumns
) {
  return {
    sku: data.sku,
    name,
    attributes,
    price: new Prisma.Decimal(prices.price),
    compareAtPrice: prices.compareAtPrice == null ? null : new Prisma.Decimal(prices.compareAtPrice),
    priceCurrencyId: data.priceCurrencyId,
    cost: cost.cost,
    costCurrencyId: cost.costCurrencyId,
    imageUrl: data.imageUrl,
    isActive: data.isActive,
    sortOrder: data.sortOrder,
  };
}

export async function createVariant(
  input: VariantInput
): Promise<ActionResult<{ variantId: number }>> {
  const parsed = variantSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: firstIssueMessage(parsed.error, "Revisa los datos") };
  }
  const data = parsed.data;

  try {
    const userId = await assertRole("admin");
    const product = await db.product.findUnique({
      where: { productId: data.productId },
      select: {
        slug: true,
        type: { select: { attributeSchema: true } },
        _count: { select: { variants: true } },
      },
    });
    if (!product) return { success: false, error: "Producto no encontrado" };
    const currency = await getCurrency(data.priceCurrencyId);
    if (!currency?.isActive) {
      return { success: false, error: "Elige una moneda activa para el precio" };
    }
    const prices = roundPrices(data, currency.decimalPlaces);
    if (!prices) return { success: false, error: PRICE_ORDER_ERROR };
    const cost = await resolveCost(data);
    if (!cost.ok) return { success: false, error: cost.error };
    if (await skuTaken(data.sku)) {
      return { success: false, error: "Ya existe una variante con ese SKU" };
    }

    const schema = parseAttributeSchema(product.type.attributeSchema);
    const validation = validateAttributes(schema, data.attributes, "variant");
    if (!validation.ok) {
      return { success: false, error: firstAttributeError(validation.errors) ?? "Revisa los atributos" };
    }
    const name = resolveVariantName(data.name, schema, validation.values);
    const isDefault = resolveIsDefault(data.isDefault, product._count.variants);
    const columns = toVariantColumns(data, validation.values, name, prices, cost.value);

    const row = await db.$transaction(async (tx) => {
      if (isDefault) {
        await tx.productVariant.updateMany({
          where: { productId: data.productId, isDefault: true },
          data: { isDefault: false },
        });
      }
      const created = await tx.productVariant.create({
        data: { productId: data.productId, ...columns, isDefault, stock: data.initialStock },
      });
      if (data.initialStock > 0) {
        await tx.stockMovement.create({
          data: {
            variantId: created.variantId,
            type: "entry",
            quantity: data.initialStock,
            stockAfter: data.initialStock,
            referenceType: "manual",
            notes: "Stock inicial",
            createdById: userId,
          },
        });
      }
      await createAuditLog(tx, {
        action: "create",
        entityType: "ProductVariant",
        entityId: created.variantId,
        module: "products",
        userId,
        newValues: { productId: data.productId, ...columns, isDefault, stock: data.initialStock },
      });
      return created;
    });

    revalidateVariantPaths(data.productId, product.slug);
    return { success: true, data: { variantId: row.variantId } };
  } catch (error) {
    if (isUniqueViolation(error)) return { success: false, error: UNIQUE_CONFLICT };
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
  const data = parsed.data;

  try {
    const userId = await assertRole("admin");
    const current = await db.productVariant.findUnique({
      where: { variantId },
      include: {
        product: {
          select: { slug: true, status: true, type: { select: { attributeSchema: true } } },
        },
      },
    });
    if (!current) return { success: false, error: "Variante no encontrada" };
    if (data.productId !== current.productId) {
      return { success: false, error: "Una variante no se puede mover a otro producto" };
    }
    const currency = await getCurrency(data.priceCurrencyId);
    if (!currency) return { success: false, error: "La moneda del precio no existe" };
    if (data.priceCurrencyId !== current.priceCurrencyId && !currency.isActive) {
      return { success: false, error: "Elige una moneda activa para el precio" };
    }
    const prices = roundPrices(data, currency.decimalPlaces);
    if (!prices) return { success: false, error: PRICE_ORDER_ERROR };
    const cost = await resolveCost(data);
    if (!cost.ok) return { success: false, error: cost.error };
    if (await skuTaken(data.sku, variantId)) {
      return { success: false, error: "Ya existe otra variante con ese SKU" };
    }
    if (current.isDefault && !data.isDefault) {
      return {
        success: false,
        error: "Para quitar la variante predeterminada marca otra como predeterminada",
      };
    }
    if (current.product.status === "active" && current.isActive && !data.isActive) {
      const otherActive = await db.productVariant.count({
        where: { productId: current.productId, isActive: true, variantId: { not: variantId } },
      });
      if (otherActive === 0) {
        return {
          success: false,
          error: "Es la única variante publicada: publica otra o archiva el producto antes",
        };
      }
    }

    const schema = parseAttributeSchema(current.product.type.attributeSchema);
    const validation = validateAttributes(schema, data.attributes, "variant");
    if (!validation.ok) {
      return { success: false, error: firstAttributeError(validation.errors) ?? "Revisa los atributos" };
    }
    const name = resolveVariantName(data.name, schema, validation.values);
    const columns = toVariantColumns(data, validation.values, name, prices, cost.value);
    const { product, ...oldValues } = current;
    void product;

    await db.$transaction(async (tx) => {
      // Primero se desmarcan las demás: el índice único parcial por producto
      // no permite dos predeterminadas ni un instante.
      if (data.isDefault && !current.isDefault) {
        await tx.productVariant.updateMany({
          where: { productId: current.productId, isDefault: true, variantId: { not: variantId } },
          data: { isDefault: false },
        });
      }
      const updated = await tx.productVariant.updateMany({
        where: { variantId, version },
        data: { ...columns, isDefault: data.isDefault, version: { increment: 1 } },
      });
      if (updated.count !== 1) throw new StaleVersionError();
      await createAuditLog(tx, {
        action: "update",
        entityType: "ProductVariant",
        entityId: variantId,
        module: "products",
        userId,
        oldValues,
        newValues: { ...columns, isDefault: data.isDefault },
      });
    });

    revalidateVariantPaths(current.productId, current.product.slug);
    return { success: true, data: undefined };
  } catch (error) {
    if (error instanceof StaleVersionError) return { success: false, error: error.message };
    if (isUniqueViolation(error)) return { success: false, error: UNIQUE_CONFLICT };
    return failAction("updateVariant", error, "No se pudo actualizar la variante");
  }
}
