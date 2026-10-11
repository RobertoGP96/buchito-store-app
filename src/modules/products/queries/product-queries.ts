import "server-only";
import { db } from "@/lib/db";
import { BaseCurrencyNotConfiguredError, getBaseCurrency, getRatesToBase } from "@/lib/currency";
import { roundToCurrency } from "@/lib/currency-math";
import { decimalToNumber } from "@/lib/money";
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
  updatedAt: string;
}

export async function getAdminProducts(): Promise<AdminProductRow[]> {
  let rates = new Map<number, { rate: number }>();
  let baseDecimals = 0;
  try {
    const base = await getBaseCurrency(db);
    baseDecimals = base.decimalPlaces;
    rates = (await getRatesToBase(db, base)).rates;
  } catch (error) {
    if (!(error instanceof BaseCurrencyNotConfiguredError)) throw error;
  }

  const rows = await db.product.findMany({
    orderBy: [{ updatedAt: "desc" }],
    include: {
      type: { select: { name: true } },
      category: { select: { name: true } },
      images: { orderBy: { sortOrder: "asc" }, take: 1 },
      variants: { where: { isActive: true }, select: { price: true, priceCurrencyId: true, stock: true, imageUrl: true } },
    },
  });

  return rows.map((row) => {
    let minPrice: number | null = null;
    let hasMissingRate = false;
    for (const v of row.variants) {
      const rate = rates.get(v.priceCurrencyId);
      if (!rate) {
        hasMissingRate = true;
        continue;
      }
      const price = roundToCurrency(decimalToNumber(v.price) * rate.rate, baseDecimals);
      minPrice = minPrice == null ? price : Math.min(minPrice, price);
    }
    return {
      productId: row.productId,
      slug: row.slug,
      name: row.name,
      typeName: row.type.name,
      categoryName: row.category?.name ?? null,
      status: row.status,
      featured: row.featured,
      variantCount: row.variants.length,
      totalStock: row.variants.reduce((sum, v) => sum + v.stock, 0),
      minPrice,
      hasMissingRate,
      imageUrl: row.images[0]?.url ?? row.variants.find((v) => v.imageUrl)?.imageUrl ?? null,
      updatedAt: row.updatedAt.toISOString(),
    };
  });
}

export async function getLowStockCount(threshold: number): Promise<number> {
  return db.productVariant.count({
    where: { isActive: true, stock: { lte: threshold }, product: { status: "active" } },
  });
}
