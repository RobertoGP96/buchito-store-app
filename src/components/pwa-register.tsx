"use client";

import { useEffect } from "react";

/** Registra el service worker de la PWA (`public/sw.js`). Solo en producción:
 *  en desarrollo un worker activo confunde con respuestas cacheadas. */
export function PwaRegister() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production") return;
    if (!("serviceWorker" in navigator)) return;
    navigator.serviceWorker.register("/sw.js").catch((error) => {
      console.error("PwaRegister:", error);
    });
  }, []);
  return null;
}
