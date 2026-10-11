import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // El driver de Neon abre WebSockets desde Node; empaquetarlo rompe el
  // adapter en server actions.
  serverExternalPackages: ["@neondatabase/serverless"],
  experimental: {
    // <ViewTransition> de React para las transiciones de ruta y la imagen
    // compartida card → ficha (RouteTransition, ProductCard, ProductDetail).
    viewTransition: true,
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "**.public.blob.vercel-storage.com",
      },
    ],
  },
};

export default nextConfig;
