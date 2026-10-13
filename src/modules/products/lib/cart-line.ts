import type { CartLine } from "@/modules/cart/store";
import type { CatalogProduct, CatalogVariant } from "../queries/catalog-queries";

/** Línea de carrito a partir de lo que la tienda ya tiene en memoria: la card,
 *  la ficha y el drawer añaden con los mismos campos. */
export function cartLineFor(product: CatalogProduct, variant: CatalogVariant): Omit<CartLine, "qty"> {
  return {
    variantId: variant.variantId,
    productId: product.productId,
    slug: product.slug,
    name: product.name,
    variantName: variant.name,
    sku: variant.sku,
    imageUrl: variant.imageUrl ?? product.imageUrl,
    unitPrice: variant.price,
    compareAtPrice: variant.compareAtPrice,
    unit: variant.unit,
    qtyStep: variant.qtyStep,
    stock: variant.stock,
  };
}
