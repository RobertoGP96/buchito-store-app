"use client";

import { unstable_rethrow } from "next/navigation";
import { useState } from "react";
import { Controller, useForm, type Control, type FieldPath } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button, FieldError, Input, Label, TextField, toast } from "@heroui/react";
import { registerCustomer } from "../actions/auth-actions";
import { registerSchema, type RegisterInput } from "../lib/schemas";

interface FieldProps {
  control: Control<RegisterInput>;
  name: FieldPath<RegisterInput>;
  label: string;
  type?: string;
  autoComplete?: string;
  placeholder?: string;
}

function Field({ control, name, label, type = "text", autoComplete, placeholder }: FieldProps) {
  return (
    <Controller
      control={control}
      name={name}
      render={({ field, fieldState }) => (
        <TextField
          type={type}
          autoComplete={autoComplete}
          value={field.value}
          onChange={field.onChange}
          onBlur={field.onBlur}
          isInvalid={fieldState.invalid}
          isRequired
          fullWidth
        >
          <Label>{label}</Label>
          <Input placeholder={placeholder} />
          <FieldError>{fieldState.error?.message}</FieldError>
        </TextField>
      )}
    />
  );
}

export function RegisterForm() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { control, handleSubmit } = useForm<RegisterInput>({
    resolver: zodResolver(registerSchema),
    defaultValues: { fullName: "", email: "", phone: "", password: "", confirmPassword: "" },
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
      <Field control={control} name="fullName" label="Nombre completo" autoComplete="name" placeholder="Ana Pérez" />
      <Field control={control} name="email" label="Correo" type="email" autoComplete="email" placeholder="tu@correo.com" />
      <Field control={control} name="phone" label="Teléfono" type="tel" autoComplete="tel" placeholder="+53 5 123 4567" />
      <Field control={control} name="password" label="Contraseña" type="password" autoComplete="new-password" placeholder="Mínimo 8 caracteres" />
      <Field control={control} name="confirmPassword" label="Repite la contraseña" type="password" autoComplete="new-password" />
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
