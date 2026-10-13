"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { Button, toast } from "@heroui/react";
import { Check, Copy, Mail, Smartphone } from "lucide-react";
import { ResponsiveFormDialog } from "@/components/responsive-form-dialog";
import { cn } from "@/lib/utils";
import { cancelTwoFactorSetup, confirmTwoFactorSetup, startTwoFactorSetup } from "../actions/two-factor-actions";
import {
  EMAIL_CODE_TTL_MINUTES,
  TWO_FACTOR_METHOD_DESCRIPTIONS,
  TWO_FACTOR_METHOD_LABELS,
  type TwoFactorMethod,
  type TwoFactorSetup,
} from "../lib/two-factor-labels";
import { OtpField } from "./otp-field";

interface TwoFactorSetupDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Sin proveedor de correo configurado la opción se muestra deshabilitada. */
  emailAvailable: boolean;
}

type Step = "method" | "verify" | "codes";

const METHOD_ICONS: Record<TwoFactorMethod, typeof Smartphone> = { app: Smartphone, email: Mail };

async function copyText(text: string, done: string) {
  try {
    await navigator.clipboard.writeText(text);
    toast.success(done);
  } catch {
    toast.danger("No se pudo copiar. Selecciónalo y cópialo a mano.");
  }
}

/** Alta del 2FA en tres pasos: método → verificación (QR o correo) →
 *  códigos de respaldo. Cerrar antes del último paso descarta el alta. */
