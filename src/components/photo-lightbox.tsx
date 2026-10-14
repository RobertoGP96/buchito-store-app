"use client";

import { Modal } from "@heroui/react";

interface PhotoLightboxProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  src: string;
  alt: string;
  title?: string;
  /** Texto bajo la foto (fecha, pedido…). */
  caption?: React.ReactNode;
}

/** Visor de una foto a pantalla completa, sin salir de la vista actual.
 *  La imagen se ajusta al alto disponible y conserva su proporción. */
export function PhotoLightbox({ open, onOpenChange, src, alt, title, caption }: PhotoLightboxProps) {
  return (
    <Modal isOpen={open} onOpenChange={onOpenChange}>
      <Modal.Backdrop>
        <Modal.Container size="lg">
          <Modal.Dialog className="bg-canvas">
            <Modal.CloseTrigger />
            {title && (
              <Modal.Header>
                <Modal.Heading className="font-display text-[20px] text-navy-900">{title}</Modal.Heading>
              </Modal.Header>
            )}
            <Modal.Body className="flex flex-col items-center gap-3">
              <div className="flex w-full items-center justify-center overflow-hidden rounded-field bg-page">
                {/* eslint-disable-next-line @next/next/no-img-element -- foto del bucket servida por /media, sin optimizar */}
                <img src={src} alt={alt} className="max-h-[75dvh] w-auto max-w-full object-contain" />
              </div>
              {caption && <p className="tabular text-[12.5px] text-slate-500">{caption}</p>}
            </Modal.Body>
          </Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>
    </Modal>
  );
}
