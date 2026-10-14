/** Reduce una foto en el navegador antes de subirla. Las cámaras del móvil
 *  producen archivos de 3 a 8 MB que superan el límite de subida y tardan en
 *  redes lentas; para una prueba de entrega basta con 1600 px. Si el
 *  navegador no puede decodificarla, se devuelve el archivo tal cual y el
 *  servidor decide. Solo cliente. */

const JPEG = "image/jpeg";

interface CompressOptions {
  /** Lado mayor máximo en píxeles. */
  maxSize?: number;
  /** Calidad JPEG (0 a 1). */
  quality?: number;
  /** Por debajo de este tamaño un JPEG se deja sin tocar. */
  skipBelowBytes?: number;
}

export async function compressImage(
  file: File,
  { maxSize = 1600, quality = 0.82, skipBelowBytes = 700 * 1024 }: CompressOptions = {}
): Promise<File> {
  if (!file.type.startsWith("image/") || file.type === "image/gif") return file;
  if (typeof createImageBitmap !== "function" || typeof document === "undefined") return file;

  let bitmap: ImageBitmap;
  try {
    // `from-image` aplica la orientación EXIF: la foto no sale girada.
    bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
  } catch {
    return file;
  }

  try {
    const scale = Math.min(1, maxSize / Math.max(bitmap.width, bitmap.height));
    if (scale === 1 && file.type === JPEG && file.size <= skipBelowBytes) return file;

    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(bitmap.width * scale));
    canvas.height = Math.max(1, Math.round(bitmap.height * scale));
    const ctx = canvas.getContext("2d");
    if (!ctx) return file;
    ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);

    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, JPEG, quality));
    if (!blob) return file;
    const name = file.name.replace(/\.[^.]+$/, "") || "foto";
    return new File([blob], `${name}.jpg`, { type: JPEG, lastModified: Date.now() });
  } finally {
    bitmap.close();
  }
}
