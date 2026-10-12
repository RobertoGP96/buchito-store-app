import "server-only";
import { cache } from "react";
import { unstable_cache } from "next/cache";
import { db } from "@/lib/db";
import { CACHE_FALLBACK_SECONDS, CACHE_TAGS } from "@/lib/cache-tags";
import { Prisma } from "@/generated/prisma";
import { BaseCurrencyNotConfiguredError, getBaseCurrencyCached, getRatesToBaseCached } from "@/lib/currency";
import { roundToCurrency } from "@/lib/currency-math";
import type { CurrencyInfo } from "@/lib/format";
import { decimalToNullableNumber, decimalToNumber } from "@/lib/money";
import {
  parseAttributeSchema,
  parseAttributeValues,
  variantLabel,
  type AttributeDef,
  type AttributeValues,
} from "../lib/attribute-schema";
import type { SaleUnit } from "../lib/units";

/** Variante tal como la ve la tienda: precios YA en moneda base. */
export interface CatalogVariant {
  variantId: number;
  sku: string;
  name: string | null;
  attributes: AttributeValues;
  price: number;
  compareAtPrice: number | null;
  /** Precio en su moneda original, solo informativo ("12.50 USD"). */
  origPrice: number;
  origCurrency: CurrencyInfo;
  /** Unidad de venta: el precio es por 1 unidad de ella. */
  unit: SaleUnit;
  /** Mínimo vendible y paso del selector, en `unit`. */
  qtyStep: number;
  stock: number;
  imageUrl: string | null;
  isDefault: boolean;
}

export interface CatalogProduct {
  productId: number;
  slug: string;
  name: string;
  description: string | null;
  categoryName: string | null;
  categorySlug: string | null;
  attributes: AttributeValues;
  /** Definiciones de atributos del tipo, para pintar ficha y selector. */
  attributeSchema: AttributeDef[];
  featured: boolean;
  imageUrl: string | null;
  images: { url: string; alt: string | null }[];
  variants: CatalogVariant[];
  /** Resumen de la variante por defecto para la card. */
  defaultVariant: CatalogVariant;
  totalStock: number;
}

export interface CatalogCategory {
  categoryId: number;
  name: string;
  slug: string;
  parentId: number | null;
}

const PRODUCT_INCLUDE = {
  type: { select: { attributeSchema: true } },
  category: { select: { name: true, slug: true } },
  images: { orderBy: { sortOrder: "asc" as const } },
  variants: {
    where: { isActive: true },
    orderBy: [{ isDefault: "desc" as const }, { sortOrder: "asc" as const }],
    include: { priceCurrency: true },
  },
} satisfies Prisma.ProductInclude;

type ProductRow = Prisma.ProductGetPayload<{ include: typeof PRODUCT_INCLUDE }>;

interface RateContext {
  base: CurrencyInfo;
  rates: Map<number, { rate: number }>;
}

// generateMetadata y la página del producto lo piden en el mismo request.
const getRateContext = cache(async (): Promise<RateContext | null> => {
  try {
    const base = await getBaseCurrencyCached();
    const { rates } = await getRatesToBaseCached();
    return { base, rates };
  } catch (error) {
    if (!(error instanceof BaseCurrencyNotConfiguredError)) console.error("getRateContext:", error);
    return null;
  }
});

/** Convierte un producto de DB a `CatalogProduct`. Devuelve null si ninguna
 *  variante tiene tasa a base (no se puede mostrar un precio). */
