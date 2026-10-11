import NextAuth from "next-auth";
import { authConfig } from "@/lib/auth.config";

export const { auth: middleware } = NextAuth(authConfig);

// Solo las rutas que dependen de la sesión: la tienda pública no paga el
// middleware de next-auth en cada navegación ni en cada prefetch.
export const config = {
  matcher: ["/admin/:path*", "/mensajero/:path*", "/perfil/:path*", "/login", "/registro"],
};
