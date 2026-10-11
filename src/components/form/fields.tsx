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
import {
  Controller,
  type Control,
  type FieldPath,
  type FieldValues,
} from "react-hook-form";

/** Campos de formulario sobre HeroUI ya cableados a react-hook-form. Todos
 *  los formularios del admin los usan: así el look y los mensajes de error
 *  son los mismos en todas partes. */

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
  return (
    <Controller
      control={control}
      name={name}
      render={({ field, fieldState }) => (
        <TextField
          type={type}
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
              placeholder={placeholder}
              step={step}
              min={min}
              inputMode={type === "number" ? "decimal" : undefined}
              className={suffix ? "pr-14" : undefined}
            />
            {suffix && (
              <span className="tabular pointer-events-none absolute inset-y-0 right-4 flex items-center text-[12px] font-semibold text-slate-400">
                {suffix}
              </span>
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
          <TextArea placeholder={placeholder} rows={rows} />
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
          <Select.Trigger>
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
                      <span className="text-[12px] text-slate-400">{option.description}</span>
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
          <Switch.Control>
            <Switch.Thumb />
          </Switch.Control>
          <Switch.Content>
            <Label>{label}</Label>
            {description && <Description>{description}</Description>}
          </Switch.Content>
        </Switch>
      )}
    />
  );
}
