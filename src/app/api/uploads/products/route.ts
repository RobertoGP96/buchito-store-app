import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { isStorageConfigured, uploadPublicObject } from "@/lib/storage";

export const runtime = "nodejs";

const MAX_BYTES = 5 * 1024 * 1024;

const EXTENSIONS: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
  "image/avif": "avif",
};

/** Sube una foto de producto al bucket y devuelve su URL pública. Solo admin;
 *  `scope` agrupa las claves (id de producto o "variants"). */
export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user || session.user.role !== "admin") {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }
  if (!isStorageConfigured()) {
    return NextResponse.json(
      { error: "El almacenamiento de imágenes no está configurado (faltan las variables AWS_* de Neon)" },
      { status: 503 }
    );
  }

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return NextResponse.json({ error: "Petición inválida" }, { status: 400 });
  }
  const file = form.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Falta el archivo" }, { status: 400 });
  }
  const extension = EXTENSIONS[file.type];
  if (!extension) {
    return NextResponse.json({ error: "Formato no admitido: usa JPG, PNG, WebP, GIF o AVIF" }, { status: 415 });
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: "La imagen supera los 5 MB" }, { status: 413 });
  }
  const scopeRaw = String(form.get("scope") ?? "misc");
  const scope = scopeRaw.replace(/[^a-z0-9-]/gi, "").slice(0, 40) || "misc";

  try {
    const key = `${scope}/${randomUUID()}.${extension}`;
    const url = await uploadPublicObject({
      key,
      body: new Uint8Array(await file.arrayBuffer()),
      contentType: file.type,
    });
    return NextResponse.json({ url, key });
  } catch (error) {
    console.error("POST /api/uploads/products:", error);
    return NextResponse.json({ error: "No se pudo subir la imagen" }, { status: 500 });
  }
}
