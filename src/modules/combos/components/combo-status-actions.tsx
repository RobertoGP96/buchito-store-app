"use client";

import { useState } from "react";
import { Button, toast } from "@heroui/react";
import type { ProductStatus } from "@/modules/products/lib/labels";
import { setComboStatus } from "../actions/combo-actions";

interface ComboStatusActionsProps {
  comboId: number;
  status: ProductStatus;
  hasItems: boolean;
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
    { to: "archived", label: "Archivar", variant: "danger-soft", confirm: "¿Archivar el combo? Dejará de mostrarse en la tienda." },
  ],
  active: [
    { to: "draft", label: "Despublicar", variant: "secondary", confirm: "¿Despublicar el combo? Dejará de mostrarse en la tienda." },
    { to: "archived", label: "Archivar", variant: "danger-soft", confirm: "¿Archivar el combo? Dejará de mostrarse en la tienda." },
  ],
  archived: [
    { to: "draft", label: "Restaurar como borrador", variant: "secondary" },
    { to: "active", label: "Publicar", variant: "primary" },
  ],
};

/** Botones de cambio de estado del combo (borrador / publicado / archivado). */
export function ComboStatusActions({ comboId, status, hasItems }: ComboStatusActionsProps) {
  const [pending, setPending] = useState<ProductStatus | null>(null);

  const run = async (transition: Transition) => {
    if (transition.to === "active" && !hasItems) {
      toast.warning("Añade al menos un producto antes de publicar el combo");
      return;
    }
    if (transition.confirm && !window.confirm(transition.confirm)) return;
    setPending(transition.to);
    try {
      const result = await setComboStatus(comboId, transition.to);
      if (!result.success) {
        toast.danger(result.error);
        return;
      }
      toast.success("Estado actualizado");
    } catch (error) {
      console.error("ComboStatusActions:", error);
      toast.danger("No se pudo cambiar el estado del combo");
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
