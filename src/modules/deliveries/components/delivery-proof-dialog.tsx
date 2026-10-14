"use client";

import { useEffect, useRef, useState } from "react";
import { Button, Description, Input, Label, TextField, toast } from "@heroui/react";
import { Camera, Images, Loader2, X } from "lucide-react";
import { ResponsiveFormDialog } from "@/components/responsive-form-dialog";
import { cn } from "@/lib/utils";
import { uploadDeliveryProof } from "../lib/proof-upload";

export interface DeliveryProofResult {
  proofPhotoUrl: string | null;
  /** Solo cuando el diálogo pidió el monto. */
  amountCollected: number | null;
}

interface DeliveryProofDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  confirmLabel: string;
  /** Pide el monto cobrado contra entrega (en la moneda del método de pago). */
  askAmount?: { initial: number; currencyCode: string } | null;
  /** Sin foto no se puede confirmar (añadir prueba a una entrega cerrada). */
  requirePhoto?: boolean;
  isPending?: boolean;
  onConfirm: (result: DeliveryProofResult) => void | Promise<void>;
}

const FORM_ID = "delivery-proof-form";

/** Paso final de una entrega: foto de prueba (cámara o galería) y, si el
 *  pedido no estaba pagado, lo cobrado. La foto se sube al confirmar, no al
 *  elegirla, para no dejar objetos huérfanos si el mensajero cancela. El
 *  consumidor monta el diálogo con `key` para reiniciar su estado. */
export function DeliveryProofDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel,
  askAmount = null,
  requirePhoto = false,
  isPending = false,
  onConfirm,
}: DeliveryProofDialogProps) {
  const cameraRef = useRef<HTMLInputElement>(null);
  const galleryRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [amount, setAmount] = useState(askAmount ? String(askAmount.initial) : "");

  // La vista previa es un object URL: se libera al cambiar de foto o cerrar.
  useEffect(() => {
    if (!file) {
      setPreview(null);
      return;
    }
    const url = URL.createObjectURL(file);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  const busy = uploading || isPending;
  const amountValue = askAmount ? Number(amount.replace(",", ".")) : null;
  const amountInvalid = askAmount != null && (amount.trim() === "" || !Number.isFinite(amountValue) || amountValue! < 0);
  const invalid = amountInvalid || (requirePhoto && !file);

  const pick = (input: HTMLInputElement | null) => {
    if (!busy) input?.click();
  };

  const onFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const chosen = e.target.files?.[0] ?? null;
    if (chosen && chosen.type.startsWith("image/")) setFile(chosen);
    e.target.value = "";
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (invalid || busy) return;
    let proofPhotoUrl: string | null = null;
    if (file) {
      setUploading(true);
      try {
        proofPhotoUrl = await uploadDeliveryProof(file);
      } catch (error) {
        toast.danger(error instanceof Error ? error.message : "No se pudo subir la foto");
        return;
      } finally {
        setUploading(false);
      }
    }
    await onConfirm({ proofPhotoUrl, amountCollected: askAmount ? amountValue : null });
  };

  return (
    <ResponsiveFormDialog
      open={open}
      onOpenChange={(next) => !busy && onOpenChange(next)}
      title={title}
      description={description}
      size="sm"
      footer={
        <div className="flex w-full items-center justify-end gap-2">
          <Button variant="ghost" className="rounded-full" isDisabled={busy} onPress={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button
            type="submit"
            form={FORM_ID}
            variant="primary"
            className="rounded-full"
            isPending={busy}
            isDisabled={invalid || busy}
          >
            {uploading ? "Subiendo foto…" : confirmLabel}
          </Button>
        </div>
      }
    >
      <form id={FORM_ID} onSubmit={(e) => void submit(e)} noValidate className="grid gap-5">
        <input ref={cameraRef} type="file" accept="image/*" capture="environment" className="sr-only" onChange={onFile} />
        <input ref={galleryRef} type="file" accept="image/*" className="sr-only" onChange={onFile} />

        <div>
          <p className="text-[13px] font-semibold text-ink">
            Foto de prueba{requirePhoto ? "" : <span className="font-normal text-slate-400"> · opcional</span>}
          </p>
          <p className="mt-1 text-[12.5px] leading-[1.55] text-slate-500">
            Una foto del paquete entregado (en la puerta o en manos del cliente) queda guardada como prueba.
          </p>

          {preview ? (
            <div className="relative mt-3 overflow-hidden rounded-field bg-page">
              {/* eslint-disable-next-line @next/next/no-img-element -- object URL local, sin optimizar */}
              <img src={preview} alt="Vista previa de la foto de prueba" className="max-h-[260px] w-full object-cover" />
              {uploading && (
                <div className="absolute inset-0 flex items-center justify-center bg-canvas/70">
                  <Loader2 className="h-6 w-6 animate-spin text-navy-700" strokeWidth={2} />
                </div>
              )}
              <button
                type="button"
                onClick={() => setFile(null)}
                disabled={busy}
                aria-label="Quitar la foto"
                className="absolute top-2 right-2 flex h-8 w-8 items-center justify-center rounded-full bg-canvas/90 text-ink shadow-card transition-colors duration-150 hover:bg-canvas"
              >
                <X className="h-4 w-4" strokeWidth={2} />
              </button>
            </div>
          ) : (
            <div className="mt-3 grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => pick(cameraRef.current)}
                disabled={busy}
                className={cn(
                  "flex flex-col items-center justify-center gap-2 rounded-field border-[1.5px] border-dashed border-rule bg-page px-3 py-5 text-[13px] font-semibold text-ink transition-colors duration-150 hover:border-navy-700",
                  busy && "pointer-events-none opacity-60"
                )}
              >
                <Camera className="h-5 w-5 text-navy-700" strokeWidth={1.9} />
                Tomar foto
              </button>
              <button
                type="button"
                onClick={() => pick(galleryRef.current)}
                disabled={busy}
                className={cn(
                  "flex flex-col items-center justify-center gap-2 rounded-field border-[1.5px] border-dashed border-rule bg-page px-3 py-5 text-[13px] font-semibold text-ink transition-colors duration-150 hover:border-navy-700",
                  busy && "pointer-events-none opacity-60"
                )}
              >
                <Images className="h-5 w-5 text-navy-700" strokeWidth={1.9} />
                Elegir de la galería
              </button>
            </div>
          )}
          {preview && !busy && (
            <div className="mt-2 flex gap-3 text-[12.5px] font-semibold text-navy-700">
              <button type="button" onClick={() => pick(cameraRef.current)} className="hover:underline">
                Repetir foto
              </button>
              <button type="button" onClick={() => pick(galleryRef.current)} className="hover:underline">
                Elegir otra
              </button>
            </div>
          )}
        </div>

        {askAmount && (
          <TextField value={amount} onChange={setAmount} fullWidth isDisabled={busy}>
            <Label>Monto cobrado</Label>
            <div className="relative">
              <Input type="number" inputMode="decimal" step="0.01" min={0} className="pr-16" />
              <span className="tabular pointer-events-none absolute inset-y-0 right-4 flex items-center text-[12px] font-semibold text-slate-400">
                {askAmount.currencyCode}
              </span>
            </div>
            <Description>Lo que recibiste del cliente. Si no cobraste nada, deja 0.</Description>
          </TextField>
        )}
      </form>
    </ResponsiveFormDialog>
  );
}
