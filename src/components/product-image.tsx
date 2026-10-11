"use client";

import Image from "next/image";
import { useState } from "react";
import { ImageIcon } from "lucide-react";
import { imageSrc } from "@/lib/image-url";

/** Nombre de View Transition de la foto "activa": la card pulsada, el hueco
 *  del esqueleto de la ficha y la foto de la ficha lo comparten, así la foto
 *  viaja hasta su sitio en vez de desaparecer y reaparecer. Solo puede haber
 *  uno montado a la vez. */
export const PRODUCT_IMAGE_TRANSITION = "product-image-active";

interface ProductImageProps {
  src: string | null;
  alt: string;
  sizes: string;
  /** Texto para lectores de pantalla cuando no hay foto. */
  label?: string;
  /** true solo para imágenes above-the-fold (LCP): las precarga en vez de lazy-load. */
  priority?: boolean;
}

export function ProductImage({
  src,
  alt,
  sizes,
  label = "Sin foto",
  priority = false,
}: ProductImageProps) {
  const [failed, setFailed] = useState(false);

  if (src && !failed) {
    return (
      <Image
        // `/media/<clave>` tal cual o, si hay CDN propio, su URL (image-url.ts).
        src={imageSrc(src)}
        alt={alt}
        fill
        sizes={sizes}
        priority={priority}
        className="object-cover"
        onError={() => setFailed(true)}
      />
    );
  }
  return (
    <span className="flex items-center justify-center text-slate-300">
      <ImageIcon className="h-[26px] w-[26px]" strokeWidth={1.5} aria-hidden />
      <span className="sr-only">{label}</span>
    </span>
  );
}
