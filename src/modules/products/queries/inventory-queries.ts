import "server-only";
import { db } from "@/lib/db";
import type { CurrencyInfo } from "@/lib/format";
import { decimalToNumber } from "@/lib/money";
import { getStoreSettings } from "@/modules/settings/queries/settings-queries";
import type { ProductStatus } from "../lib/labels";
import type { AdminStockMovementType } from "./product-queries";

export interface InventoryRow {
  productId: number;
  productName: string;
  productStatus: ProductStatus;
  variantId: number;
  variantName: string | null;
  sku: string;
  stock: number;
  /** stock ≤ lowStockThreshold de la tienda (incluye agotado). */
  isLow: boolean;
  /** Precio en SU moneda, sin convertir. */
  price: number;
  priceCurrency: CurrencyInfo;
  updatedAt: string;
}

export interface InventoryFilter {
  q?: string;
  low?: boolean;
}

/** Variantes activas con su producto, ordenadas por stock ascendente. */
export async function getInventory({ q, low }: InventoryFilter = {}): Promise<InventoryRow[]> {
  const settings = await getStoreSettings();
  const threshold = settings.lowStockThreshold;
  const term = q?.trim();

  const rows = await db.productVariant.findMany({
    where: {
      isActive: true,
      ...(low ? { stock: { lte: threshold } } : {}),
      ...(term
        ? {
            OR: [
              { sku: { contains: term, mode: "insensitive" } },
              { name: { contains: term, mode: "insensitive" } },
              { product: { name: { contains: term, mode: "insensitive" } } },
            ],
          }
        : {}),
    },
    orderBy: [{ stock: "asc" }, { product: { name: "asc" } }, { sortOrder: "asc" }],
    include: {
      product: { select: { productId: true, name: true, status: true } },
      priceCurrency: { select: { currencyId: true, code: true, symbol: true, decimalPlaces: true } },
    },
  });

  return rows.map((v) => ({
    productId: v.product.productId,
    productName: v.product.name,
    productStatus: v.product.status,
    variantId: v.variantId,
    variantName: v.name,
    sku: v.sku,
    stock: v.stock,
    isLow: v.stock <= threshold,
    price: decimalToNumber(v.price),
    priceCurrency: v.priceCurrency,
    updatedAt: v.updatedAt.toISOString(),
  }));
}

export interface StockMovementRow {
  movementId: number;
  variantId: number;
  productId: number;
  productName: string;
  variantName: string | null;
  sku: string;
  type: AdminStockMovementType;
  quantity: number;
  stockAfter: number;
  referenceType: string | null;
  referenceId: number | null;
  /** Folio del pedido cuando referenceType === "order". */
  orderNo: string | null;
  notes: string | null;
  createdBy: string | null;
  createdAt: string;
}

export interface StockMovementFilter {
  variantId?: number;
  limit?: number;
}

/** Kardex: movimientos del más reciente al más antiguo. */
export async function getStockMovements({ variantId, limit = 100 }: StockMovementFilter = {}): Promise<StockMovementRow[]> {
  const rows = await db.stockMovement.findMany({
    where: variantId ? { variantId } : undefined,
    orderBy: [{ createdAt: "desc" }, { movementId: "desc" }],
    take: limit,
    include: {
      variant: { select: { sku: true, name: true, product: { select: { productId: true, name: true } } } },
      createdBy: { select: { fullName: true } },
    },
  });

  const orderIds = [
    ...new Set(
      rows
        .filter((m) => m.referenceType === "order" && m.referenceId != null)
        .map((m) => m.referenceId as number)
    ),
  ];
  const orders = orderIds.length
    ? await db.order.findMany({ where: { orderId: { in: orderIds } }, select: { orderId: true, orderNo: true } })
    : [];
  const orderNoById = new Map(orders.map((o) => [o.orderId, o.orderNo]));

  return rows.map((m) => ({
    movementId: m.movementId,
    variantId: m.variantId,
    productId: m.variant.product.productId,
    productName: m.variant.product.name,
    variantName: m.variant.name,
    sku: m.variant.sku,
    type: m.type,
    quantity: m.quantity,
    stockAfter: m.stockAfter,
    referenceType: m.referenceType,
    referenceId: m.referenceId,
    orderNo:
      m.referenceType === "order" && m.referenceId != null ? (orderNoById.get(m.referenceId) ?? null) : null,
    notes: m.notes,
    createdBy: m.createdBy?.fullName ?? null,
    createdAt: m.createdAt.toISOString(),
  }));
}
