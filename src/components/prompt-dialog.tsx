"use client";

import { useState } from "react";
import { Button, Description, Input, Label, TextArea, TextField } from "@heroui/react";
import { ResponsiveFormDialog } from "@/components/responsive-form-dialog";

interface PromptDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  label: string;
  hint?: string;
  initialValue?: string;
  /** `number` muestra teclado decimal; `textarea` para motivos largos. */
  kind?: "text" | "number" | "textarea";
  suffix?: string;
  confirmLabel: string;
  tone?: "primary" | "danger";
  /** Vacío permitido (p. ej. monto cobrado 0 = no cobró). */
  allowEmpty?: boolean;
  isPending?: boolean;
  onConfirm: (value: string) => void;
}

/** Sustituto de `window.prompt`: hoja inferior en móvil, diálogo en desktop.
 *  El consumidor monta el componente con `key` para reiniciar el valor. */
export function PromptDialog({
  open,
  onOpenChange,
  title,
  description,
  label,
  hint,
  initialValue = "",
  kind = "text",
  suffix,
  confirmLabel,
  tone = "primary",
  allowEmpty = false,
  isPending = false,
  onConfirm,
}: PromptDialogProps) {
  const [value, setValue] = useState(initialValue);
  const invalid = !allowEmpty && value.trim() === "";

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (invalid || isPending) return;
    onConfirm(value.trim());
  };

  return (
    <ResponsiveFormDialog
      open={open}
      onOpenChange={onOpenChange}
      title={title}
      description={description}
      size="sm"
      footer={
        <div className="flex w-full items-center justify-end gap-2">
          <Button variant="ghost" className="rounded-full" isDisabled={isPending} onPress={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button
            type="submit"
            form="prompt-dialog-form"
            variant={tone === "danger" ? "danger" : "primary"}
            className="rounded-full"
            isPending={isPending}
            isDisabled={invalid || isPending}
          >
            {confirmLabel}
          </Button>
        </div>
      }
    >
      <form id="prompt-dialog-form" onSubmit={submit} noValidate>
        <TextField value={value} onChange={setValue} fullWidth autoFocus>
          <Label>{label}</Label>
          {kind === "textarea" ? (
            <TextArea rows={3} />
          ) : (
            <div className="relative">
              <Input
                type={kind === "number" ? "number" : "text"}
                inputMode={kind === "number" ? "decimal" : undefined}
                step={kind === "number" ? "0.01" : undefined}
                min={kind === "number" ? 0 : undefined}
                className={suffix ? "pr-14" : undefined}
              />
              {suffix && (
                <span className="tabular pointer-events-none absolute inset-y-0 right-4 flex items-center text-[12px] font-semibold text-slate-400">
                  {suffix}
                </span>
              )}
            </div>
          )}
          {hint && <Description>{hint}</Description>}
        </TextField>
      </form>
    </ResponsiveFormDialog>
  );
}
