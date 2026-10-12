import "server-only";
import { Prisma } from "@/generated/prisma";
import { getRatesToBase, type BaseCurrencyInfo, type DbOrTx, type RateSnapshot } from "@/lib/currency";
import { roundToCurrency } from "@/lib/currency-math";
import { decimalToNullableNumber, decimalToNumber } from "@/lib/money";
import {
  parseAttributeSchema,
  parseAttributeValues,
  variantLabel,
  type AttributeValues,
} from "@/modules/products/lib/attribute-schema";
import type { SaleUnit } from "@/modules/products/lib/units";

/** Variante tal como la necesita `createOrder` para snapshotear la línea.
 *  El precio va en su moneda original; la conversión a base la hace la
 *  action con `rateToBase` (null = sin tasa configurada ⇒ no se vende). */
export interface OrderVariantRow {
  variantId: number;
  productId: number;
  productName: string;
  productSlug: string;
  variantName: string | null;
  sku: string;
  attributes: AttributeValues;
  imageUrl: string | null;
  unit: SaleUnit;
  /** Mínimo vendible: la cantidad pedida debe ser múltiplo. */
  qtyStep: number;
  stock: number;
  origUnitPrice: number;
  priceCurrency: { currencyId: number; code: string };
  /** Base por 1 unidad de la moneda del precio (1 si ya está en base). */
  rateToBase: number | null;
  /** Costo de compra por unidad convertido a base; null sin costo o sin tasa. */
  costBase: number | null;
}

const VARIANT_INCLUDE = {
  priceCurrency: { select: { currencyId: true, code: true } },
  product: {
    select: {
      productId: true,
      name: true,
      slug: true,
      status: true,
      type: { select: { attributeSchema: true } },
      images: { orderBy: { sortOrder: "asc" as const }, take: 1, select: { url: true } },
    },
  },
} satisfies Prisma.ProductVariantInclude;

export interface OrderVariantsResult {
  variants: OrderVariantRow[];
  /** Tasas vigentes a base leídas en esta misma consulta; la action las reutiliza
   *  para la moneda de pago y así el pedido no mezcla dos lecturas distintas. */
  rates: Map<number, RateSnapshot>;
}

/** Variantes vendibles (activas y de producto activo) de un pedido, con la
 *  tasa vigente leída UNA vez dentro de la misma transacción. Las que no
 *  existen o no se venden simplemente no aparecen: la action decide el error. */
export async function getOrderVariants(
  client: DbOrTx,
  variantIds: number[],
  base: BaseCurrencyInfo
): Promise<OrderVariantsResult> {
  // Secuencial a propósito: dentro de una tx interactiva no se paralelizan consultas.
  const rows =
    variantIds.length === 0
      ? []
      : await client.productVariant.findMany({
          where: { variantId: { in: variantIds }, isActive: true, product: { status: "active" } },
          include: VARIANT_INCLUDE,
        });
  const { rates } = await getRatesToBase(client, base);

  const variants = rows.map((v) => {
    const schema = parseAttributeSchema(v.product.type.attributeSchema);
    const attributes = parseAttributeValues(v.attributes);
    const label = Object.keys(attributes).length ? variantLabel(schema, attributes) : "";
    const cost = decimalToNullableNumber(v.cost);
    const costRate = v.costCurrencyId != null ? rates.get(v.costCurrencyId)?.rate : undefined;
    return {
      variantId: v.variantId,
      productId: v.product.productId,
      productName: v.product.name,
      productSlug: v.product.slug,
      variantName: v.name ?? (label || null),
      sku: v.sku,
      attributes,
      // La imagen propia de la variante manda; si no tiene, la primera del producto.
      imageUrl: v.imageUrl ?? v.product.images[0]?.url ?? null,
      unit: v.unit,
      qtyStep: decimalToNumber(v.qtyStep),
      stock: decimalToNumber(v.stock),
      origUnitPrice: decimalToNumber(v.price),
      priceCurrency: { currencyId: v.priceCurrency.currencyId, code: v.priceCurrency.code },
      rateToBase: rates.get(v.priceCurrencyId)?.rate ?? null,
      costBase: cost != null && costRate != null ? roundToCurrency(cost * costRate, base.decimalPlaces) : null,
    };
  });
  return { variants, rates };
}
