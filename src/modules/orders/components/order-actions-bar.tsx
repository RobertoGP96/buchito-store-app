"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button, toast } from "@heroui/react";
import { transitionOrder } from "../actions/order-actions";
import { ORDER_TRANSITION_LABELS, type FulfillmentType, type OrderStatus } from "../lib/labels";
import { nextOrderStates } from "../lib/state-machine";

interface OrderActionsBarProps {
  orderId: number;
  version: number;
  status: OrderStatus;
  fulfillment: FulfillmentType;
  deliveryStatus: string | null;
}

/** Botones de transición del admin, derivados de la máquina de estados. */
export function OrderActionsBar({ orderId, version, status, fulfillment, deliveryStatus }: OrderActionsBarProps) {
  const router = useRouter();
  const [pending, setPending] = useState<OrderStatus | null>(null);
  const targets = nextOrderStates(status, "admin", { fulfillment, isOwner: false, deliveryStatus });

  if (targets.length === 0) return null;

  const run = async (to: OrderStatus) => {
    const reason = to === "cancelled" ? window.prompt("Motivo de la cancelación") : null;
    if (to === "cancelled" && !reason) return;
    setPending(to);
    try {
      const result = await transitionOrder({ orderId, version, to, reason });
      if (!result.success) {
        toast.danger(result.error);
        return;
      }
      toast.success("Pedido actualizado");
      router.refresh();
    } catch (error) {
      console.error("OrderActionsBar:", error);
      toast.danger("No se pudo actualizar el pedido");
    } finally {
      setPending(null);
    }
  };

  return (
    <div className="flex flex-wrap gap-2">
      {targets.map((to) => (
        <Button
          key={to}
          variant={to === "cancelled" ? "danger-soft" : "primary"}
          size="sm"
          className="rounded-full"
          isPending={pending === to}
          isDisabled={pending !== null}
          onPress={() => void run(to)}
        >
          {ORDER_TRANSITION_LABELS[to]}
        </Button>
      ))}
    </div>
  );
}