export function TwoFactorSetupDialog({ open, onOpenChange, emailAvailable }: TwoFactorSetupDialogProps) {
  const [step, setStep] = useState<Step>("method");
  const [method, setMethod] = useState<TwoFactorMethod>("app");
  const [setup, setSetup] = useState<TwoFactorSetup | null>(null);
  const [code, setCode] = useState("");
  const [invalid, setInvalid] = useState(false);
  const [isPending, setIsPending] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const [recoveryCodes, setRecoveryCodes] = useState<string[]>([]);

  useEffect(() => {
    if (cooldown <= 0) return;
    const id = setTimeout(() => setCooldown((s) => s - 1), 1000);
    return () => clearTimeout(id);
  }, [cooldown]);

  const close = (next: boolean) => {
    if (isPending) return;
    if (!next && step === "verify") void cancelTwoFactorSetup();
    onOpenChange(next);
  };

  const start = async (chosen: TwoFactorMethod) => {
    setIsPending(true);
    try {
      const result = await startTwoFactorSetup({ method: chosen });
      if (!result.success) {
        toast.danger(result.error);
        return;
      }
      setSetup(result.data);
      setCode("");
      setInvalid(false);
      if (result.data.method === "email") {
        setCooldown(result.data.resendAfterSeconds);
        if (step === "verify") toast.success(result.data.sent ? "Te enviamos un código nuevo" : "Espera un momento antes de pedir otro código");
      }
      setStep("verify");
    } catch (error) {
      console.error("startTwoFactorSetup:", error);
      toast.danger("No se pudo iniciar la activación. Inténtalo de nuevo.");
    } finally {
      setIsPending(false);
    }
  };

  const confirm = async (value: string) => {
    if (isPending || value.length < 6) return;
    setIsPending(true);
    setInvalid(false);
    try {
      const result = await confirmTwoFactorSetup({ code: value });
      if (!result.success) {
        toast.danger(result.error);
        setInvalid(true);
        setCode("");
        return;
      }
      setRecoveryCodes(result.data.recoveryCodes);
      setStep("codes");
      toast.success("Verificación en dos pasos activada");
    } catch (error) {
      console.error("confirmTwoFactorSetup:", error);
      toast.danger("No se pudo activar la verificación. Inténtalo de nuevo.");
    } finally {
      setIsPending(false);
    }
  };

  const titles: Record<Step, { title: string; description: string }> = {
    method: {
      title: "Activar la verificación en dos pasos",
      description: "Elige cómo recibirás el código de un solo uso cada vez que inicies sesión.",
    },
    verify: {
      title: setup?.method === "email" ? "Comprueba tu correo" : "Vincula tu app de autenticación",
      description:
        setup?.method === "email"
          ? `Te enviamos un código a ${setup.emailMasked}. Caduca en ${EMAIL_CODE_TTL_MINUTES} minutos.`
          : "Escanea el código QR con Google Authenticator, Authy o similar y escribe el código que te muestra.",
    },
    codes: {
      title: "Guarda tus códigos de respaldo",
      description:
        "Si pierdes el acceso a tu método, cada uno de estos códigos te permite entrar una vez. No volverás a verlos.",
    },
  };

  const footer =
    step === "method" ? (
      <div className="flex w-full items-center justify-end gap-2">
        <Button variant="ghost" className="rounded-full" isDisabled={isPending} onPress={() => close(false)}>
          Cancelar
        </Button>
        <Button
          variant="primary"
          className="rounded-full"
          isPending={isPending}
          isDisabled={isPending}
          onPress={() => void start(method)}
        >
          Continuar
        </Button>
      </div>
    ) : step === "verify" ? (
      <div className="flex w-full items-center justify-end gap-2">
        <Button variant="ghost" className="rounded-full" isDisabled={isPending} onPress={() => close(false)}>
          Cancelar
        </Button>
        <Button
          variant="primary"
          className="rounded-full"
          isPending={isPending}
          isDisabled={isPending || code.length < 6}
          onPress={() => void confirm(code)}
        >
          Activar
        </Button>
      </div>
    ) : (
      <div className="flex w-full items-center justify-end gap-2">
        <Button variant="primary" className="rounded-full" onPress={() => onOpenChange(false)}>
          Ya los guardé
        </Button>
      </div>
    );

  return (
    <ResponsiveFormDialog
      open={open}
      onOpenChange={close}
      title={titles[step].title}
      description={titles[step].description}
      size="sm"
      footer={footer}
    >
      {step === "method" && (
        <div className="flex flex-col gap-2" role="radiogroup" aria-label="Método de verificación">
          {(["app", "email"] as const).map((option) => {
            const Icon = METHOD_ICONS[option];
            const disabled = option === "email" && !emailAvailable;
            const selected = method === option;
            return (
              <button
                key={option}
                type="button"
                role="radio"
                aria-checked={selected}
                disabled={disabled}
                onClick={() => setMethod(option)}
                className={cn(
                  "flex items-start gap-3 rounded-xl border p-3 text-left transition-colors duration-150",
                  selected ? "border-navy-700 bg-tint" : "border-line hover:bg-hover",
                  disabled && "cursor-not-allowed opacity-50 hover:bg-transparent"
                )}
              >
                <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-canvas text-navy-700 shadow-card">
                  <Icon className="h-4 w-4" strokeWidth={1.9} />
                </span>
                <span className="min-w-0">
                  <span className="block text-[14px] font-semibold text-ink">{TWO_FACTOR_METHOD_LABELS[option]}</span>
                  <span className="mt-0.5 block text-[12.5px] leading-[1.55] text-slate-500">
                    {disabled ? "No disponible: la tienda no tiene configurado el envío de correos." : TWO_FACTOR_METHOD_DESCRIPTIONS[option]}
                  </span>
                </span>
              </button>
            );
          })}
        </div>
      )}

      {step === "verify" && setup && (
        <div className="flex flex-col items-center gap-4">
          {setup.method === "app" && (
            <>
              <Image
                src={setup.qrDataUrl}
                alt="Código QR para la app de autenticación"
                width={200}
                height={200}
                unoptimized
                className="rounded-xl bg-white p-2 shadow-card"
              />
              <div className="w-full text-center">
                <p className="text-[12.5px] text-slate-500">¿No puedes escanear? Escribe esta clave en la app:</p>
                <div className="mt-2 flex items-center justify-center gap-2">
                  <code className="rounded-lg bg-tint px-3 py-1.5 font-mono text-[13px] tracking-wide text-ink select-all">
                    {setup.manualKey}
                  </code>
                  <Button
                    variant="ghost"
                    size="sm"
                    isIconOnly
                    aria-label="Copiar clave"
                    onPress={() => void copyText(setup.manualKey.replace(/\s+/g, ""), "Clave copiada")}
                  >
                    <Copy className="h-4 w-4" strokeWidth={1.9} />
                  </Button>
                </div>
              </div>
            </>
          )}

          <OtpField
            value={code}
            onChange={setCode}
            onComplete={(value) => void confirm(value)}
            isDisabled={isPending}
            isInvalid={invalid}
            autoFocus
            label="Código de verificación"
          />

          {setup.method === "email" && (
            <button
              type="button"
              onClick={() => void start("email")}
              disabled={cooldown > 0 || isPending}
              className="text-[13px] font-semibold text-navy-700 hover:underline disabled:cursor-not-allowed disabled:text-slate-400 disabled:no-underline"
            >
              {cooldown > 0 ? `Reenviar código (${cooldown} s)` : "Reenviar código"}
            </button>
          )}
        </div>
      )}

      {step === "codes" && (
        <div className="flex flex-col gap-3">
          <ul className="grid grid-cols-2 gap-2 rounded-xl bg-tint p-3 font-mono text-[13.5px] tracking-wide text-ink">
            {recoveryCodes.map((item) => (
              <li key={item} className="select-all px-1 py-0.5 tabular">
                {item}
              </li>
            ))}
          </ul>
          <Button
            variant="outline"
            size="sm"
            className="self-start rounded-full"
            onPress={() => void copyText(recoveryCodes.join("\n"), "Códigos copiados")}
          >
            <Copy className="h-3.5 w-3.5" strokeWidth={1.9} />
            Copiar todos
          </Button>
          <p className="flex items-start gap-2 text-[12.5px] leading-[1.6] text-slate-500">
            <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-navy-700" strokeWidth={2} />
            Guárdalos en un sitio seguro (gestor de contraseñas, nota impresa). Cada código vale una sola vez.
          </p>
        </div>
      )}
    </ResponsiveFormDialog>
  );
}
