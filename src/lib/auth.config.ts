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
        return role === "courier" || role === "admin" ? true : toHome();
      }
      if (pathname.startsWith("/perfil")) {
        return isLoggedIn;
      }
      if ((pathname === "/login" || pathname === "/registro") && isLoggedIn) {
        return toHome();
      }
      return true;
    },
    async jwt({ token, user }) {
      if (user) {
        token.userId = Number(user.id);
        token.role = (user as { role?: string }).role ?? "customer";
        token.fullName = user.name ?? "";
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
