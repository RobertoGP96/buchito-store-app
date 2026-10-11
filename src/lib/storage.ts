import "server-only";
import { DeleteObjectCommand, GetObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { MEDIA_KEY_PATTERN, mediaKeyFromUrl, mediaUrl } from "./image-url";

/** Bucket de Neon Object Storage declarado en neon.ts con `public_read`. Las
 *  credenciales llegan por las variables AWS_* que escribe `neon env pull`.
 *  Las fotos se sirven por `/media/<clave>` (ver image-url.ts), nunca por la
 *  URL del bucket directamente. */
export const PRODUCT_BUCKET = "products";

export function isStorageConfigured(): boolean {
  return Boolean(
    process.env.AWS_ENDPOINT_URL_S3 && process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY
  );
}

function endpoint(): string {
  return (process.env.AWS_ENDPOINT_URL_S3 ?? "").replace(/\/$/, "");
}

let client: S3Client | null = null;

function s3(): S3Client {
  if (!client) {
    // Neon exige path-style; el resto sale del entorno estándar de AWS.
    client = new S3Client({
      forcePathStyle: true,
      endpoint: endpoint(),
      region: process.env.AWS_REGION ?? "us-east-2",
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID ?? "",
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY ?? "",
      },
    });
  }
  return client;
}

/** URL que se guarda en la base: relativa, independiente del bucket y del CDN. */
export function publicObjectUrl(key: string): string {
  return mediaUrl(key);
}

/** URL del objeto en el bucket (origen del CDN). Solo para diagnóstico. */
export function originObjectUrl(key: string): string {
  return `${endpoint()}/${PRODUCT_BUCKET}/${key}`;
}

/** Clave dentro del bucket si la URL es nuestra; null si es una URL externa.
 *  Reconoce `/media/<clave>`, la URL del bucket y la del CDN configurado. */
export function objectKeyFromUrl(url: string): string | null {
  const fromMedia = mediaKeyFromUrl(url);
  if (fromMedia) return fromMedia;
  const prefixes = [
    endpoint() ? `${endpoint()}/${PRODUCT_BUCKET}/` : null,
    process.env.NEXT_PUBLIC_IMAGE_CDN_URL ? `${process.env.NEXT_PUBLIC_IMAGE_CDN_URL.replace(/\/$/, "")}/` : null,
  ];
  for (const prefix of prefixes) {
    if (prefix && url.startsWith(prefix)) {
      const key = url.slice(prefix.length);
      return MEDIA_KEY_PATTERN.test(key) ? key : null;
    }
  }
  return null;
}

export async function uploadPublicObject(input: {
  key: string;
  body: Uint8Array;
  contentType: string;
}): Promise<string> {
  await s3().send(
    new PutObjectCommand({
      Bucket: PRODUCT_BUCKET,
      Key: input.key,
      Body: input.body,
      ContentType: input.contentType,
      // Cada versión va a una clave nueva (uuid), así que puede cachearse para siempre.
      CacheControl: "public, max-age=31536000, immutable",
    })
  );
  return publicObjectUrl(input.key);
}

export interface StoredObject {
  body: ReadableStream;
  contentType: string | null;
  contentLength: number | null;
  etag: string | null;
}

/** Lee un objeto del bucket para servirlo por /media. null si no existe. */
export async function getPublicObject(key: string): Promise<StoredObject | null> {
  try {
    const result = await s3().send(new GetObjectCommand({ Bucket: PRODUCT_BUCKET, Key: key }));
    if (!result.Body) return null;
    return {
      body: result.Body.transformToWebStream() as ReadableStream,
      contentType: result.ContentType ?? null,
      contentLength: result.ContentLength ?? null,
      etag: result.ETag ?? null,
    };
  } catch (error) {
    const name = (error as { name?: string })?.name;
    if (name === "NoSuchKey" || name === "NotFound") return null;
    throw error;
  }
}

/** Borrado best-effort: un objeto huérfano no justifica fallar la operación. */
export async function deleteObjectIfOurs(url: string | null | undefined): Promise<void> {
  if (!url) return;
  const key = objectKeyFromUrl(url);
  if (!key) return;
  try {
    await s3().send(new DeleteObjectCommand({ Bucket: PRODUCT_BUCKET, Key: key }));
  } catch (error) {
    console.error("deleteObjectIfOurs:", error);
  }
}
