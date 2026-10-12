"use client";

import { useEffect } from "react";

/** Registra el service worker de la PWA (`public/sw.js`). Solo en producción:
 *  en desarrollo un worker activo confunde con respuestas cacheadas. */
export function PwaRegister() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production") return;
    if (!("serviceWorker" in navigator)) return;
    // Tras `load`: registrar durante la hidratación compite con el primer
    // RSC y las fotos por la red y el hilo principal.
    const register = () => {
      navigator.serviceWorker.register("/sw.js").catch((error) => {
        console.error("PwaRegister:", error);
      });
    };
    if (document.readyState === "complete") {
      register();
      return;
    }
    window.addEventListener("load", register, { once: true });
    return () => window.removeEventListener("load", register);
  }, []);
  return null;
}
