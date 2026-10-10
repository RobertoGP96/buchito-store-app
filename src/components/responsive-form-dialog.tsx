"use client";

import { Drawer, Modal } from "@heroui/react";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

interface ResponsiveFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  children: React.ReactNode;
  /** Botones al pie (normalmente los del formulario, con `form="id"`). */
  footer?: React.ReactNode;
  size?: "sm" | "md" | "lg";
  className?: string;
}

function useIsDesktop() {
  // El primer render (servidor) asume móvil: hoja inferior. El diálogo solo
  // se monta abierto en cliente, así que no hay salto visible.
  const [desktop, setDesktop] = useState(false);
  useEffect(() => {
    const media = window.matchMedia("(min-width: 768px)");
    const sync = () => setDesktop(media.matches);
    sync();
    media.addEventListener("change", sync);
    return () => media.removeEventListener("change", sync);
  }, []);
  return desktop;
}

/** Hoja inferior en móvil, diálogo centrado en desktop. Para todo formulario
 *  de alta/edición del admin. El consumidor controla `open`. */
export function ResponsiveFormDialog({
  open,
  onOpenChange,
  title,
  description,
  children,
  footer,
  size = "md",
  className,
}: ResponsiveFormDialogProps) {
  const desktop = useIsDesktop();

  if (desktop) {
    return (
      <Modal isOpen={open} onOpenChange={onOpenChange}>
        <Modal.Backdrop>
          <Modal.Container size={size}>
            <Modal.Dialog className={cn("bg-canvas", className)}>
              <Modal.CloseTrigger />
              <Modal.Header>
                <Modal.Heading className="font-display text-[20px] text-navy-900">
                  {title}
                </Modal.Heading>
                {description && (
                  <p className="mt-1 text-[13px] leading-[1.6] text-slate-500">
                    {description}
                  </p>
                )}
              </Modal.Header>
              <Modal.Body>{children}</Modal.Body>
              {footer && <Modal.Footer>{footer}</Modal.Footer>}
            </Modal.Dialog>
          </Modal.Container>
        </Modal.Backdrop>
      </Modal>
    );
  }

  return (
    <Drawer isOpen={open} onOpenChange={onOpenChange}>
      <Drawer.Backdrop>
        <Drawer.Content placement="bottom">
          <Drawer.Dialog className={cn("max-h-[92dvh] bg-canvas", className)}>
            <Drawer.Handle />
            <Drawer.Header>
              <Drawer.Heading className="font-display text-[20px] text-navy-900">
                {title}
              </Drawer.Heading>
              {description && (
                <p className="mt-1 text-[13px] leading-[1.6] text-slate-500">
                  {description}
                </p>
              )}
            </Drawer.Header>
            <Drawer.Body className="pb-[env(safe-area-inset-bottom)]">
              {children}
            </Drawer.Body>
            {footer && <Drawer.Footer>{footer}</Drawer.Footer>}
          </Drawer.Dialog>
        </Drawer.Content>
      </Drawer.Backdrop>
    </Drawer>
  );
}
