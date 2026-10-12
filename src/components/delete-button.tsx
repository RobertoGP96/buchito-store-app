"use client";

import { useState, type ReactNode } from "react";
import { Button, toast } from "@heroui/react";
import { Trash2 } from "lucide-react";
import { ResponsiveFormDialog } from "@/components/responsive-form-dialog";
import type { ActionResult } from "@/types";

interface DeleteButtonProps {
  /** Nombre visible del registro: "Eliminar {itemLabel}" en título y aria. */
  itemLabel: string;
  /** Qué se pierde al borrar. Va bajo el título del diálogo. */
  description: string;
  /** Consecuencias adicionales (productos que quedan sin categoría, etc.). */
  children?: ReactNode;
  /** Por qué no se puede borrar hoy: el diálogo lo explica en vez de confirmar. */
  blockedReason?: string | null;
  confirmLabel?: string;
  successMessage: string;
  onConfirm: () => Promise<ActionResult<unknown>>;
  /** Tras borrar con éxito (p. ej. volver al listado desde una ficha). */
  onDeleted?: () => void;
  /** `icon` para la celda de acciones de la tabla; `button` para cards y cabeceras. */
  appearance?: "icon" | "button";
  size?: "sm" | "md";
  className?: string;
}

/** Botón "Eliminar" con confirmación: el borrado no va en un clic suelto.
 *  Cuando `blockedReason` llega informado el botón sigue visible y el diálogo
 *  explica el motivo, para que el admin sepa qué deshacer antes (desactivar,
 *  reasignar, archivar…) en lugar de encontrarse un botón gris sin pista. */
export function DeleteButton({
  itemLabel,
  description,
  children,
  blockedReason,
  confirmLabel = "Eliminar",
  successMessage,
  onConfirm,
  onDeleted,
  appearance = "icon",
  size = "sm",
  className,
}: DeleteButtonProps) {
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const blocked = Boolean(blockedReason);

  const confirm = async () => {
    setPending(true);
    try {
      const result = await onConfirm();
      if (!result.success) {
        toast.danger(result.error);
        return;
      }
      toast.success(successMessage);
      setOpen(false);
      onDeleted?.();
    } catch (error) {
      console.error("DeleteButton:", error);
      toast.danger(`No se pudo eliminar ${itemLabel}`);
    } finally {
      setPending(false);
    }
  };

  return (
    <>
      {appearance === "icon" ? (
        <Button
          variant="ghost"
          size={size}
          isIconOnly
          aria-label={`Eliminar ${itemLabel}`}
          className={className}
          onPress={() => setOpen(true)}
        >
          <Trash2 className="h-4 w-4 text-danger" strokeWidth={1.9} />
        </Button>
      ) : (
        <Button
          variant="danger-soft"
          size={size}
          aria-label={`Eliminar ${itemLabel}`}
          className={className ?? "rounded-full"}
          onPress={() => setOpen(true)}
        >
          <Trash2 className="h-3.5 w-3.5" strokeWidth={1.9} />
          Eliminar
        </Button>
      )}

      <ResponsiveFormDialog
        open={open}
        onOpenChange={(next) => {
          if (!pending) setOpen(next);
        }}
        title={blocked ? `No se puede eliminar ${itemLabel}` : `Eliminar ${itemLabel}`}
        description={blocked ? (blockedReason ?? undefined) : description}
        size="sm"
        footer={
          <div className="flex w-full items-center justify-end gap-2">
            {blocked ? (
              <Button variant="primary" className="rounded-full" onPress={() => setOpen(false)}>
                Entendido
              </Button>
            ) : (
              <>
                <Button variant="ghost" className="rounded-full" isDisabled={pending} onPress={() => setOpen(false)}>
                  Cancelar
                </Button>
                <Button
                  variant="danger"
                  className="rounded-full"
                  isPending={pending}
                  isDisabled={pending}
                  onPress={() => void confirm()}
                >
                  {confirmLabel}
                </Button>
              </>
            )}
          </div>
        }
      >
        {blocked ? (
          <p className="text-[13px] leading-[1.6] text-slate-500">
            Si ya no quieres usarlo, desactívalo: los registros que lo referencian conservan su historial.
          </p>
        ) : (
          <div className="flex flex-col gap-2 text-[13px] leading-[1.6] text-slate-500">
            {children}
            <p>Esta acción no se puede deshacer y queda registrada en la auditoría.</p>
          </div>
        )}
      </ResponsiveFormDialog>
    </>
  );
}
