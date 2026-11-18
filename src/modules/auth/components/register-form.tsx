"use client";

import { unstable_rethrow } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button, toast } from "@heroui/react";
import { FormTextField } from "@/components/form/fields";
import { registerCustomer } from "../actions/auth-actions";
import { registerSchema, type RegisterInput } from "../lib/schemas";

export function RegisterForm({ callbackUrl }: { callbackUrl?: string }) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { control, handleSubmit } = useForm<RegisterInput>({
    resolver: zodResolver(registerSchema),
    defaultValues: { fullName: "", email: "", phone: "", password: "", callbackUrl },
  });

  const onSubmit = async (values: RegisterInput) => {
    setIsSubmitting(true);
    try {
      // Con éxito la action redirige (ver LoginForm): sin `finally`.
      const result = await registerCustomer(values);
      if (!result.success) {
        toast.danger(result.error);
        setIsSubmitting(false);
      }
    } catch (error) {
      unstable_rethrow(error);
      console.error("RegisterForm:", error);
      toast.danger("No se pudo crear la cuenta. Inténtalo de nuevo.");
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4" noValidate>
      <FormTextField control={control} name="fullName" label="Nombre completo" autoComplete="name" placeholder="Ana Pérez" isRequired />
      <FormTextField control={control} name="email" label="Correo" type="email" autoComplete="email" placeholder="tu@correo.com" isRequired />
      <FormTextField control={control} name="phone" label="Teléfono" type="tel" autoComplete="tel" placeholder="+53 5 123 4567" isRequired />
      {/* Una sola contraseña: se comprueba con el botón de mostrarla, no
          escribiéndola dos veces. La regla va como descripción (queda a la
          vista y enlazada al campo), no como placeholder. */}
      <FormTextField
        control={control}
        name="password"
        label="Contraseña"
        type="password"
        autoComplete="new-password"
        description="Mínimo 8 caracteres"
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
        {isSubmitting ? "Creando cuenta…" : "Crear cuenta"}
      </Button>
    </form>
  );
}
