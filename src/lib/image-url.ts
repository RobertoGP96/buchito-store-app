/** URLs públicas de las fotos del bucket. Sin `server-only`: lo usan los
 *  componentes que pintan imágenes y el almacenamiento del servidor.
 *
 *  En la base se guarda siempre la ruta relativa `/media/<clave>`: no depende
 *  del host del bucket (que cambia por rama de Neon) ni del CDN que haya
 *  delante. `/media` es un route handler que proxea el bucket con caché
 *  inmutable, así que el edge de Vercel (o cualquier CDN delante de la app) lo
 *  sirve sin volver al origen. Si hay un CDN propio apuntando al bucket
 *  (`NEXT_PUBLIC_IMAGE_CDN_URL`), las fotos se piden directamente ahí. */
export const MEDIA_PREFIX = "/media/";

/** Forma de las claves que genera /api/uploads/products: `<scope>/<uuid>.<ext>`.
 *  El proxy solo sirve claves con esta forma para no ser un proxy abierto. */
export const MEDIA_KEY_PATTERN = /^[a-z0-9-]{1,40}\/[0-9a-f-]{36}\.(jpg|png|webp|gif|avif)$/i;

export function mediaUrl(key: string): string {
  return `${MEDIA_PREFIX}${key}`;
}

/** Clave del objeto si la URL es `/media/<clave>`; null en otro caso. */
export function mediaKeyFromUrl(url: string): string | null {
  if (!url.startsWith(MEDIA_PREFIX)) return null;
  const key = url.slice(MEDIA_PREFIX.length);
  return MEDIA_KEY_PATTERN.test(key) ? key : null;
}

function cdnBase(): string {
  return (process.env.NEXT_PUBLIC_IMAGE_CDN_URL ?? "").replace(/\/$/, "");
}

/** URL que se pone en el `src`: la del CDN si está configurado, si no la
 *  ruta `/media` tal cual. Las URLs externas (http…) no se tocan. */
export function imageSrc(url: string): string;
export function imageSrc(url: string | null | undefined): string | null;
export function imageSrc(url: string | null | undefined): string | null {
  if (!url) return null;
  const base = cdnBase();
  if (!base) return url;
  const key = mediaKeyFromUrl(url);
  return key ? `${base}/${key}` : url;
}
