import type { NextConfig } from "next";

/** Host del CDN propio delante del bucket de fotos (opcional, ver image-url.ts). */
function cdnHostname(): string | null {
  const raw = process.env.NEXT_PUBLIC_IMAGE_CDN_URL;
  if (!raw) return null;
  try {
    return new URL(raw).hostname;
  } catch {
    return null;
  }
}

const cdnHost = cdnHostname();

const nextConfig: NextConfig = {
  // El driver de Neon abre WebSockets desde Node; empaquetarlo rompe el
  // adapter en server actions.
  serverExternalPackages: ["@neondatabase/serverless"],
  images: {
    // Las fotos propias van por `/media/<clave>` (ruta local, no necesita
    // patrón). Estos son los orígenes externos que el optimizador acepta.
    remotePatterns: [
      ...(cdnHost ? [{ protocol: "https" as const, hostname: cdnHost }] : []),
      // Neon Object Storage directo (URLs antiguas o diagnóstico).
      { protocol: "https", hostname: "**.neon.tech" },
      { protocol: "https", hostname: "**.public.blob.vercel-storage.com" },
    ],
  },
};

export default nextConfig;
