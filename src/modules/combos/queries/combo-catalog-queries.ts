import "server-only";
import type { Prisma } from "@/generated/prisma";
import { db } from "@/lib/db";
import { BaseCurrencyNotConfiguredError, getBaseCurrencyCached, getRatesToBaseCached } from "@/lib/currency";
import { roundToCurrency } from "@/lib/currency-math";
import type { CurrencyInfo } from "@/lib/format";
import { decimalToNumber } from "@/lib/money";
import { comboAvailability, comboRegularPrice, comboSavingsPct } from "../lib/combo-pricing";

/** Componente de un combo tal como lo ve la tienda: precio YA en base. */
export interface CatalogComboItem {
  variantId: number;
  productId: number;
  productSlug: string;
  productName: string;
  variantName: string | null;
  sku: string;
  qty: number;
  imageUrl: string | null;
  unitPrice: number;
  stock: number;
}

export interface CatalogCombo {
  comboId: number;
  slug: string;
  name: string;
  description: string | null;
  imageUrl: string | null;
  /** Precio del combo en base. */
  price: number;
  /** Los componentes por separado, en base. */
  regularPrice: number;
  savingsPct: number;
  /** Unidades que permite el stock de los componentes. */
  available: number;
  featured: boolean;
  endsAt: string | null;
  items: CatalogComboItem[];
}

const COMBO_INCLUDE = {
  items: {
    orderBy: { sortOrder: "asc" as const },
    include: {
      variant: {
        include: {
          product: {
            select: {
              productId: true,
              slug: true,
              name: true,
              status: true,
              images: { orderBy: { sortOrder: "asc" as const }, take: 1, select: { url: true } },
            },
          },
        },
      },
    },
  },
} satisfies Prisma.ComboInclude;

type ComboRow = Prisma.ComboGetPayload<{ include: typeof COMBO_INCLUDE }>;

interface RateContext {
  base: CurrencyInfo;
  rates: Map<number, { rate: number }>;
}

async function getRateContext(): Promise<RateContext | null> {
  try {
    const base = await getBaseCurrencyCached();
    const { rates } = await getRatesToBaseCached();
    return { base, rates };
  } catch (error) {
    if (!(error instanceof BaseCurrencyNotConfiguredError)) console.error("combos.getRateContext:", error);
    return null;
  }
}

/** Devuelve null si el combo no se puede mostrar: sin tasa para su precio o
 *  con algún componente que ya no se vende (variante inactiva o producto no
 *  publicado). Un combo a medias no se ofrece. */
function toCatalogCombo(row: ComboRow, ctx: RateContext): CatalogCombo | null {
  const rate = ctx.rates.get(row.priceCurrencyId);
  if (!rate) {
    console.warn(`Combo ${row.slug} sin tasa a ${ctx.base.code}; omitido del catálogo`);
    return null;
  }
  const items: CatalogComboItem[] = [];
  for (const item of row.items) {
    const v = item.variant;
    const vRate = ctx.rates.get(v.priceCurrencyId);
    if (!vRate || !v.isActive || v.product.status !== "active") return null;
    items.push({
      variantId: v.variantId,
      productId: v.product.productId,
      productSlug: v.product.slug,
      productName: v.product.name,
      variantName: v.name,
      sku: v.sku,
      qty: item.qty,
      imageUrl: v.imageUrl ?? v.product.images[0]?.url ?? null,
      unitPrice: roundToCurrency(decimalToNumber(v.price) * vRate.rate, ctx.base.decimalPlaces),
      stock: v.stock,
    });
  }
  if (items.length === 0) return null;

  const price = roundToCurrency(decimalToNumber(row.price) * rate.rate, ctx.base.decimalPlaces);
  const regularPrice = comboRegularPrice(items.map((i) => ({ qty: i.qty, unitPriceBase: i.unitPrice })), ctx.base.decimalPlaces);
  return {
    comboId: row.comboId,
    slug: row.slug,
    name: row.name,
    description: row.description,
    imageUrl: row.imageUrl ?? items.find((i) => i.imageUrl)?.imageUrl ?? null,
    price,
    regularPrice,
    savingsPct: comboSavingsPct(price, regularPrice),
    available: comboAvailability(items),
    featured: row.featured,
    endsAt: row.endsAt?.toISOString() ?? null,
    items,
  };
}

function liveWhere(now: Date): Prisma.ComboWhereInput {
  return {
    status: "active",
    OR: [{ startsAt: null }, { startsAt: { lte: now } }],
    AND: [{ OR: [{ endsAt: null }, { endsAt: { gte: now } }] }],
  };
}

export async function getCatalogCombos(filters: { featured?: boolean; limit?: number } = {}): Promise<CatalogCombo[]> {
  const ctx = await getRateContext();
  if (!ctx) return [];
  const rows = await db.combo.findMany({
    where: { ...liveWhere(new Date()), ...(filters.featured ? { featured: true } : {}) },
    include: COMBO_INCLUDE,
    orderBy: [{ featured: "desc" }, { sortOrder: "asc" }, { name: "asc" }],
    take: filters.limit,
  });
  return rows.map((row) => toCatalogCombo(row, ctx)).filter((c): c is CatalogCombo => c !== null);
}

export async function getComboBySlug(slug: string): Promise<CatalogCombo | null> {
  const ctx = await getRateContext();
  if (!ctx) return null;
  const row = await db.combo.findFirst({ where: { slug, ...liveWhere(new Date()) }, include: COMBO_INCLUDE });
  return row ? toCatalogCombo(row, ctx) : null;
}
