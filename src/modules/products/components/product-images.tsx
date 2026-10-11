"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button, toast } from "@heroui/react";
import { ChevronLeft, ChevronRight, Star, Trash2 } from "lucide-react";
import { ImageUploader } from "@/components/image-uploader";
import { ProductImage } from "@/components/product-image";
import { addProductImage, deleteProductImage, reorderProductImages } from "../actions/product-image-actions";
import { cn } from "@/lib/utils";

interface ProductImagesProps {
  productId: number;
  images: { imageId: number; url: string; alt: string | null; sortOrder: number }[];
}

/** Galería del producto: subir, ordenar (la primera es la portada) y borrar.
 *  Las fotos de cada variante se gestionan en su propio formulario. */
export function ProductImages({ productId, images }: ProductImagesProps) {
  const router = useRouter();
  const [busy, setBusy] = useState<number | null>(null);

  const run = async (imageId: number, task: () => Promise<{ success: boolean; error?: string }>, ok: string) => {
    setBusy(imageId);
    try {
      const result = await task();
      if (!result.success) {
        toast.danger(result.error ?? "No se pudo completar");
        return;
      }
      toast.success(ok);
      router.refresh();
    } catch (error) {
      console.error("ProductImages:", error);
      toast.danger("No se pudo completar la operación");
    } finally {
      setBusy(null);
    }
  };

  const move = (index: number, dir: -1 | 1) => {
    const ids = images.map((i) => i.imageId);
    const target = index + dir;
    if (target < 0 || target >= ids.length) return;
    [ids[index], ids[target]] = [ids[target], ids[index]];
    void run(images[index].imageId, () => reorderProductImages(productId, ids), "Orden actualizado");
  };

  return (
    <section className="rounded-card bg-canvas p-5 shadow-card">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="eyebrow">Fotos del producto</p>
          <p className="mt-1 text-[12.5px] text-slate-400">
            La primera es la portada en el catálogo. Hasta 10 fotos.
          </p>
        </div>
        {images.length > 0 && (
          <ImageUploader
            scope={`product-${productId}`}
            multiple
            label="Añadir fotos"
            onUploaded={async (url) => {
              const result = await addProductImage({ productId, url });
              if (!result.success) throw new Error(result.error);
              router.refresh();
            }}
          />
        )}
      </div>

      {images.length === 0 ? (
        <ImageUploader
          className="mt-4"
          scope={`product-${productId}`}
          multiple
          variant="dropzone"
          label="Arrastra fotos aquí o haz clic para elegirlas"
          onUploaded={async (url) => {
            const result = await addProductImage({ productId, url });
            if (!result.success) throw new Error(result.error);
            router.refresh();
          }}
        />
      ) : (
        <ul className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
          {images.map((image, index) => (
            <li key={image.imageId} className="group relative">
              <div
                className={cn(
                  "relative aspect-square overflow-hidden rounded-field bg-cream",
                  index === 0 && "ring-2 ring-navy-700 ring-offset-2 ring-offset-canvas"
                )}
              >
                <span className="absolute inset-0 flex items-center justify-center">
                  <ProductImage src={image.url} alt={image.alt ?? ""} sizes="(max-width: 640px) 50vw, 200px" />
                </span>
                {index === 0 && (
                  <span className="absolute top-2 left-2 inline-flex items-center gap-1 rounded-full bg-navy-700 px-2 py-1 text-[10.5px] font-semibold text-on-brand">
                    <Star className="h-3 w-3" strokeWidth={2.2} />
                    Portada
                  </span>
                )}
              </div>
              <div className="mt-1.5 flex items-center justify-between gap-1">
                <div className="flex gap-0.5">
                  <Button
                    variant="ghost"
                    size="sm"
                    isIconOnly
                    aria-label="Mover antes"
                    isDisabled={index === 0 || busy !== null}
                    onPress={() => move(index, -1)}
                  >
                    <ChevronLeft className="h-4 w-4" strokeWidth={2} />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    isIconOnly
                    aria-label="Mover después"
                    isDisabled={index === images.length - 1 || busy !== null}
                    onPress={() => move(index, 1)}
                  >
                    <ChevronRight className="h-4 w-4" strokeWidth={2} />
                  </Button>
                </div>
                <Button
                  variant="danger-soft"
                  size="sm"
                  isIconOnly
                  aria-label="Eliminar foto"
                  isPending={busy === image.imageId}
                  isDisabled={busy !== null}
                  onPress={() => void run(image.imageId, () => deleteProductImage(image.imageId), "Foto eliminada")}
                >
                  <Trash2 className="h-4 w-4" strokeWidth={1.9} />
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
