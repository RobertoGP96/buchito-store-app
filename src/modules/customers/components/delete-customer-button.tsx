"use client";

import { useRouter } from "next/navigation";
import { DeleteButton } from "@/components/delete-button";
import { deleteCustomer } from "../actions/customer-actions";

interface DeleteCustomerButtonProps {
  customerId: number;
  name: string;
  orderCount: number;
  recipientCount: number;
  /** Cuenta vinculada con rol cliente: se elimina con la ficha. */
  deletesAccount: boolean;
}

/** "Eliminar cliente" en la cabecera de la ficha; al borrar vuelve al listado. */
export function DeleteCustomerButton({ customerId, name, orderCount, recipientCount, deletesAccount }: DeleteCustomerButtonProps) {
  const router = useRouter();
  return (
    <DeleteButton
      appearance="button"
      itemLabel={name}
      description={`Se eliminará la ficha de ${name}${recipientCount > 0 ? ` y sus ${recipientCount} ${recipientCount === 1 ? "destinatario" : "destinatarios"}` : ""}.`}
      blockedReason={
        orderCount > 0
          ? `Tiene ${orderCount} ${orderCount === 1 ? "pedido registrado" : "pedidos registrados"}: su ficha forma parte del historial.`
          : null
      }
      successMessage={`Cliente ${name} eliminado`}
      onConfirm={() => deleteCustomer(customerId)}
      onDeleted={() => router.replace("/admin/clientes")}
    >
      {deletesAccount && (
        <p className="font-medium text-warn">También se eliminará su cuenta de acceso: no podrá volver a iniciar sesión.</p>
      )}
    </DeleteButton>
  );
}
