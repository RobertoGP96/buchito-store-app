import "server-only";
import type { Prisma } from "@/generated/prisma";
import { db } from "@/lib/db";
import { BaseCurrencyNotConfiguredError, getRatesToBaseCached } from "@/lib/currency";
import { roundToCurrency } from "@/lib/currency-math";
import type { CurrencyInfo } from "@/lib/format";
import { decimalToNumber } from "@/lib/money";
import type { ProductStatus } from "@/modules/products/lib/labels";
import type { SaleUnit } from "@/modules/products/lib/units";
import { comboAvailability, comboRegularPrice, comboSavingsPct } from "../lib/combo-pricing";
import { deriveComboState, type ComboState } from "../lib/labels";

export interface AdminComboItemRow {
  comboItemId: number;
  variantId: number;
  qty: number;
  sortOrder: number;
  productId: number;
  productName: string;
  variantName: string | null;
  sku: string;
  unit: SaleUnit;
  qtyStep: number;
  stock: number;
  /** Precio regular de la variante en base; null sin tasa. */
  priceBase: number | null;
  /** El componente se puede vender (variante activa y producto publicado). */
  sellable: boolean;
}

export interface AdminComboRow {
  comboId: number;
  version: number;
  slug: string;
  name: string;
  description: string | null;
  imageUrl: string | null;
  /** Precio en SU moneda, sin convertir. */
  price: number;
  priceCurrency: CurrencyInfo;
  /** Precio convertido a base; null sin tasa. */
  priceBase: number | null;
  /** Suma de los componentes a precio regular, en base; null si alguno no tiene tasa. */
  regularPriceBase: number | null;
  savingsPct: number;
  status: ProductStatus;
  state: ComboState;
  featured: boolean;
  startsAt: string | null;
  endsAt: string | null;
  sortOrder: number;
  /** Unidades vendibles con el stock actual (0 si algún componente no se vende). */
  available: number;
  items: AdminComboItemRow[];
  updatedAt: string;
}

const COMBO_INCLUDE = {
  priceCurrency: { select: { currencyId: true, code: true, symbol: true, decimalPlaces: true } },
  items: {
    orderBy: { sortOrder: "asc" as const },
    include: {
      variant: {
        select: {
          variantId: true,
          sku: true,
          name: true,
          price: true,
          priceCurrencyId: true,
          unit: true,
          qtyStep: true,
          stock: true,
          isActive: true,
          product: { select: { productId: true, name: true, status: true } },
        },
      },
    },
  },
} satisfies Prisma.ComboInclude;

type ComboRow = Prisma.ComboGetPayload<{ include: typeof COMBO_INCLUDE }>;

type RatesToBase = Map<number, { rate: number }>;

async function loadRatesToBase(): Promise<{ rates: RatesToBase; baseDecimals: number }> {
  try {
    const { base, rates } = await getRatesToBaseCached();
    return { rates, baseDecimals: base.decimalPlaces };
  } catch (error) {
    if (error instanceof BaseCurrencyNotConfiguredError) return { rates: new Map(), baseDecimals: 0 };
    throw error;
  }
}

