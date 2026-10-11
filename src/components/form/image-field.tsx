"use client";

import { Button, Label } from "@heroui/react";
import { X } from "lucide-react";
import { Controller, type Control, type FieldPath, type FieldValues } from "react-hook-form";
import { ImageUploader } from "@/components/image-uploader";
import { ProductImage } from "@/components/product-image";

interface FormImageFieldProps<T extends FieldValues> {
  control: Control<T>;
  name: FieldPath<T>;
  label: string;
  /** Agrupa las claves en el bucket. */
  scope: string;
  description?: string;
  className?: string;
}

/** Campo de imagen única (foto de variante): sube al bucket y guarda la URL
 *  en el formulario; el servidor sigue recibiendo `imageUrl` como siempre. */
export function FormImageField<T extends FieldValues>({
  control,
  name,
  label,
  scope,
  description,
  className,
}: FormImageFieldProps<T>) {
  return (
    <Controller
      control={control}
      name={name}
      render={({ field }) => {
        const url = typeof field.value === "string" && field.value ? field.value : null;
        return (
          <div className={className}>
            <Label>{label}</Label>
            <div className="mt-1.5 flex items-center gap-3">
              <div className="relative h-20 w-20 flex-none overflow-hidden rounded-field bg-cream">
                <span className="absolute inset-0 flex items-center justify-center">
                  <ProductImage key={url ?? "none"} src={url} alt="" sizes="80px" />
                </span>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <ImageUploader scope={scope} label={url ? "Cambiar" : "Subir foto"} onUploaded={(next) => field.onChange(next)} />
                {url && (
                  <Button variant="ghost" size="sm" className="rounded-full" onPress={() => field.onChange("")}>
                    <X className="h-3.5 w-3.5" strokeWidth={2} />
                    Quitar
                  </Button>
                )}
              </div>
            </div>
            {description && <p className="mt-1.5 text-[12px] text-slate-400">{description}</p>}
          </div>
        );
      }}
    />
  );
}
