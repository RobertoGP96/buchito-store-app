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

/** Cabeceras estáticas para todas las respuestas: no dependen del request, así
 *  que van aquí y no en el middleware (que solo corre en rutas con sesión).
 *  Una CSP de scripts necesitaría nonce por request; aquí solo va la parte que
 *  no lo requiere (quién puede incrustar la app en un iframe). */
const SECURITY_HEADERS = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Content-Security-Policy", value: "frame-ancestors 'self'" },
  { key: "X-Frame-Options", value: "SAMEORIGIN" },
  // La cámara se queda para el propio origen: el mensajero adjunta la foto de
  // la entrega desde el formulario.
  { key: "Permissions-Policy", value: "camera=(self), microphone=(), geolocation=()" },
];

const nextConfig: NextConfig = {
  // El driver de Neon abre WebSockets desde Node; empaquetarlo rompe el
  // adapter en server actions.
  serverExternalPackages: ["@neondatabase/serverless"],
  poweredByHeader: false,
  async headers() {
    return [{ source: "/:path*", headers: SECURITY_HEADERS }];
  },
  images: {
    // AVIF primero; quien no lo acepta recibe WebP (lo decide la cabecera Accept).
    formats: ["image/avif", "image/webp"],
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
