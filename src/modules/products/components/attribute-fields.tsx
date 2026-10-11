"use client";

import type { Control, FieldPath, FieldValues } from "react-hook-form";
import { FormSelect, FormSwitch, FormTextField } from "@/components/form/fields";
import type { AttributeDef, AttributeScope, AttributeValues } from "../lib/attribute-schema";

/** Valores iniciales de `attributes` para un scope: strings para los campos
 *  de texto/número/lista (el servidor normaliza) y booleanos para los
 *  interruptores. Los atributos que no son del scope no se tocan. */
export function attributeDefaults(
  schema: AttributeDef[],
  scope: AttributeScope,
  values: AttributeValues = {}
): Record<string, string | boolean> {
  const out: Record<string, string | boolean> = {};
  for (const def of schema) {
    if (def.scope !== scope) continue;
    const current = values[def.key];
    if (def.kind === "boolean") {
      out[def.key] = current === true;
    } else {
      out[def.key] = current == null ? "" : String(current);
    }
  }
  return out;
}

interface AttributeFieldsProps<T extends FieldValues> {
  control: Control<T>;
  schema: AttributeDef[];
  scope: AttributeScope;
  /** Clave del objeto en el formulario; por defecto `attributes`. */
  namePrefix?: string;
  /** Clases por campo (p. ej. para ocupar columnas de una retícula). */
  fieldClassName?: string;
}

/** Pinta los atributos dinámicos de un tipo de producto para un scope.
 *  No sabe nada del formulario: solo necesita el `control` y el prefijo. */
export function AttributeFields<T extends FieldValues>({
  control,
  schema,
  scope,
  namePrefix = "attributes",
  fieldClassName,
}: AttributeFieldsProps<T>) {
  const defs = schema.filter((def) => def.scope === scope);
  if (defs.length === 0) return null;

  return (
    <>
      {defs.map((def) => {
        // Las claves vienen de un JSON dinámico: RHF no puede tiparlas.
        const name = `${namePrefix}.${def.key}` as FieldPath<T>;
        switch (def.kind) {
          case "number":
            return (
              <FormTextField
                key={def.key}
                control={control}
                name={name}
                label={def.label}
                type="number"
                step="any"
                isRequired={def.required}
                className={fieldClassName}
              />
            );
          case "select":
            return (
              <FormSelect
                key={def.key}
                control={control}
                name={name}
                label={def.label}
                isRequired={def.required}
                options={(def.options ?? []).map((option) => ({ value: option, label: option }))}
                className={fieldClassName}
              />
            );
          case "boolean":
            return (
              <FormSwitch
                key={def.key}
                control={control}
                name={name}
                label={def.label}
                className={fieldClassName}
              />
            );
          default:
            return (
              <FormTextField
                key={def.key}
                control={control}
                name={name}
                label={def.label}
                isRequired={def.required}
                className={fieldClassName}
              />
            );
        }
      })}
    </>
  );
}
