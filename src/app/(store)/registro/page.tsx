import type { Metadata } from "next";
import { AuthCard } from "@/modules/auth/components/auth-card";
import { RegisterForm } from "@/modules/auth/components/register-form";
import { safeCallbackUrl, withCallbackUrl } from "@/modules/auth/lib/schemas";

export const metadata: Metadata = { title: "Crear cuenta" };

interface RegisterPageProps {
  searchParams: Promise<{ callbackUrl?: string }>;
}

export default async function RegisterPage({ searchParams }: RegisterPageProps) {
  const params = await searchParams;
  const callbackUrl = safeCallbackUrl(params.callbackUrl, "") || undefined;
  return (
    <AuthCard
      eyebrow="Tu cuenta"
      title="Crear cuenta"
      description="Con tu cuenta guardas tus destinatarios y sigues tus pedidos."
      footer={{ text: "¿Ya tienes cuenta?", linkLabel: "Iniciar sesión", href: withCallbackUrl("/login", callbackUrl) }}
    >
      <RegisterForm callbackUrl={callbackUrl} />
    </AuthCard>
  );
}
