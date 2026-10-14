import "server-only";
import { NextResponse } from "next/server";
import { isStorageConfigured } from "./storage";

/** Validación común de las rutas que reciben una imagen por `FormData`
 *  (fotos de producto, prueba de entrega): formato, tamaño y almacenamiento
 *  configurado. Devuelve el archivo listo para subir o la respuesta de error. */

export const IMAGE_UPLOAD_MAX_BYTES = 5 * 1024 * 1024;

const EXTENSIONS: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
  "image/avif": "avif",
};

export type ParsedImageUpload =
  | { ok: true; file: File; extension: string; form: FormData }
  | { ok: false; response: NextResponse };

export async function parseImageUpload(
  request: Request,
  options: { maxBytes?: number } = {}
): Promise<ParsedImageUpload> {
  const maxBytes = options.maxBytes ?? IMAGE_UPLOAD_MAX_BYTES;
  const fail = (error: string, status: number): ParsedImageUpload => ({
    ok: false,
    response: NextResponse.json({ error }, { status }),
  });

  if (!isStorageConfigured()) {
    return fail("El almacenamiento de imágenes no está configurado (faltan las variables AWS_* de Neon)", 503);
  }

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return fail("Petición inválida", 400);
  }
  const file = form.get("file");
  if (!(file instanceof File)) return fail("Falta el archivo", 400);

  const extension = EXTENSIONS[file.type];
  if (!extension) return fail("Formato no admitido: usa JPG, PNG, WebP, GIF o AVIF", 415);
  if (file.size > maxBytes) {
    return fail(`La imagen supera los ${Math.round(maxBytes / (1024 * 1024))} MB`, 413);
  }
  return { ok: true, file, extension, form };
}
