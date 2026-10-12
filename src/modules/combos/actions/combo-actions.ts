"use server";

import { revalidatePath } from "next/cache";
import { Prisma } from "@/generated/prisma";
import { db } from "@/lib/db";
import { assertRole } from "@/lib/auth-guard";
import { createAuditLog } from "@/lib/audit";
import { failAction, firstIssueMessage, StaleVersionError } from "@/lib/action-utils";
import { roundToCurrency } from "@/lib/currency-math";
import { slugify } from "@/lib/slug";
import type { ActionResult } from "@/types";
import { PRODUCT_STATUSES, type ProductStatus } from "@/modules/products/lib/labels";
import { isMultipleOf } from "@/modules/products/lib/units";
import { nextAvailableSlug } from "@/modules/products/lib/variant-rules";
import { decimalToNumber } from "@/lib/money";
import { comboSchema, type ComboInput, type ComboValues } from "../lib/schemas";

function revalidateComboPaths(comboId: number | null, slugs: string[]) {
  revalidatePath("/admin/combos");
  if (comboId != null) revalidatePath(`/admin/combos/${comboId}`);
  revalidatePath("/");
  revalidatePath("/combos");
  revalidatePath("/ofertas");
  for (const slug of new Set(slugs)) revalidatePath(`/combos/${slug}`);
}

function isUniqueViolation(error: unknown): boolean {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002";
}

type SlugResult = { ok: true; value: string } | { ok: false; error: string };

/** Slug explícito: debe estar libre (salvo el propio combo). Vacío: se deriva
 *  del nombre y se le añade sufijo hasta que esté libre. */
async function resolveSlug(explicit: string, name: string, comboId: number | null): Promise<SlugResult> {
  const notSelf = comboId == null ? {} : { comboId: { not: comboId } };
  if (explicit !== "") {
    const taken = await db.combo.findFirst({ where: { slug: explicit, ...notSelf }, select: { comboId: true } });
    if (taken) return { ok: false, error: "Ya existe un combo con ese slug" };
    return { ok: true, value: explicit };
  }
  const base = slugify(name);
  if (base === "") return { ok: false, error: "El nombre no sirve para generar el slug" };
  const rows = await db.combo.findMany({ where: { slug: { startsWith: base }, ...notSelf }, select: { slug: true } });
  return { ok: true, value: nextAvailableSlug(base, rows.map((r) => r.slug)) };
}

/** Comprueba que los componentes existen y redondea el precio a los decimales
 *  de su moneda (igual que las variantes). */
async function prepare(data: ComboValues): Promise<{ ok: true; price: number } | { ok: false; error: string }> {
  const currency = await db.currency.findUnique({
    where: { currencyId: data.priceCurrencyId },
    select: { isActive: true, decimalPlaces: true },
  });
  if (!currency?.isActive) return { ok: false, error: "Elige una moneda activa para el precio" };

  const variantIds = data.items.map((i) => i.variantId);
  const found = await db.productVariant.findMany({
    where: { variantId: { in: variantIds }, product: { status: { not: "archived" } } },
    select: { variantId: true, qtyStep: true, product: { select: { name: true } } },
  });
  if (found.length !== variantIds.length) {
    return { ok: false, error: "Alguno de los productos del combo ya no existe o está archivado" };
  }
  // La cantidad de cada componente debe respetar el paso de venta de su variante.
  for (const item of data.items) {
    const variant = found.find((v) => v.variantId === item.variantId)!;
    const step = decimalToNumber(variant.qtyStep);
    if (!isMultipleOf(item.qty, step)) {
      return { ok: false, error: `${variant.product.name} se vende en múltiplos de ${step}` };
    }
  }
  return { ok: true, price: roundToCurrency(data.price, currency.decimalPlaces) };
}

function toColumns(data: ComboValues, slug: string, price: number) {
  return {
    slug,
    name: data.name,
    description: data.description,
    imageUrl: data.imageUrl,
    price: new Prisma.Decimal(price),
    priceCurrencyId: data.priceCurrencyId,
    status: data.status,
    featured: data.featured,
    startsAt: data.startsAt,
    endsAt: data.endsAt,
    sortOrder: data.sortOrder,
  };
}

