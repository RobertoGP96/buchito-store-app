import { z } from "zod";
import type { OrderStatus } from "@/modules/orders/lib/labels";
import type { ProductStatus } from "@/modules/products/lib/labels";

/** Mínimo de caracteres para consultar al servidor; por debajo solo se
 *  filtra la navegación en el cliente. */
export const SEARCH_MIN_LENGTH = 2;
export const SEARCH_MAX_LENGTH = 80;

export const adminSearchSchema = z.object({
  term: z.string().trim().min(SEARCH_MIN_LENGTH).max(SEARCH_MAX_LENGTH),
});

export type AdminSearchInput = z.infer<typeof adminSearchSchema>;

export interface SearchOrderHit {
  orderId: number;
  orderNo: string;
  customerName: string;
  status: OrderStatus;
  /** En base. */
  total: number;
}

export interface SearchCustomerHit {
  customerId: number;
  name: string;
  phone: string;
  email: string | null;
}

export interface SearchProductHit {
  productId: number;
  name: string;
  status: ProductStatus;
  /** SKU de la variante que coincidió, si la coincidencia fue por SKU. */
  sku: string | null;
}

export interface AdminSearchResult {
  orders: SearchOrderHit[];
  customers: SearchCustomerHit[];
  products: SearchProductHit[];
}

export const EMPTY_SEARCH_RESULT: AdminSearchResult = { orders: [], customers: [], products: [] };
