"use client";

import Link from "next/link";
import { Drawer } from "@heroui/react";
import { ArrowUpRight } from "lucide-react";
import { ImageCarousel } from "@/components/image-carousel";
import { useIsDesktop } from "@/lib/use-is-desktop";
import { cn } from "@/lib/utils";
import {
  ProductAddControls,
  ProductAvailability,
  ProductBadges,
  ProductDescription,
  ProductPrice,
  ProductSpecs,
  ProductVariantPicker,
  useProductSelection,
} from "./product-detail-parts";
import type { CatalogProduct } from "../queries/catalog-queries";

interface ProductDrawerProps {
  open: boolean;
  product: CatalogProduct | null;
  /** Cierre iniciado en el drawer: X, fondo, Escape, arrastre o tras añadir. */
  onClose: () => void;
  /** Un enlace del drawer navega: se cierra sin tocar el historial. */
  onNavigate: () => void;
}

/** Ficha rápida del producto: hoja inferior en móvil, panel lateral en
 *  desktop. Carrusel de fotos arriba, datos en el cuerpo desplazable y la
 *  barra de añadir fija al pie. Lo abre `ProductDrawerProvider`. */
export function ProductDrawer({ open, product, onClose, onNavigate }: ProductDrawerProps) {
  const desktop = useIsDesktop();
  return (
    <Drawer
      isOpen={open}
      onOpenChange={(next) => {
        if (!next) onClose();
      }}
    >
      <Drawer.Backdrop>
        <Drawer.Content placement={desktop ? "right" : "bottom"}>
          <Drawer.Dialog
            className={cn(
              "bg-canvas p-0",
              desktop ? "h-full w-[480px] max-w-[92vw] rounded-l-sheet" : "max-h-[92dvh] rounded-t-sheet"
            )}
          >
            {product && (
              <ProductDrawerContent
                key={product.productId}
                product={product}
                desktop={desktop}
                onClose={onClose}
                onNavigate={onNavigate}
              />
            )}
          </Drawer.Dialog>
        </Drawer.Content>
      </Drawer.Backdrop>
    </Drawer>
  );
}

function ProductDrawerContent({
  product,
  desktop,
  onClose,
  onNavigate,
}: {
  product: CatalogProduct;
  desktop: boolean;
  onClose: () => void;
  onNavigate: () => void;
}) {
  const selection = useProductSelection(product);
  const { variant, soldOut } = selection;

  return (
    <>
      {!desktop && <Drawer.Handle className="pt-2.5 pb-1.5" />}
      <Drawer.CloseTrigger
        aria-label="Cerrar"
        className="z-10 h-9 w-9 rounded-full bg-canvas/90 text-ink shadow-card hover:bg-canvas"
      />

      <Drawer.Body className="m-0 p-0 text-[14px] text-ink">
        <ImageCarousel
          images={selection.slides}
          index={selection.slide}
          onIndexChange={selection.setSlide}
          label={`Fotos de ${product.name}`}
          sizes={desktop ? "480px" : "100vw"}
          indicator="dots"
          overlay={<ProductBadges product={product} variant={variant} soldOut={soldOut} />}
        />

        <div className="flex min-w-0 flex-col px-5 pt-4 pb-6">
          {product.categoryName && (
            <Link
              href={`/catalogo?cat=${product.categorySlug}`}
              onClick={onNavigate}
              className="eyebrow self-start hover:text-navy-700"
            >
              {product.categoryName}
            </Link>
          )}
          <Drawer.Heading className="font-display mt-2 text-[22px] leading-[1.15] text-navy-900">
            {product.name}
          </Drawer.Heading>
          <ProductPrice variant={variant} className="mt-3" />
          <ProductAvailability variant={variant} className="mt-2" />
          <ProductVariantPicker
            product={product}
            variant={variant}
            onSelect={selection.selectVariant}
            className="mt-5"
          />
          <ProductDescription product={product} className="mt-6" />
          <ProductSpecs product={product} variant={variant} className="mt-5" />
          <Link
            href={`/producto/${encodeURIComponent(product.slug)}`}
            onClick={onNavigate}
            className="nav-label mt-6 inline-flex items-center gap-1 self-start text-navy-700 hover:underline"
          >
            Ver ficha completa
            <ArrowUpRight className="h-4 w-4" strokeWidth={2} aria-hidden />
          </Link>
        </div>
      </Drawer.Body>

      <div className="border-t border-line px-5 pt-3 pb-[max(12px,env(safe-area-inset-bottom))]">
        <ProductAddControls selection={selection} onAdded={onClose} buttonClassName="flex-1" />
      </div>
    </>
  );
}