function toRow(row: ComboRow, rates: RatesToBase, baseDecimals: number, now: Date): AdminComboRow {
  const price = decimalToNumber(row.price);
  const rate = rates.get(row.priceCurrencyId);
  const priceBase = rate ? roundToCurrency(price * rate.rate, baseDecimals) : null;

  let regularKnown = true;
  const items: AdminComboItemRow[] = row.items.map((item) => {
    const v = item.variant;
    const vRate = rates.get(v.priceCurrencyId);
    const vPriceBase = vRate ? roundToCurrency(decimalToNumber(v.price) * vRate.rate, baseDecimals) : null;
    if (vPriceBase == null) regularKnown = false;
    return {
      comboItemId: item.comboItemId,
      variantId: v.variantId,
      qty: decimalToNumber(item.qty),
      sortOrder: item.sortOrder,
      productId: v.product.productId,
      productName: v.product.name,
      variantName: v.name,
      sku: v.sku,
      unit: v.unit,
      qtyStep: decimalToNumber(v.qtyStep),
      stock: decimalToNumber(v.stock),
      priceBase: vPriceBase,
      sellable: v.isActive && v.product.status === "active",
    };
  });
  const regularPriceBase = regularKnown
    ? comboRegularPrice(items.map((i) => ({ qty: i.qty, unitPriceBase: i.priceBase ?? 0 })), baseDecimals)
    : null;
  const allSellable = items.every((i) => i.sellable);

  return {
    comboId: row.comboId,
    version: row.version,
    slug: row.slug,
    name: row.name,
    description: row.description,
    imageUrl: row.imageUrl,
    price,
    priceCurrency: row.priceCurrency,
    priceBase,
    regularPriceBase,
    savingsPct: priceBase != null && regularPriceBase != null ? comboSavingsPct(priceBase, regularPriceBase) : 0,
    status: row.status,
    state: deriveComboState(row, now),
    featured: row.featured,
    startsAt: row.startsAt?.toISOString() ?? null,
    endsAt: row.endsAt?.toISOString() ?? null,
    sortOrder: row.sortOrder,
    available: allSellable ? comboAvailability(items) : 0,
    items,
    updatedAt: row.updatedAt.toISOString(),
  };
}

export async function getAdminCombos(): Promise<AdminComboRow[]> {
  const [{ rates, baseDecimals }, rows] = await Promise.all([
    loadRatesToBase(),
    db.combo.findMany({ include: COMBO_INCLUDE, orderBy: [{ status: "asc" }, { sortOrder: "asc" }, { name: "asc" }] }),
  ]);
  const now = new Date();
  return rows.map((row) => toRow(row, rates, baseDecimals, now));
}

export async function getAdminCombo(comboId: number): Promise<AdminComboRow | null> {
  const [{ rates, baseDecimals }, row] = await Promise.all([
    loadRatesToBase(),
    db.combo.findUnique({ where: { comboId }, include: COMBO_INCLUDE }),
  ]);
  return row ? toRow(row, rates, baseDecimals, new Date()) : null;
}

/** Variante elegible como componente de un combo, para el selector del formulario. */
export interface ComboVariantOption {
  variantId: number;
  productId: number;
  productName: string;
  variantName: string | null;
  sku: string;
  unit: SaleUnit;
  qtyStep: number;
  stock: number;
  priceBase: number | null;
  sellable: boolean;
}

/** Variantes de productos no archivados: las inactivas o de borrador se
 *  ofrecen igual (el admin puede estar preparando el combo), marcadas. */
export async function getComboVariantOptions(): Promise<ComboVariantOption[]> {
  const [{ rates, baseDecimals }, rows] = await Promise.all([
    loadRatesToBase(),
    db.productVariant.findMany({
      where: { product: { status: { not: "archived" } } },
      orderBy: [{ product: { name: "asc" } }, { sortOrder: "asc" }],
      select: {
        variantId: true,
        sku: true,
        name: true,
        price: true,
        priceCurrencyId: true,
        unit: true,
        qtyStep: true,
        stock: true,
        isActive: true,
        product: { select: { productId: true, name: true, status: true } },
      },
    }),
  ]);
  return rows.map((v) => {
    const rate = rates.get(v.priceCurrencyId);
    return {
      variantId: v.variantId,
      productId: v.product.productId,
      productName: v.product.name,
      variantName: v.name,
      sku: v.sku,
      unit: v.unit,
      qtyStep: decimalToNumber(v.qtyStep),
      stock: decimalToNumber(v.stock),
      priceBase: rate ? roundToCurrency(decimalToNumber(v.price) * rate.rate, baseDecimals) : null,
      sellable: v.isActive && v.product.status === "active",
    };
  });
}
