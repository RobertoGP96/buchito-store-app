"use client";

import { SessionProvider } from "next-auth/react";

/** Solo los shells admin/mensajero lo montan: la tienda pública recibe el
 *  usuario como prop desde el layout servidor y no necesita el contexto. */
export function AuthSessionProvider({ children }: { children: React.ReactNode }) {
  return <SessionProvider>{children}</SessionProvider>;
}
