"use client";

import { useState } from "react";
import { Button, toast } from "@heroui/react";
import { ShieldOff } from "lucide-react";
import { ResponsiveFormDialog } from "@/components/responsive-form-dialog";
import { TWO_FACTOR_METHOD_LABELS } from "@/modules/auth/lib/two-factor-labels";
import { resetUserTwoFactor } from "../actions/user-actions";
import type { UserRow } from "../queries/user-queries";

interface ResetTwoFactorButtonProps {
  row: UserRow;
  /** `icon` para la celda de acciones de la tabla; `button` para las cards. */
  appearance: "icon" | "button";
}

/** «Quitar 2FA» con confirmación, para cuando el usuario perdió el acceso a
 *  su método y a sus códigos de respaldo. Solo se muestra si lo tiene activo. */
export function ResetTwoFactorButton({ row, appearance }: ResetTwoFactorButtonProps) {
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const methodLabel = row.twoFactorMethod ? TWO_FACTOR_METHOD_LABELS[row.twoFactorMethod].toLowerCase() : "método";

  const confirm = async () => {
    setPending(true);
    try {
      const result = await resetUserTwoFactor(row.userId);
      if (!result.success) {
        toast.danger(result.error);
        return;
      }
      toast.success(`Verificación en dos pasos de ${row.fullName} desactivada`);
      setOpen(false);
    } catch (error) {
      console.error("ResetTwoFactorButton:", error);
      toast.danger("No se pudo quitar la verificación en dos pasos");
    } finally {
      setPending(false);
    }
  };

  return (
    <>
      {appearance === "icon" ? (
        <Button
          variant="ghost"
          size="sm"
          isIconOnly
          aria-label={`Quitar la verificación en dos pasos de ${row.fullName}`}
          onPress={() => setOpen(true)}
        >
          <ShieldOff className="h-4 w-4 text-danger" strokeWidth={1.9} />
        </Button>
      ) : (
        <Button variant="danger-soft" size="sm" className="rounded-full" onPress={() => setOpen(true)}>
          <ShieldOff className="h-3.5 w-3.5" strokeWidth={1.9} />
          Quitar 2FA
        </Button>
      )}

      <ResponsiveFormDialog
        open={open}
        onOpenChange={(next) => {
          if (!pending) setOpen(next);
        }}
        title="Quitar la verificación en dos pasos"
        description={`${row.fullName} volverá a entrar solo con su contraseña. Úsalo cuando haya perdido el acceso a su ${methodLabel} y a sus códigos de respaldo.`}
        size="sm"
        footer={
          <div className="flex w-full items-center justify-end gap-2">
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
              Quitar 2FA
            </Button>
          </div>
        }
      >
        <div className="flex flex-col gap-2 text-[13px] leading-[1.6] text-slate-500">
          <p>Comprueba antes que la petición viene de la persona titular de la cuenta.</p>
          <p>Podrá activarla de nuevo desde su perfil. Esta acción queda registrada en la auditoría.</p>
        </div>
      </ResponsiveFormDialog>
    </>
  );
}
