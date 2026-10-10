import type { Metadata } from "next";
import { AuthCard } from "@/modules/auth/components/auth-card";
import { LoginForm } from "@/modules/auth/components/login-form";
import { safeCallbackUrl } from "@/modules/auth/lib/schemas";

export const metadata: Metadata = { title: "Iniciar sesión" };

interface LoginPageProps {
  searchParams: Promise<{ callbackUrl?: string; error?: string }>;
}

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const params = await searchParams;
  const callbackUrl = safeCallbackUrl(params.callbackUrl, "");
  return (
    <AuthCard
      eyebrow="Tu cuenta"
      title="Iniciar sesión"
      description="Entra para ver tus pedidos y comprar más rápido."
      footer={{ text: "¿No tienes cuenta?", linkLabel: "Crear cuenta", href: "/registro" }}
    >
      <LoginForm callbackUrl={callbackUrl || undefined} />
    </AuthCard>
  );
}
