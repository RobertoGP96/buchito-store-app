"use client";

import { unstable_rethrow } from "next/navigation";
import { useEffect, useState } from "react";
import { Button, Input, Label, TextField, toast } from "@heroui/react";
import { cancelPendingLogin, resendLoginCode, verifyLoginCode } from "../actions/auth-actions";
import { EMAIL_CODE_TTL_MINUTES, TWO_FACTOR_EXPIRED_MESSAGE, type LoginChallenge } from "../lib/two-factor-labels";
import { OtpField } from "./otp-field";

interface TwoFactorLoginStepProps {
  challenge: LoginChallenge;
  callbackUrl?: string;
  /** Vuelve al paso de contraseña (también cuando el ticket caducó). */
  onBack: () => void;
}

type Mode = "otp" | "recovery";

const LINK_CLASS = "font-semibold text-navy-700 hover:underline disabled:cursor-not-allowed disabled:text-slate-400 disabled:no-underline";

/** Segundo paso del login: código de la app o del correo, con la opción de
 *  usar un código de respaldo. El ticket pendiente vive en una cookie
 *  httpOnly, así que aquí solo viaja el código. */
export function TwoFactorLoginStep({ challenge, callbackUrl, onBack }: TwoFactorLoginStepProps) {
  const [mode, setMode] = useState<Mode>("otp");
  const [code, setCode] = useState("");
  const [recoveryCode, setRecoveryCode] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [invalid, setInvalid] = useState(false);
  const [cooldown, setCooldown] = useState(challenge.resendAfterSeconds ?? 0);

  useEffect(() => {
    if (cooldown <= 0) return;
    const id = setTimeout(() => setCooldown((s) => s - 1), 1000);
    return () => clearTimeout(id);
  }, [cooldown]);

  const submit = async (kind: Mode, value: string) => {
    if (isSubmitting || !value.trim()) return;
    setIsSubmitting(true);
    setInvalid(false);
    try {
      // Con éxito la action redirige y esta pantalla se reemplaza: sin `finally`.
      const result = await verifyLoginCode({ kind, code: value, callbackUrl });
      if (!result.success) {
        toast.danger(result.error);
        setIsSubmitting(false);
        if (result.error === TWO_FACTOR_EXPIRED_MESSAGE) {
          onBack();
          return;
        }
        setInvalid(true);
        if (kind === "otp") setCode("");
      }
    } catch (error) {
      unstable_rethrow(error);
      console.error("TwoFactorLoginStep:", error);
      toast.danger("No se pudo verificar el código. Inténtalo de nuevo.");
      setIsSubmitting(false);
    }
  };

  const resend = async () => {
    setIsResending(true);
    try {
      const result = await resendLoginCode();
      if (!result.success) {
        toast.danger(result.error);
        if (result.error === TWO_FACTOR_EXPIRED_MESSAGE) onBack();
        return;
      }
      toast.success("Te enviamos un código nuevo");
      setCooldown(result.data.resendAfterSeconds);
      setCode("");
      setInvalid(false);
    } catch (error) {
      console.error("resendLoginCode:", error);
      toast.danger("No pudimos enviar el código. Inténtalo de nuevo.");
    } finally {
      setIsResending(false);
    }
  };

  const back = async () => {
    await cancelPendingLogin().catch(() => undefined);
    onBack();
  };

  const toggleMode = () => {
    setMode((m) => (m === "otp" ? "recovery" : "otp"));
    setInvalid(false);
  };

  const description =
    mode === "recovery"
      ? "Escribe uno de los códigos de respaldo que guardaste al activar la verificación. Cada código vale una sola vez."
      : challenge.method === "app"
        ? "Introduce el código de 6 dígitos de tu app de autenticación."
        : `Te enviamos un código a ${challenge.emailMasked ?? "tu correo"}. Caduca en ${EMAIL_CODE_TTL_MINUTES} minutos.`;

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        void submit(mode, mode === "otp" ? code : recoveryCode);
      }}
      className="flex flex-col gap-4"
      noValidate
    >
      <div>
        <p className="eyebrow">Verificación en dos pasos</p>
        <p className="mt-1 text-[13.5px] leading-[1.65] text-slate-500">{description}</p>
      </div>

      {mode === "otp" ? (
        <OtpField
          value={code}
          onChange={setCode}
          onComplete={(value) => void submit("otp", value)}
          isDisabled={isSubmitting}
          isInvalid={invalid}
          autoFocus
          label="Código de verificación"
        />
      ) : (
        <TextField
          type="text"
          autoComplete="off"
          value={recoveryCode}
          onChange={setRecoveryCode}
          isInvalid={invalid}
          isRequired
          fullWidth
          autoFocus
        >
          <Label>Código de respaldo</Label>
          <Input placeholder="XXXXX-XXXXX" autoCapitalize="characters" spellCheck={false} className="font-mono uppercase" />
        </TextField>
      )}

      <Button
        type="submit"
        variant="primary"
        size="lg"
        isPending={isSubmitting}
        isDisabled={isSubmitting || (mode === "otp" ? code.length < 6 : recoveryCode.trim().length === 0)}
        className="mt-2 w-full rounded-full"
      >
        {isSubmitting ? "Verificando…" : "Verificar"}
      </Button>

      <div className="flex flex-col items-center gap-2 text-[13px]">
        {challenge.method === "email" && mode === "otp" && (
          <button type="button" onClick={() => void resend()} disabled={cooldown > 0 || isResending} className={LINK_CLASS}>
            {cooldown > 0 ? `Reenviar código (${cooldown} s)` : isResending ? "Enviando…" : "Reenviar código"}
          </button>
        )}
        <button type="button" onClick={toggleMode} className={LINK_CLASS}>
          {mode === "otp"
            ? "Usar un código de respaldo"
            : challenge.method === "app"
              ? "Usar el código de la app"
              : "Usar el código del correo"}
        </button>
        <button type="button" onClick={() => void back()} className="text-slate-500 hover:underline">
          Volver
        </button>
      </div>
    </form>
  );
}
