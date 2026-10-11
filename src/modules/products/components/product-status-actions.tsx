"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button, toast } from "@heroui/react";
import { setProductStatus } from "../actions/product-actions";
import type { ProductStatus } from "../lib/labels";

interface ProductStatusActionsProps {
  productId: number;
  status: ProductStatus;
  hasActiveVariants: boolean;
}

interface Transition {
  to: ProductStatus;
  label: string;
  variant: "primary" | "secondary" | "danger-soft";
  confirm?: string;
}

const TRANSITIONS: Record<ProductStatus, Transition[]> = {
  draft: [
    { to: "active", label: "Publicar", variant: "primary" },
    { to: "archived", label: "Archivar", variant: "danger-soft", confirm: "¿Archivar el producto? Dejará de mostrarse en la tienda." },
  ],
  active: [
    { to: "draft", label: "Despublicar", variant: "secondary", confirm: "¿Despublicar el producto? Dejará de mostrarse en la tienda." },
    { to: "archived", label: "Archivar", variant: "danger-soft", confirm: "¿Archivar el producto? Dejará de mostrarse en la tienda." },
  ],
  archived: [
    { to: "draft", label: "Restaurar como borrador", variant: "secondary" },
    { to: "active", label: "Publicar", variant: "primary" },
  ],
};

/** Botones de cambio de estado del producto (borrador / publicado / archivado). */
export function ProductStatusActions({ productId, status, hasActiveVariants }: ProductStatusActionsProps) {
  const router = useRouter();
  const [pending, setPending] = useState<ProductStatus | null>(null);

  const run = async (transition: Transition) => {
    // El servidor rechaza publicar sin variantes activas: se avisa aquí y no
    // se llama a la action para no mostrar dos mensajes contradictorios.
    if (transition.to === "active" && !hasActiveVariants) {
      toast.warning("Publica al menos una variante antes de publicar el producto");
      return;
    }
    if (transition.confirm && !window.confirm(transition.confirm)) return;
    setPending(transition.to);
    try {
      const result = await setProductStatus(productId, transition.to);
      if (!result.success) {
        toast.danger(result.error);
        return;
      }
      toast.success("Estado actualizado");
      router.refresh();
    } catch (error) {
      console.error("ProductStatusActions:", error);
      toast.danger("No se pudo cambiar el estado del producto");
    } finally {
      setPending(null);
    }
  };

  return (
    <div className="flex flex-wrap gap-2">
      {TRANSITIONS[status].map((transition) => (
        <Button
          key={transition.to}
          variant={transition.variant}
          size="sm"
          className="rounded-full"
          isPending={pending === transition.to}
          isDisabled={pending !== null}
          onPress={() => void run(transition)}
        >
          {transition.label}
        </Button>
      ))}
    </div>
  );
}
