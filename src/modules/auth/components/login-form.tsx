"use client";

import { unstable_rethrow } from "next/navigation";
import { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button, FieldError, Input, Label, TextField, toast } from "@heroui/react";
import { loginUser } from "../actions/auth-actions";
import { loginSchema, type LoginInput } from "../lib/schemas";
import type { LoginChallenge } from "../lib/two-factor-labels";
import { TwoFactorLoginStep } from "./two-factor-login-step";

export function LoginForm({ callbackUrl }: { callbackUrl?: string }) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  // Con 2FA la action no redirige: devuelve el reto y se muestra el segundo paso.
  const [challenge, setChallenge] = useState<LoginChallenge | null>(null);
  const { control, handleSubmit } = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "", callbackUrl },
  });

  const onSubmit = async (values: LoginInput) => {
    setIsSubmitting(true);
    try {
      // Sin 2FA la action redirige y esta pantalla se reemplaza: el botón
      // se queda en "Entrando…" hasta entonces, por eso no hay `finally`.
      const result = await loginUser(values);
      if (!result.success) {
        toast.danger(result.error);
        setIsSubmitting(false);
        return;
      }
      setChallenge(result.data);
      setIsSubmitting(false);
    } catch (error) {
      // El redirect de la action llega aquí como rechazo de la promesa: se
      // relanza para que Next lo ejecute en vez de tratarlo como fallo.
      unstable_rethrow(error);
      console.error("LoginForm:", error);
      toast.danger("No se pudo iniciar sesión. Inténtalo de nuevo.");
      setIsSubmitting(false);
    }
  };

  if (challenge) {
    return <TwoFactorLoginStep challenge={challenge} callbackUrl={callbackUrl} onBack={() => setChallenge(null)} />;
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4" noValidate>
      <Controller
        control={control}
        name="email"
        render={({ field, fieldState }) => (
          <TextField
            type="email"
            autoComplete="email"
            value={field.value}
            onChange={field.onChange}
            onBlur={field.onBlur}
            isInvalid={fieldState.invalid}
            isRequired
            fullWidth
          >
            <Label>Correo</Label>
            <Input placeholder="tu@correo.com" />
            <FieldError>{fieldState.error?.message}</FieldError>
          </TextField>
        )}
      />
      <Controller
        control={control}
        name="password"
        render={({ field, fieldState }) => (
          <TextField
            type="password"
            autoComplete="current-password"
            value={field.value}
            onChange={field.onChange}
            onBlur={field.onBlur}
            isInvalid={fieldState.invalid}
            isRequired
            fullWidth
          >
            <Label>Contraseña</Label>
            <Input placeholder="••••••••" />
            <FieldError>{fieldState.error?.message}</FieldError>
          </TextField>
        )}
      />
      <Button
        type="submit"
        variant="primary"
        size="lg"
        isPending={isSubmitting}
        isDisabled={isSubmitting}
        className="mt-2 w-full rounded-full"
      >
        {isSubmitting ? "Entrando…" : "Iniciar sesión"}
      </Button>
    </form>
  );
}
