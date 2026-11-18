"use client";

import {
  Description,
  FieldError,
  Input,
  Label,
  ListBox,
  Select,
  Switch,
  TextArea,
  TextField,
} from "@heroui/react";
import { Eye, EyeOff } from "lucide-react";
import { useState } from "react";
import {
  Controller,
  type Control,
  type FieldPath,
  type FieldValues,
} from "react-hook-form";
import { cn } from "@/lib/utils";

/** Campos de formulario sobre HeroUI ya cableados a react-hook-form. Los usan
 *  el admin, el acceso y el registro: así el look y los mensajes de error son
 *  los mismos en todas partes. */

interface BaseProps<T extends FieldValues> {
  control: Control<T>;
  name: FieldPath<T>;
  label: string;
  description?: string;
  isRequired?: boolean;
  isDisabled?: boolean;
  className?: string;
}

interface TextProps<T extends FieldValues> extends BaseProps<T> {
  type?: "text" | "email" | "tel" | "password" | "number" | "url" | "date";
  placeholder?: string;
  autoComplete?: string;
  /** Para `type="number"`: paso del input (0.01 para montos con decimales). */
  step?: string;
  min?: string | number;
  /** Texto fijo al final del campo (código de moneda, "%"). */
  suffix?: string;
}

export function FormTextField<T extends FieldValues>({
  control,
  name,
  label,
  description,
  isRequired,
  isDisabled,
  className,
  type = "text",
  placeholder,
  autoComplete,
  step,
  min,
  suffix,
}: TextProps<T>) {
  const isPassword = type === "password";
  const [revealed, setRevealed] = useState(false);

  return (
    <Controller
      control={control}
      name={name}
      render={({ field, fieldState }) => (
        <TextField
          type={isPassword && revealed ? "text" : type}
          // `name` estable: los gestores de contraseñas y el autocompletado
          // del navegador identifican el campo por él.
          name={field.name}
          value={field.value == null ? "" : String(field.value)}
          onChange={field.onChange}
          onBlur={field.onBlur}
          isInvalid={fieldState.invalid}
          isRequired={isRequired}
          isDisabled={isDisabled}
          autoComplete={autoComplete}
          fullWidth
          className={className}
        >
          <Label>{label}</Label>
          <div className="relative">
            <Input
              // Con la ref, react-hook-form lleva el foco al primer campo con
              // error cuando el envío falla.
              ref={field.ref}
              placeholder={placeholder}
              step={step}
              min={min}
              inputMode={type === "number" ? "decimal" : undefined}
              // Correo y contraseña son identificadores, no prosa.
              spellCheck={type === "email" || isPassword ? false : undefined}
              autoCapitalize={isPassword ? "none" : undefined}
              className={cn(suffix && "pr-14", isPassword && "pr-12")}
            />
            {suffix && (
              <span className="tabular pointer-events-none absolute inset-y-0 right-4 flex items-center text-[12px] font-semibold text-ink-subtle">
                {suffix}
              </span>
            )}
            {isPassword && (
              <button
                type="button"
                onClick={() => setRevealed((v) => !v)}
                aria-pressed={revealed}
                aria-label="Mostrar contraseña"
                disabled={isDisabled}
                className="absolute inset-y-0 right-0 flex w-11 items-center justify-center rounded-r-field text-ink-subtle transition-colors duration-150 hover:text-ink disabled:pointer-events-none disabled:opacity-50"
              >
                {revealed ? (
                  <EyeOff className="h-[18px] w-[18px]" strokeWidth={1.7} aria-hidden />
                ) : (
                  <Eye className="h-[18px] w-[18px]" strokeWidth={1.7} aria-hidden />
                )}
              </button>
            )}
          </div>
          {description && <Description>{description}</Description>}
          <FieldError>{fieldState.error?.message}</FieldError>
        </TextField>
      )}
    />
  );
}

interface TextAreaProps<T extends FieldValues> extends BaseProps<T> {
  placeholder?: string;
  rows?: number;
}

export function FormTextArea<T extends FieldValues>({
  control,
  name,
  label,
  description,
  isRequired,
  isDisabled,
  className,
  placeholder,
  rows = 3,
}: TextAreaProps<T>) {
  return (
    <Controller
      control={control}
      name={name}
      render={({ field, fieldState }) => (
        <TextField
          name={field.name}
          value={field.value ?? ""}
          onChange={field.onChange}
          onBlur={field.onBlur}
          isInvalid={fieldState.invalid}
          isRequired={isRequired}
          isDisabled={isDisabled}
          fullWidth
          className={className}
        >
          <Label>{label}</Label>
          <TextArea ref={field.ref} placeholder={placeholder} rows={rows} />
          {description && <Description>{description}</Description>}
          <FieldError>{fieldState.error?.message}</FieldError>
        </TextField>
      )}
    />
  );
}

export interface SelectOption {
  value: string;
  label: string;
  description?: string;
}

interface SelectProps<T extends FieldValues> extends BaseProps<T> {
  options: SelectOption[];
  placeholder?: string;
}

export function FormSelect<T extends FieldValues>({
  control,
  name,
  label,
  description,
  isRequired,
  isDisabled,
  className,
  options,
  placeholder = "Elige una opción",
}: SelectProps<T>) {
  return (
    <Controller
      control={control}
      name={name}
      render={({ field, fieldState }) => (
        <Select
          selectedKey={field.value == null || field.value === "" ? null : String(field.value)}
          onSelectionChange={(key) => field.onChange(key == null ? "" : String(key))}
          onBlur={field.onBlur}
          isInvalid={fieldState.invalid}
          isRequired={isRequired}
          isDisabled={isDisabled}
          placeholder={placeholder}
          fullWidth
          className={className}
        >
          <Label>{label}</Label>
          <Select.Trigger ref={field.ref}>
            <Select.Value />
            <Select.Indicator />
          </Select.Trigger>
          {description && <Description>{description}</Description>}
          <FieldError>{fieldState.error?.message}</FieldError>
          <Select.Popover>
            <ListBox>
              {options.map((option) => (
                <ListBox.Item key={option.value} id={option.value} textValue={option.label}>
                  <span className="flex flex-col">
                    <span>{option.label}</span>
                    {option.description && (
                      <span className="text-[12px] text-ink-subtle">{option.description}</span>
                    )}
                  </span>
                  <ListBox.ItemIndicator />
                </ListBox.Item>
              ))}
            </ListBox>
          </Select.Popover>
        </Select>
      )}
    />
  );
}

export function FormSwitch<T extends FieldValues>({
  control,
  name,
  label,
  description,
  isDisabled,
  className,
}: BaseProps<T>) {
  return (
    <Controller
      control={control}
      name={name}
      render={({ field }) => (
        <Switch
          isSelected={Boolean(field.value)}
          onChange={field.onChange}
          isDisabled={isDisabled}
          className={className}
        >
          {/* Desde HeroUI 3.2 solo `Switch.Content` es la etiqueta clicable:
              el control debe ir dentro o pulsar la pista no cambia nada. */}
          <Switch.Content>
            <Switch.Control>
              <Switch.Thumb />
            </Switch.Control>
            <Label>{label}</Label>
          </Switch.Content>
          {description && <Description>{description}</Description>}
        </Switch>
      )}
    />
  );
}
