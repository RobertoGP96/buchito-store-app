"use client";

import { useState } from "react";
import { Button, toast } from "@heroui/react";
import { Star } from "lucide-react";
import { ResponsiveFormDialog } from "@/components/responsive-form-dialog";
import { setBaseCurrency } from "../actions/currency-actions";
import type { CurrencyRow } from "../queries/currency-queries";

interface SetBaseCurrencyButtonProps {
  currency: CurrencyRow;
  currentBaseCode: string | null;
  size?: "sm" | "md";
}

/** "Hacer moneda base" con confirmación: cambiarla afecta a cómo se guardan
 *  los montos de los pedidos nuevos, así que no va en un clic suelto. */
export function SetBaseCurrencyButton({ currency, currentBaseCode, size = "sm" }: SetBaseCurrencyButtonProps) {
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);

  const confirm = async () => {
    setPending(true);
    try {
      const result = await setBaseCurrency(currency.currencyId);
      if (!result.success) {
        toast.danger(result.error);
        return;
      }
      toast.success(`${currency.code} es ahora la moneda base`);
      setOpen(false);
    } catch (error) {
      console.error("SetBaseCurrencyButton:", error);
      toast.danger("No se pudo cambiar la moneda base");
    } finally {
      setPending(false);
    }
  };

  return (
    <>
      <Button
        variant="outline"
        size={size}
        className="rounded-full"
        isDisabled={!currency.isActive}
        onPress={() => setOpen(true)}
      >
        <Star className="h-3.5 w-3.5" strokeWidth={1.9} />
        Hacer base
      </Button>
      <ResponsiveFormDialog
        open={open}
        onOpenChange={setOpen}
        title={`Usar ${currency.code} como moneda base`}
        description={
          currentBaseCode
            ? `Hoy la base es ${currentBaseCode}. Los pedidos nuevos, los envíos y los cobros se guardarán en ${currency.code}; los pedidos ya creados conservan su moneda. Las tasas de cambio deberán definirse hacia ${currency.code}.`
            : `Los pedidos, envíos y cobros se guardarán en ${currency.code}.`
        }
        size="sm"
        footer={
          <div className="flex w-full items-center justify-end gap-2">
            <Button variant="ghost" className="rounded-full" isDisabled={pending} onPress={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button variant="primary" className="rounded-full" isPending={pending} isDisabled={pending} onPress={() => void confirm()}>
              Confirmar
            </Button>
          </div>
        }
      >
        <p className="text-[13px] leading-[1.6] text-slate-500">
          Esta acción queda registrada en la auditoría. Puedes volver a cambiarla desde aquí o desde Configuración.
        </p>
      </ResponsiveFormDialog>
    </>
  );
}
