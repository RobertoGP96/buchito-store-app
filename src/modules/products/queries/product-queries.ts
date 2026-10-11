import "server-only";
import type { Prisma } from "@/generated/prisma";
import { db } from "@/lib/db";
import { BaseCurrencyNotConfiguredError, getRatesToBaseCached } from "@/lib/currency";
import { roundToCurrency } from "@/lib/currency-math";
import type { CurrencyInfo } from "@/lib/format";
import { decimalToNullableNumber, decimalToNumber } from "@/lib/money";
import {
  parseAttributeSchema,
  parseAttributeValues,
  type AttributeDef,
  type AttributeValues,
} from "../lib/attribute-schema";
import type { ProductStatus } from "../lib/labels";

export interface AdminProductRow {
  productId: number;
  slug: string;
  name: string;
  typeName: string;
  categoryName: string | null;
  status: ProductStatus;
  featured: boolean;
  variantCount: number;
  totalStock: number;
  /** Precio mínimo entre variantes activas, en base; null sin tasa o sin variantes. */
  minPrice: number | null;
  /** Alguna variante tiene precio en una moneda sin tasa a base. */
  hasMissingRate: boolean;
  imageUrl: string | null;
  /** Esquema del tipo: la lista lo necesita para nombrar y editar variantes. */
  attributeSchema: AttributeDef[];
  /** Todas las variantes (activas e inactivas), en el orden del producto. */
  variants: AdminVariantSummary[];
  updatedAt: string;
}

export interface AdminVariantSummary {
  variantId: number;
  version: number;
  sku: string;
  name: string | null;
  attributes: AttributeValues;
  /** Precio en SU moneda (`priceCurrency`), sin convertir. */
  price: number;
  compareAtPrice: number | null;
  priceCurrency: CurrencyInfo;
  /** Precio convertido a base con la tasa vigente; null si no hay tasa. */
  priceBase: number | null;
  stock: number;
  imageUrl: string | null;
  isDefault: boolean;
  isActive: boolean;
  sortOrder: number;
}

type RatesToBase = Map<number, { rate: number }>;

/** Tasas a base; sin moneda base configurada devuelve un mapa vacío (nada se vende). */
async function loadRatesToBase(): Promise<{ rates: RatesToBase; baseDecimals: number }> {
  try {
    const { base, rates } = await getRatesToBaseCached();
    return { rates, baseDecimals: base.decimalPlaces };
  } catch (error) {
    if (error instanceof BaseCurrencyNotConfiguredError) return { rates: new Map(), baseDecimals: 0 };
    throw error;
  }
}

type VariantSource = {
  variantId: number;
  version: number;
  sku: string;
  name: string | null;
  attributes: unknown;
  price: Prisma.Decimal;
  compareAtPrice: Prisma.Decimal | null;
  priceCurrencyId: number;
  priceCurrency: CurrencyInfo;
  stock: number;
  imageUrl: string | null;
  isDefault: boolean;
  isActive: boolean;
  sortOrder: number;
};

function toVariantSummary(v: VariantSource, rates: RatesToBase, baseDecimals: number): AdminVariantSummary {
  const price = decimalToNumber(v.price);
  const rate = rates.get(v.priceCurrencyId);
  return {
    variantId: v.variantId,
    version: v.version,
    sku: v.sku,
    name: v.name,
    attributes: parseAttributeValues(v.attributes),
    price,
    compareAtPrice: decimalToNullableNumber(v.compareAtPrice),
    priceCurrency: v.priceCurrency,
    priceBase: rate ? roundToCurrency(price * rate.rate, baseDecimals) : null,
    stock: v.stock,
    imageUrl: v.imageUrl,
    isDefault: v.isDefault,
    isActive: v.isActive,
    sortOrder: v.sortOrder,
  };
}

const VARIANT_CURRENCY_SELECT = { select: { currencyId: true, code: true, symbol: true, decimalPlaces: true } } as const;

