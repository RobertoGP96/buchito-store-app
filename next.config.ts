import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // El driver de Neon abre WebSockets desde Node; empaquetarlo rompe el
  // adapter en server actions.
  serverExternalPackages: ["@neondatabase/serverless"],
  images: {
    remotePatterns: [
      // Neon Object Storage (bucket `products` en neon.ts).
      { protocol: "https", hostname: "**.neon.tech" },
      { protocol: "https", hostname: "**.public.blob.vercel-storage.com" },
    ],
  },
};

export default nextConfig;
