"use client";

import { unstable_rethrow } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button, toast } from "@heroui/react";
import { FormTextField } from "@/components/form/fields";
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
      {/* `username` y no `email`: es el token con el que los gestores de
          contraseñas emparejan el correo con la contraseña guardada. */}
      <FormTextField
        control={control}
        name="email"
        label="Correo"
        type="email"
        autoComplete="username"
        placeholder="tu@correo.com"
        isRequired
      />
      <FormTextField
        control={control}
        name="password"
        label="Contraseña"
        type="password"
        autoComplete="current-password"
        isRequired
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
