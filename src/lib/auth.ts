import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { db } from "@/lib/db";
import { verifyLoginTicket } from "@/lib/two-factor-crypto";
import { authConfig } from "./auth.config";

export const { handlers, signIn, signOut, auth, unstable_update } = NextAuth({
  ...authConfig,
  providers: [
    Credentials({
      name: "credentials",
      // Solo acepta un ticket acuñado por las actions de login tras validar la
      // contraseña y, si procede, el segundo factor. Así el endpoint público
      // /api/auth/callback/credentials no puede crear sesión con correo y
      // contraseña saltándose el 2FA. El ticket vive un minuto y nunca sale
      // del servidor.
      credentials: {
        ticket: { type: "text" },
      },
      async authorize(credentials) {
        const ticket = typeof credentials?.ticket === "string" ? credentials.ticket : undefined;
        const payload = await verifyLoginTicket(ticket, "session");
        if (!payload) return null;

        const user = await db.user.findUnique({ where: { userId: payload.userId } });
        if (!user || !user.isActive) return null;

        // Best-effort: una marca de último acceso no justifica fallar el login.
        db.user
          .update({ where: { userId: user.userId }, data: { lastLoginAt: new Date() } })
          .catch((e) => console.error("lastLoginAt:", e));

        return {
          id: String(user.userId),
          email: user.email,
          name: user.fullName,
          role: user.role,
        };
      },
    }),
  ],
});
