import type { CatalogProduct, CatalogVariant } from "../queries/catalog-queries";

/** Una foto del carrusel de la ficha. `variantIds` son las variantes cuya
 *  foto es exactamente esta: al elegir una de ellas el carrusel salta aquí. */
export interface GallerySlide {
  url: string;
  alt: string;
  variantIds: number[];
  /** Nombre de la variante retratada; solo cuando la foto es de UNA variante
   *  con nombre, para no rotular con una sola lo que comparten varias. */
  caption: string | null;
}

export type GalleryProduct = Pick<CatalogProduct, "name" | "images"> & {
  variants: Pick<CatalogVariant, "variantId" | "name" | "imageUrl">[];
};

/** Fotos de la galería del producto, en su orden, y detrás las propias de
 *  cada variante que no estén ya (las variantes llegan con la predeterminada
 *  primero). Sin URLs repetidas: una variante cuya foto ya está en la galería
 *  se asocia a esa diapositiva en vez de duplicarla. */
export function buildProductGallery(product: GalleryProduct): GallerySlide[] {
  const slides: GallerySlide[] = [];
  const byUrl = new Map<string, GallerySlide>();

  for (const image of product.images) {
    if (byUrl.has(image.url)) continue;
    const slide: GallerySlide = {
      url: image.url,
      alt: image.alt?.trim() || product.name,
      variantIds: [],
      caption: null,
    };
    slides.push(slide);
    byUrl.set(image.url, slide);
  }

  for (const variant of product.variants) {
    if (!variant.imageUrl) continue;
    const existing = byUrl.get(variant.imageUrl);
    if (existing) {
      existing.variantIds.push(variant.variantId);
      continue;
    }
    const slide: GallerySlide = {
      url: variant.imageUrl,
      alt: variant.name ? `${product.name} · ${variant.name}` : product.name,
      variantIds: [variant.variantId],
      caption: null,
    };
    slides.push(slide);
    byUrl.set(variant.imageUrl, slide);
  }

  for (const slide of slides) {
    if (slide.variantIds.length !== 1) continue;
    const variant = product.variants.find((v) => v.variantId === slide.variantIds[0]);
    slide.caption = variant?.name ?? null;
  }

  return slides;
}

/** Diapositiva con la foto de la variante, o -1 si no tiene foto propia. */
export function slideIndexForVariant(slides: GallerySlide[], variantId: number): number {
  return slides.findIndex((slide) => slide.variantIds.includes(variantId));
}
