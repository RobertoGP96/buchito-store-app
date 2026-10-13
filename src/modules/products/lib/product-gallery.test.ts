import { describe, expect, it } from "vitest";
import { buildProductGallery, slideIndexForVariant, type GalleryProduct } from "./product-gallery";

function variant(
  variantId: number,
  name: string | null,
  imageUrl: string | null
): GalleryProduct["variants"][number] {
  return { variantId, name, imageUrl };
}

const shirt: GalleryProduct = {
  name: "Camisa",
  images: [
    { url: "/media/products/a.jpg", alt: "Camisa de frente" },
    { url: "/media/products/b.jpg", alt: null },
  ],
  variants: [
    variant(1, "Roja", "/media/products/roja.jpg"),
    variant(2, "Azul", null),
    variant(3, "Verde", "/media/products/b.jpg"),
  ],
};

describe("buildProductGallery", () => {
  it("pone la galería en su orden y detrás las fotos propias de las variantes", () => {
    const slides = buildProductGallery(shirt);
    expect(slides.map((s) => s.url)).toEqual([
      "/media/products/a.jpg",
      "/media/products/b.jpg",
      "/media/products/roja.jpg",
    ]);
  });

  it("usa el alt de la foto o, si falta, el nombre del producto y la variante", () => {
    const slides = buildProductGallery(shirt);
    expect(slides[0].alt).toBe("Camisa de frente");
    expect(slides[1].alt).toBe("Camisa");
    expect(slides[2].alt).toBe("Camisa · Roja");
  });

  it("asocia a la variante la foto de la galería que ya es suya, sin duplicarla", () => {
    const slides = buildProductGallery(shirt);
    expect(slides[1].variantIds).toEqual([3]);
    expect(slides[1].caption).toBe("Verde");
    expect(slides[2].variantIds).toEqual([1]);
    expect(slides[2].caption).toBe("Roja");
    expect(slides[0].variantIds).toEqual([]);
    expect(slides[0].caption).toBeNull();
  });

  it("no rotula una foto compartida por varias variantes ni la de una variante sin nombre", () => {
    const shared = buildProductGallery({
      name: "Arroz",
      images: [{ url: "/media/products/arroz.jpg", alt: null }],
      variants: [
        variant(1, "1 kg", "/media/products/arroz.jpg"),
        variant(2, "5 kg", "/media/products/arroz.jpg"),
      ],
    });
    expect(shared).toHaveLength(1);
    expect(shared[0].variantIds).toEqual([1, 2]);
    expect(shared[0].caption).toBeNull();

    const single = buildProductGallery({
      name: "Aceite",
      images: [],
      variants: [variant(9, null, "/media/products/aceite.jpg")],
    });
    expect(single).toHaveLength(1);
    expect(single[0].caption).toBeNull();
    expect(single[0].alt).toBe("Aceite");
  });

  it("ignora URLs repetidas en la galería y devuelve vacío sin fotos", () => {
    const dup = buildProductGallery({
      name: "X",
      images: [
        { url: "/media/products/x.jpg", alt: null },
        { url: "/media/products/x.jpg", alt: "otra" },
      ],
      variants: [],
    });
    expect(dup).toHaveLength(1);
    expect(buildProductGallery({ name: "Y", images: [], variants: [variant(1, null, null)] })).toEqual([]);
  });
});

describe("slideIndexForVariant", () => {
  it("encuentra la diapositiva de la variante y -1 si no tiene foto", () => {
    const slides = buildProductGallery(shirt);
    expect(slideIndexForVariant(slides, 1)).toBe(2);
    expect(slideIndexForVariant(slides, 3)).toBe(1);
    expect(slideIndexForVariant(slides, 2)).toBe(-1);
  });
});
