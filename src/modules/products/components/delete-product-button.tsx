"use client";

import { useRouter } from "next/navigation";
import { DeleteButton } from "@/components/delete-button";
import { deleteProduct } from "../actions/product-actions";

interface DeleteProductButtonProps {
  productId: number;
  name: string;
  variantCount: number;
  /** Σ líneas de pedido de sus variantes: con alguna no se puede borrar. */
  orderLineCount: number;
  totalStock: number;
}

/** "Eliminar producto" en la cabecera de la ficha; al borrar vuelve al listado. */
export function DeleteProductButton({ productId, name, variantCount, orderLineCount, totalStock }: DeleteProductButtonProps) {
  const router = useRouter();
  return (
    <DeleteButton
      appearance="button"
      itemLabel={name}
      description={`Se eliminará el producto ${name} con sus ${variantCount} ${variantCount === 1 ? "variante" : "variantes"}, sus fotos y sus movimientos de stock.`}
      blockedReason={
        orderLineCount > 0
          ? `Aparece en ${orderLineCount} ${orderLineCount === 1 ? "pedido" : "pedidos"}. Archívalo en su lugar.`
          : null
      }
      successMessage={`Producto ${name} eliminado`}
      onConfirm={() => deleteProduct(productId)}
      onDeleted={() => router.replace("/admin/productos")}
    >
      {totalStock > 0 && (
        <p className="font-medium text-warn">
          Tiene {totalStock} {totalStock === 1 ? "unidad" : "unidades"} en stock que desaparecerán del inventario.
        </p>
      )}
    </DeleteButton>
  );
}
