import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getSessionCourierId } from "@/lib/auth-guard";
import { uploadPublicObject } from "@/lib/storage";
import { parseImageUpload } from "@/lib/upload-image";

export const runtime = "nodejs";

/** Prefijo de las fotos de prueba de entrega dentro del bucket. */
const PROOF_SCOPE = "proofs";

/** Sube la foto de prueba de una entrega y devuelve su URL pública. La sube
 *  el mensajero activo (o el admin); la entrega a la que pertenece se fija
 *  después, al confirmar la transición con `proofPhotoUrl`. */
export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  if (session.user.role !== "admin") {
    const courierId = session.user.role === "courier" ? await getSessionCourierId() : null;
    if (courierId == null) return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  const parsed = await parseImageUpload(request);
  if (!parsed.ok) return parsed.response;
  const { file, extension } = parsed;

  try {
    const key = `${PROOF_SCOPE}/${randomUUID()}.${extension}`;
    const url = await uploadPublicObject({
      key,
      body: new Uint8Array(await file.arrayBuffer()),
      contentType: file.type,
    });
    return NextResponse.json({ url, key });
  } catch (error) {
    console.error("POST /api/uploads/deliveries:", error);
    return NextResponse.json({ error: "No se pudo subir la foto" }, { status: 500 });
  }
}
