"use client";

import { useId, useRef, useState } from "react";
import { Button, toast } from "@heroui/react";
import { ImagePlus, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

export const IMAGE_ACCEPT = "image/jpeg,image/png,image/webp,image/gif,image/avif";

/** Sube una imagen al bucket vía /api/uploads/products y devuelve su URL. */
export async function uploadProductImage(file: File, scope: string): Promise<string> {
  const form = new FormData();
  form.set("file", file);
  form.set("scope", scope);
  const response = await fetch("/api/uploads/products", { method: "POST", body: form });
  const data = (await response.json().catch(() => null)) as { url?: string; error?: string } | null;
  if (!response.ok || !data?.url) {
    throw new Error(data?.error ?? "No se pudo subir la imagen");
  }
  return data.url;
}

interface ImageUploaderProps {
  /** Agrupa las claves en el bucket (id de producto, "variants"…). */
  scope: string;
  onUploaded: (url: string) => void | Promise<void>;
  label?: string;
  /** Varios archivos de una vez (galería) o uno (foto de variante). */
  multiple?: boolean;
  disabled?: boolean;
  variant?: "button" | "dropzone";
  className?: string;
}

export function ImageUploader({
  scope,
  onUploaded,
  label = "Subir imagen",
  multiple = false,
  disabled = false,
  variant = "button",
  className,
}: ImageUploaderProps) {
  const inputId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [dragging, setDragging] = useState(false);

  const handleFiles = async (files: FileList | File[]) => {
    const list = Array.from(files).filter((f) => f.type.startsWith("image/"));
    if (list.length === 0) return;
    setUploading(true);
    try {
      for (const file of multiple ? list : list.slice(0, 1)) {
        const url = await uploadProductImage(file, scope);
        await onUploaded(url);
      }
    } catch (error) {
      toast.danger(error instanceof Error ? error.message : "No se pudo subir la imagen");
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  const input = (
    <input
      ref={inputRef}
      id={inputId}
      type="file"
      accept={IMAGE_ACCEPT}
      multiple={multiple}
      disabled={disabled || uploading}
      className="sr-only"
      onChange={(e) => e.target.files && void handleFiles(e.target.files)}
    />
  );

  if (variant === "dropzone") {
    return (
      <div className={className}>
        {input}
        <label
          htmlFor={inputId}
          onDragOver={(e) => {
            e.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragging(false);
            if (!disabled && !uploading) void handleFiles(e.dataTransfer.files);
          }}
          className={cn(
            "flex cursor-pointer flex-col items-center justify-center gap-2 rounded-field border-[1.5px] border-dashed px-4 py-6 text-center transition-colors duration-150",
            dragging ? "border-navy-700 bg-tint" : "border-rule bg-page hover:border-navy-700",
            (disabled || uploading) && "pointer-events-none opacity-60"
          )}
        >
          {uploading ? (
            <Loader2 className="h-5 w-5 animate-spin text-navy-700" strokeWidth={2} />
          ) : (
            <ImagePlus className="h-5 w-5 text-navy-700" strokeWidth={1.9} />
          )}
          <span className="text-[13px] font-semibold text-ink">{uploading ? "Subiendo…" : label}</span>
          <span className="text-[12px] text-slate-400">JPG, PNG, WebP, GIF o AVIF · hasta 5 MB</span>
        </label>
      </div>
    );
  }

  return (
    <div className={className}>
      {input}
      <Button
        variant="secondary"
        size="sm"
        className="rounded-full"
        isPending={uploading}
        isDisabled={disabled || uploading}
        onPress={() => inputRef.current?.click()}
      >
        <ImagePlus className="h-3.5 w-3.5" strokeWidth={1.9} />
        {uploading ? "Subiendo…" : label}
      </Button>
    </div>
  );
}