export async function getAdminProducts(): Promise<AdminProductRow[]> {
  const { rates, baseDecimals } = await loadRatesToBase();

  const rows = await db.product.findMany({
    orderBy: [{ updatedAt: "desc" }],
    include: {
      type: { select: { name: true, attributeSchema: true } },
      category: { select: { name: true } },
      images: { orderBy: { sortOrder: "asc" }, take: 1 },
      variants: {
        orderBy: [{ sortOrder: "asc" }, { variantId: "asc" }],
        include: { priceCurrency: VARIANT_CURRENCY_SELECT },
      },
    },
  });

  return rows.map((row) => {
    const variants = row.variants.map((v) => toVariantSummary(v, rates, baseDecimals));
    // El resumen (conteo, stock, precio mínimo) solo cuenta las variantes vendibles.
    const active = variants.filter((v) => v.isActive);
    let minPrice: number | null = null;
    let hasMissingRate = false;
    for (const v of active) {
      if (v.priceBase == null) {
        hasMissingRate = true;
        continue;
      }
      minPrice = minPrice == null ? v.priceBase : Math.min(minPrice, v.priceBase);
    }
    return {
      productId: row.productId,
      slug: row.slug,
      name: row.name,
      typeName: row.type.name,
      categoryName: row.category?.name ?? null,
      status: row.status,
      featured: row.featured,
      variantCount: active.length,
      totalStock: active.reduce((sum, v) => sum + v.stock, 0),
      minPrice,
      hasMissingRate,
      imageUrl: row.images[0]?.url ?? active.find((v) => v.imageUrl)?.imageUrl ?? null,
      attributeSchema: parseAttributeSchema(row.type.attributeSchema),
      variants,
      updatedAt: row.updatedAt.toISOString(),
    };
  });
}

export async function getLowStockCount(threshold: number): Promise<number> {
  return db.productVariant.count({
    where: { isActive: true, stock: { lte: threshold }, product: { status: "active" } },
  });
}

/** Unión propia (no el enum de Prisma) para que viaje a componentes cliente. */
export type AdminStockMovementType = "entry" | "exit" | "adjustment";

export interface AdminStockMovement {
  movementId: number;
  type: AdminStockMovementType;
  quantity: number;
  stockAfter: number;
  referenceType: string | null;
  referenceId: number | null;
  notes: string | null;
  createdBy: string | null;
  createdAt: string;
}

export interface AdminVariantRow extends AdminVariantSummary {
  /** Últimos movimientos, el más reciente primero. */
  recentMovements: AdminStockMovement[];
}

export interface AdminProductDetail {
  productId: number;
  version: number;
  typeId: number;
  categoryId: number | null;
  name: string;
  slug: string;
  description: string | null;
  attributes: AttributeValues;
  status: ProductStatus;
  featured: boolean;
  sortOrder: number;
  type: { typeId: number; name: string; attributeSchema: AttributeDef[] };
  categoryName: string | null;
  images: { imageId: number; url: string; alt: string | null; sortOrder: number }[];
  variants: AdminVariantRow[];
  updatedAt: string;
}

const RECENT_MOVEMENTS = 8;

/** Ficha completa de un producto para el admin (formulario + variantes). */
export async function getAdminProduct(productId: number): Promise<AdminProductDetail | null> {
  const row = await db.product.findUnique({
    where: { productId },
    include: {
      type: { select: { typeId: true, name: true, attributeSchema: true } },
      category: { select: { name: true } },
      images: { orderBy: { sortOrder: "asc" } },
      variants: {
        orderBy: [{ sortOrder: "asc" }, { variantId: "asc" }],
        include: {
          priceCurrency: VARIANT_CURRENCY_SELECT,
          stockMovements: {
            orderBy: { createdAt: "desc" },
            take: RECENT_MOVEMENTS,
            include: { createdBy: { select: { fullName: true } } },
          },
        },
      },
    },
  });
  if (!row) return null;

  const { rates, baseDecimals } = await loadRatesToBase();

  return {
    productId: row.productId,
    version: row.version,
    typeId: row.typeId,
    categoryId: row.categoryId,
    name: row.name,
    slug: row.slug,
    description: row.description,
    attributes: parseAttributeValues(row.attributes),
    status: row.status,
    featured: row.featured,
    sortOrder: row.sortOrder,
    type: {
      typeId: row.type.typeId,
      name: row.type.name,
      attributeSchema: parseAttributeSchema(row.type.attributeSchema),
    },
    categoryName: row.category?.name ?? null,
    images: row.images.map((i) => ({ imageId: i.imageId, url: i.url, alt: i.alt, sortOrder: i.sortOrder })),
    variants: row.variants.map((v) => ({
      ...toVariantSummary(v, rates, baseDecimals),
      recentMovements: v.stockMovements.map((m) => ({
        movementId: m.movementId,
        type: m.type,
        quantity: m.quantity,
        stockAfter: m.stockAfter,
        referenceType: m.referenceType,
        referenceId: m.referenceId,
        notes: m.notes,
        createdBy: m.createdBy?.fullName ?? null,
        createdAt: m.createdAt.toISOString(),
      })),
    })),
    updatedAt: row.updatedAt.toISOString(),
  };
}
