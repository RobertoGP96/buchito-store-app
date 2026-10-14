import type { NextAuthConfig } from "next-auth";
import { homeForRole } from "@/lib/roles";

// Este archivo corre en el middleware (edge): sin Prisma, sin bcrypt.
export const authConfig: NextAuthConfig = {
  secret: process.env.AUTH_SECRET,
  trustHost: true,
  pages: {
    signIn: "/login",
    error: "/login",
  },
  session: {
    strategy: "jwt",
  },
  providers: [], // Se añaden en auth.ts (solo servidor).
  callbacks: {
    authorized({ auth, request }) {
      const { pathname } = request.nextUrl;
      const role = auth?.user?.role;
      const isLoggedIn = Boolean(auth?.user);
      const toHome = () =>
        Response.redirect(new URL(homeForRole(role), request.nextUrl));

      if (pathname.startsWith("/admin")) {
        if (!isLoggedIn) return false;
        return role === "admin" ? true : toHome();
      }
      if (pathname.startsWith("/mensajero")) {
        if (!isLoggedIn) return false;
        // Solo el mensajero: la app no tiene vuelta al panel, así que el admin
        // tampoco entra (supervisa las entregas desde /admin/entregas).
        return role === "courier" ? true : toHome();
      }
      if (pathname.startsWith("/perfil") || pathname.startsWith("/checkout")) {
        if (!isLoggedIn) return false;
        // El mensajero no compra ni tiene perfil de cliente: su cuenta vive
        // en /mensajero (el resto de la tienda lo redirige su layout).
        return role === "courier" ? toHome() : true;
      }
      if ((pathname === "/login" || pathname === "/registro") && isLoggedIn) {
        return toHome();
      }
      return true;
    },
    async jwt({ token, user, trigger, session }) {
      if (user) {
        token.userId = Number(user.id);
        token.role = (user as { role?: string }).role ?? "customer";
        token.fullName = user.name ?? "";
      }
      // `unstable_update({ user: { fullName } })` al editar el perfil: el
      // nombre viaja en el token y el menú lo mostraría viejo hasta el
      // próximo login. Solo se acepta ese campo.
      if (trigger === "update" && typeof session?.user?.fullName === "string") {
        token.fullName = session.user.fullName;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.userId = token.userId;
        session.user.role = token.role;
        session.user.fullName = token.fullName;
      }
      return session;
    },
  },
};