function toCatalogProduct(row: ProductRow, ctx: RateContext): CatalogProduct | null {
  const schema = parseAttributeSchema(row.type.attributeSchema);
  const variants: CatalogVariant[] = [];

  for (const v of row.variants) {
    const rate = ctx.rates.get(v.priceCurrencyId);
    if (!rate) {
      console.warn(`Variante ${v.sku} sin tasa ${v.priceCurrency.code} → ${ctx.base.code}; omitida del catálogo`);
      continue;
    }
    const attributes = parseAttributeValues(v.attributes);
    const price = decimalToNumber(v.price);
    const compareAt = decimalToNullableNumber(v.compareAtPrice);
    variants.push({
      variantId: v.variantId,
      sku: v.sku,
      name: v.name ?? (Object.keys(attributes).length ? variantLabel(schema, attributes) : null),
      attributes,
      price: roundToCurrency(price * rate.rate, ctx.base.decimalPlaces),
      compareAtPrice:
        compareAt == null ? null : roundToCurrency(compareAt * rate.rate, ctx.base.decimalPlaces),
      origPrice: price,
      origCurrency: {
        currencyId: v.priceCurrency.currencyId,
        code: v.priceCurrency.code,
        symbol: v.priceCurrency.symbol,
        decimalPlaces: v.priceCurrency.decimalPlaces,
      },
      unit: v.unit,
      qtyStep: decimalToNumber(v.qtyStep),
      stock: decimalToNumber(v.stock),
      imageUrl: v.imageUrl,
      isDefault: v.isDefault,
    });
  }

  if (variants.length === 0) return null;
  const defaultVariant = variants.find((v) => v.isDefault) ?? variants[0];
  const images = row.images.map((i) => ({ url: i.url, alt: i.alt }));

  return {
    productId: row.productId,
    slug: row.slug,
    name: row.name,
    description: row.description,
    categoryName: row.category?.name ?? null,
    categorySlug: row.category?.slug ?? null,
    attributes: parseAttributeValues(row.attributes),
    attributeSchema: schema,
    featured: row.featured,
    imageUrl: images[0]?.url ?? defaultVariant.imageUrl ?? null,
    images,
    variants,
    defaultVariant,
    totalStock: variants.reduce((sum, v) => sum + v.stock, 0),
  };
}

export interface CatalogFilters {
  q?: string;
  category?: string;
  featured?: boolean;
  /** Solo productos con alguna variante rebajada (precio anterior tachado). */
  onSale?: boolean;
  /** `newest`: los publicados más recientemente primero (portada). */
  sort?: "default" | "newest";
  limit?: number;
}

export async function getCatalogProducts(filters: CatalogFilters = {}): Promise<CatalogProduct[]> {
  const ctx = await getRateContext();
  if (!ctx) return [];

  const where: Prisma.ProductWhereInput = { status: "active" };
  if (filters.featured) where.featured = true;
  // El CHECK de la DB garantiza compare_at_price > price: basta con que exista.
  if (filters.onSale) where.variants = { some: { isActive: true, compareAtPrice: { not: null } } };
  if (filters.category) {
    // Una categoría padre incluye los productos de sus hijas directas.
    where.category = {
      OR: [{ slug: filters.category }, { parent: { slug: filters.category } }],
    };
  }
  if (filters.q?.trim()) {
    const q = filters.q.trim();
    where.OR = [
      { name: { contains: q, mode: "insensitive" } },
      { description: { contains: q, mode: "insensitive" } },
      { variants: { some: { sku: { contains: q, mode: "insensitive" } } } },
    ];
  }

  const rows = await db.product.findMany({
    where,
    include: PRODUCT_INCLUDE,
    orderBy:
      filters.sort === "newest"
        ? [{ createdAt: "desc" }, { productId: "desc" }]
        : [{ featured: "desc" }, { sortOrder: "asc" }, { name: "asc" }],
    take: filters.limit,
  });

  const products = rows.map((row) => toCatalogProduct(row, ctx)).filter((p): p is CatalogProduct => p !== null);
  if (!filters.onSale) return products;
  // La variante rebajada pudo quedar fuera por falta de tasa: se comprueba
  // sobre lo que realmente se muestra.
  return products.filter((p) => p.variants.some((v) => v.compareAtPrice != null && v.compareAtPrice > v.price));
}

export async function getFeaturedProducts(limit = 8): Promise<CatalogProduct[]> {
  return getCatalogProducts({ featured: true, limit });
}

/** Últimos productos añadidos al catálogo, el más nuevo primero. */
export async function getNewestProducts(limit = 8): Promise<CatalogProduct[]> {
  return getCatalogProducts({ sort: "newest", limit });
}

export async function getOnSaleProducts(limit?: number): Promise<CatalogProduct[]> {
  return getCatalogProducts({ onSale: true, limit });
}

export async function getProductBySlug(slug: string): Promise<CatalogProduct | null> {
  const ctx = await getRateContext();
  if (!ctx) return null;
  const row = await db.product.findFirst({
    where: { slug, status: "active" },
    include: PRODUCT_INCLUDE,
  });
  return row ? toCatalogProduct(row, ctx) : null;
}

/** En la Data Cache: el árbol cambia solo desde el admin (revalidateTag). */
export const getCatalogCategories = unstable_cache(
  (): Promise<CatalogCategory[]> =>
    db.category.findMany({
      where: { isActive: true },
      orderBy: [{ parentId: "asc" }, { sortOrder: "asc" }, { name: "asc" }],
      select: { categoryId: true, name: true, slug: true, parentId: true },
    }),
  ["catalog-categories"],
  { tags: [CACHE_TAGS.categories], revalidate: CACHE_FALLBACK_SECONDS }
);
