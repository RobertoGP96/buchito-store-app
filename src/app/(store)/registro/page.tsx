import type { Metadata } from "next";
import { AuthCard } from "@/modules/auth/components/auth-card";
import { RegisterForm } from "@/modules/auth/components/register-form";

export const metadata: Metadata = { title: "Crear cuenta" };

export default function RegisterPage() {
  return (
    <AuthCard
      eyebrow="Tu cuenta"
      title="Crear cuenta"
      description="Con tu cuenta guardas tus datos de entrega y sigues tus pedidos."
      footer={{ text: "¿Ya tienes cuenta?", linkLabel: "Iniciar sesión", href: "/login" }}
    >
      <RegisterForm />
    </AuthCard>
  );
}
