import { NextResponse } from "next/server";
import { MEDIA_KEY_PATTERN } from "@/lib/image-url";
import { getPublicObject, isStorageConfigured } from "@/lib/storage";

export const runtime = "nodejs";

/** Caché larga e inmutable: cada versión de una foto tiene clave nueva (uuid),
 *  así que ni el navegador ni el edge necesitan revalidar. `s-maxage` es lo
 *  que leen el edge de Vercel y los CDN delante de la app. */
const CACHE_CONTROL = "public, max-age=31536000, s-maxage=31536000, immutable";

/** Proxy cacheable del bucket de fotos: GET /media/<scope>/<uuid>.<ext>. Solo
 *  sirve claves con la forma que genera la subida, para no ser un proxy abierto. */
export async function GET(_request: Request, context: { params: Promise<{ key: string[] }> }) {
  const { key: parts } = await context.params;
  const key = parts.join("/");
  if (!MEDIA_KEY_PATTERN.test(key)) {
    return new NextResponse("No encontrado", { status: 404 });
  }
  if (!isStorageConfigured()) {
    return new NextResponse("Almacenamiento no configurado", { status: 503 });
  }

  try {
    const object = await getPublicObject(key);
    if (!object) {
      return new NextResponse("No encontrado", {
        status: 404,
        // Un 404 no se cachea para siempre: la foto puede subirse después.
        headers: { "Cache-Control": "public, max-age=60" },
      });
    }
    const headers = new Headers({
      "Cache-Control": CACHE_CONTROL,
      "Content-Type": object.contentType ?? "application/octet-stream",
      "X-Content-Type-Options": "nosniff",
    });
    if (object.contentLength != null) headers.set("Content-Length", String(object.contentLength));
    if (object.etag) headers.set("ETag", object.etag);
    return new NextResponse(object.body, { status: 200, headers });
  } catch (error) {
    console.error("GET /media:", error);
    return new NextResponse("No se pudo leer la imagen", { status: 502 });
  }
}
