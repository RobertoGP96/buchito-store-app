"use client";

import Link from "next/link";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "@heroui/react";
import { FormFooter } from "@/components/form/form-footer";
import { FormSelect, FormSwitch, FormTextField, type SelectOption } from "@/components/form/fields";
import { ResponsiveFormDialog } from "@/components/responsive-form-dialog";
import { createUser, updateUser } from "../actions/user-actions";
import { ASSIGNABLE_ROLES, USER_ROLE_LABELS } from "../lib/labels";
import { userSchema, type UserInput, type UserValues } from "../lib/schemas";
import type { UserRow } from "../queries/user-queries";

interface UserFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user: UserRow | null;
}

const FORM_ID = "user-form";
const ROLE_OPTIONS: SelectOption[] = ASSIGNABLE_ROLES.map((r) => ({ value: r, label: USER_ROLE_LABELS[r] }));
const COURIER_ROLE_OPTION: SelectOption[] = [{ value: "courier", label: USER_ROLE_LABELS.courier }];

export function UserForm({ open, onOpenChange, user }: UserFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const isCourier = Boolean(user && (user.role === "courier" || user.hasCourierProfile));
  const { control, handleSubmit } = useForm<UserInput, unknown, UserValues>({
    resolver: zodResolver(userSchema),
    defaultValues: {
      fullName: user?.fullName ?? "",
      email: user?.email ?? "",
      role: user?.role ?? "customer",
      password: "",
      isActive: user?.isActive ?? true,
    },
  });

  const onSubmit = async (values: UserValues) => {
    setIsSubmitting(true);
    try {
      const result = user ? await updateUser(user.userId, values) : await createUser(values);
      if (!result.success) {
        toast.danger(result.error);
        return;
      }
      toast.success(user ? "Usuario actualizado" : "Usuario creado");
      onOpenChange(false);
    } catch (error) {
      console.error("UserForm:", error);
      toast.danger("No se pudo guardar el usuario");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <ResponsiveFormDialog
      open={open}
      onOpenChange={onOpenChange}
      title={user ? `Editar ${user.fullName}` : "Nuevo usuario"}
      description="Cuenta de acceso con correo y contraseña. Los mensajeros se crean desde Mensajeros."
      footer={
        <FormFooter
          formId={FORM_ID}
          submitLabel={user ? "Guardar" : "Crear usuario"}
          isSubmitting={isSubmitting}
          onCancel={() => onOpenChange(false)}
        />
      }
    >
      <form id={FORM_ID} onSubmit={handleSubmit(onSubmit)} noValidate className="grid gap-4 sm:grid-cols-2">
        <FormTextField control={control} name="fullName" label="Nombre" autoComplete="off" isRequired />
        <FormTextField control={control} name="email" label="Correo (usuario)" type="email" autoComplete="off" isRequired />
        <FormTextField
          control={control}
          name="password"
          label={user ? "Nueva contraseña" : "Contraseña"}
          description={user ? "Vacío = no cambiar." : "Mínimo 8 caracteres."}
          type="password"
          autoComplete="new-password"
          isRequired={!user}
        />
        <div className="flex flex-col gap-1.5">
          <FormSelect
            control={control}
            name="role"
            label="Rol"
            options={isCourier ? COURIER_ROLE_OPTION : ROLE_OPTIONS}
            isDisabled={isCourier}
            isRequired
          />
          {isCourier && (
            <p className="text-[12px] leading-[1.5] text-slate-500">
              El rol de un mensajero no se cambia desde aquí; su perfil se gestiona en{" "}
              <Link href="/admin/mensajeros" className="font-semibold text-navy-700 hover:underline">
                Mensajeros
              </Link>
              .
            </p>
          )}
        </div>
        <FormSwitch
          control={control}
          name="isActive"
          label="Activo"
          description="Un usuario inactivo no puede iniciar sesión."
          className="sm:col-span-2"
        />
      </form>
    </ResponsiveFormDialog>
  );
}
