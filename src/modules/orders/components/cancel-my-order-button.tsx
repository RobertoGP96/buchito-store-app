"use client";

import { useState } from "react";
import { Button, toast } from "@heroui/react";
import { PromptDialog } from "@/components/prompt-dialog";
import { cancelMyOrder } from "../actions/order-actions";

interface CancelMyOrderButtonProps {
  orderId: number;
  /** Para remontar el diálogo (y vaciar el motivo) cuando el pedido cambia. */
  version: number;
}

/** El cliente cancela su pedido mientras sigue pendiente. La action revalida
 *  la ficha: no hace falta refrescar. */
export function CancelMyOrderButton({ orderId, version }: CancelMyOrderButtonProps) {
  const [asking, setAsking] = useState(false);
  const [pending, setPending] = useState(false);

  const run = async (reason: string) => {
    setPending(true);
    try {
      const result = await cancelMyOrder(orderId, reason || null);
      if (!result.success) {
        toast.danger(result.error);
        return;
      }
      toast.success("Pedido cancelado");
      setAsking(false);
    } catch (error) {
      console.error("CancelMyOrderButton:", error);
      toast.danger("No se pudo cancelar el pedido");
    } finally {
      setPending(false);
    }
  };

  return (
    <>
      <Button variant="danger-soft" size="sm" className="rounded-full" onPress={() => setAsking(true)}>
        Cancelar pedido
      </Button>
      <PromptDialog
        key={`cancel-${version}`}
        open={asking}
        onOpenChange={setAsking}
        title="Cancelar pedido"
        description="Puedes cancelarlo mientras no lo hayamos confirmado."
        label="Motivo (opcional)"
        kind="textarea"
        allowEmpty
        confirmLabel="Cancelar pedido"
        tone="danger"
        isPending={pending}
        onConfirm={(reason) => void run(reason)}
      />
    </>
  );
}
