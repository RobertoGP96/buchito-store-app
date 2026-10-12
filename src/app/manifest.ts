import type { MetadataRoute } from "next";
import { STORE_NAME } from "@/lib/config";

/** Manifiesto de la PWA: con él (y los iconos de `public/icons`) el navegador
 *  ofrece "Instalar" y la tienda abre a pantalla completa desde el inicio. */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: STORE_NAME,
    short_name: STORE_NAME,
    description: "Tienda en línea con entrega a domicilio.",
    id: "/",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    lang: "es",
    background_color: "#f6f3ec",
    theme_color: "#14386f",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
      { src: "/icons/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
