import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { uploadPublicObject } from "@/lib/storage";
import { parseImageUpload } from "@/lib/upload-image";

export const runtime = "nodejs";

/** Sube una foto de producto al bucket y devuelve su URL pública. Solo admin;
 *  `scope` agrupa las claves (id de producto o "variants"). */
export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user || session.user.role !== "admin") {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  const parsed = await parseImageUpload(request);
  if (!parsed.ok) return parsed.response;
  const { file, extension, form } = parsed;

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
