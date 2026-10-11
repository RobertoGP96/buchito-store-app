import "server-only";
import { DeleteObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";

/** Bucket de Neon Object Storage declarado en neon.ts con `public_read`: las
 *  fotos se sirven por URL directa (sin presign). Las credenciales llegan por
 *  las variables AWS_* que escribe `neon env pull`. */
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

export function publicObjectUrl(key: string): string {
  return `${endpoint()}/${PRODUCT_BUCKET}/${key}`;
}

/** Clave dentro del bucket si la URL es nuestra; null si es una URL externa. */
export function objectKeyFromUrl(url: string): string | null {
  const prefix = `${endpoint()}/${PRODUCT_BUCKET}/`;
  if (!endpoint() || !url.startsWith(prefix)) return null;
  return url.slice(prefix.length);
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
