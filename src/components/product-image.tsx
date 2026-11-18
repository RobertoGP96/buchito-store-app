"use client";

import Image from "next/image";
import { useState } from "react";
import { imageSrc } from "@/lib/image-url";

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
        // `priority` solo quita el lazy y precarga; la prioridad de red alta
        // para la candidata a LCP hay que pedirla aparte.
        fetchPriority={priority ? "high" : undefined}
        className="object-cover"
        onError={() => setFailed(true)}
      />
    );
  }
  return (
    // Sin foto: el isotipo en marca de agua. Un icono genérico de imagen hacía
    // que la card pareciera rota.
    <span className="flex h-full w-full items-center justify-center">
      <Image
        src="/brand/logo-mark.png"
        alt=""
        width={96}
        height={96}
        className="h-auto w-[34%] max-w-[72px] opacity-25"
      />
      <span className="sr-only">{label}</span>
    </span>
  );
}
