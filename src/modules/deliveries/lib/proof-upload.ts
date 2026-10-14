import { compressImage } from "@/lib/image-compress";

/** Sube la foto de prueba de entrega (reducida en el navegador) a
 *  /api/uploads/deliveries y devuelve su URL `/media/...`. Solo cliente. */
export async function uploadDeliveryProof(file: File): Promise<string> {
  const form = new FormData();
  form.set("file", await compressImage(file));
  const response = await fetch("/api/uploads/deliveries", { method: "POST", body: form });
  const data = (await response.json().catch(() => null)) as { url?: string; error?: string } | null;
  if (!response.ok || !data?.url) {
    throw new Error(data?.error ?? "No se pudo subir la foto");
  }
  return data.url;
}