export async function createCombo(input: ComboInput): Promise<ActionResult<{ comboId: number }>> {
  const parsed = comboSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: firstIssueMessage(parsed.error, "Revisa los datos") };
  }
  const data = parsed.data;

  try {
    const userId = await assertRole("admin");
    const slug = await resolveSlug(data.slug, data.name, null);
    if (!slug.ok) return { success: false, error: slug.error };
    const prepared = await prepare(data);
    if (!prepared.ok) return { success: false, error: prepared.error };
    const columns = toColumns(data, slug.value, prepared.price);

    const row = await db.$transaction(async (tx) => {
      const created = await tx.combo.create({
        data: {
          ...columns,
          items: { create: data.items.map((item, i) => ({ variantId: item.variantId, qty: item.qty, sortOrder: i })) },
        },
        select: { comboId: true, slug: true },
      });
      await createAuditLog(tx, {
        action: "create",
        entityType: "Combo",
        entityId: created.comboId,
        module: "combos",
        userId,
        newValues: { ...columns, price: prepared.price, items: data.items },
      });
      return created;
    });

    revalidateComboPaths(row.comboId, [row.slug]);
    return { success: true, data: { comboId: row.comboId } };
  } catch (error) {
    if (isUniqueViolation(error)) return { success: false, error: "Ya existe un combo con ese slug" };
    return failAction("createCombo", error, "No se pudo crear el combo");
  }
}

export async function updateCombo(comboId: number, version: number, input: ComboInput): Promise<ActionResult<void>> {
  const parsed = comboSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: firstIssueMessage(parsed.error, "Revisa los datos") };
  }
  const data = parsed.data;

  try {
    const userId = await assertRole("admin");
    const current = await db.combo.findUnique({
      where: { comboId },
      include: { items: { select: { variantId: true, qty: true } } },
    });
    if (!current) return { success: false, error: "Combo no encontrado" };
    const slug = await resolveSlug(data.slug, data.name, comboId);
    if (!slug.ok) return { success: false, error: slug.error };
    const prepared = await prepare(data);
    if (!prepared.ok) return { success: false, error: prepared.error };
    const columns = toColumns(data, slug.value, prepared.price);

    await db.$transaction(async (tx) => {
      const updated = await tx.combo.updateMany({
        where: { comboId, version },
        data: { ...columns, version: { increment: 1 } },
      });
      if (updated.count !== 1) throw new StaleVersionError();
      // Los componentes se reemplazan completos: es una lista corta y así el
      // orden y las cantidades quedan exactamente como se enviaron.
      await tx.comboItem.deleteMany({ where: { comboId } });
      await tx.comboItem.createMany({
        data: data.items.map((item, i) => ({ comboId, variantId: item.variantId, qty: item.qty, sortOrder: i })),
      });
      const { items: oldItems, ...oldValues } = current;
      await createAuditLog(tx, {
        action: "update",
        entityType: "Combo",
        entityId: comboId,
        module: "combos",
        userId,
        oldValues: { ...oldValues, items: oldItems },
        newValues: { ...columns, price: prepared.price, items: data.items },
      });
    });

    revalidateComboPaths(comboId, [current.slug, slug.value]);
    return { success: true, data: undefined };
  } catch (error) {
    if (error instanceof StaleVersionError) return { success: false, error: error.message };
    if (isUniqueViolation(error)) return { success: false, error: "Ya existe un combo con ese slug" };
    return failAction("updateCombo", error, "No se pudo actualizar el combo");
  }
}

export async function setComboStatus(comboId: number, status: ProductStatus): Promise<ActionResult<void>> {
  if (!PRODUCT_STATUSES.includes(status)) return { success: false, error: "Estado no válido" };

  try {
    const userId = await assertRole("admin");
    const current = await db.combo.findUnique({
      where: { comboId },
      select: { status: true, slug: true, _count: { select: { items: true } } },
    });
    if (!current) return { success: false, error: "Combo no encontrado" };
    if (status === "active" && current._count.items === 0) {
      return { success: false, error: "Añade al menos un producto antes de publicar el combo" };
    }

    await db.$transaction(async (tx) => {
      await tx.combo.update({ where: { comboId }, data: { status, version: { increment: 1 } } });
      await createAuditLog(tx, {
        action: `status:${status}`,
        entityType: "Combo",
        entityId: comboId,
        module: "combos",
        userId,
        oldValues: { status: current.status },
        newValues: { status },
      });
    });

    revalidateComboPaths(comboId, [current.slug]);
    return { success: true, data: undefined };
  } catch (error) {
    return failAction("setComboStatus", error, "No se pudo cambiar el estado del combo");
  }
}
