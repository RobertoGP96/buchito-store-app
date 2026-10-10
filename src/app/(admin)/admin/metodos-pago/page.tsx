import type { Metadata } from "next";
import { Wallet } from "lucide-react";
import { EmptyState } from "@/components/empty-state";
import { PageHeader } from "@/components/page-header";

export const metadata: Metadata = { title: "Métodos de pago" };
export const dynamic = "force-dynamic";

export default function AdminPaymentMethodsPage() {
  return (
    <>
      <PageHeader icon={Wallet} title="Métodos de pago" description="Formas de pago que el cliente elige en el checkout, cada una en su moneda." />
      <div className="rounded-card bg-canvas shadow-card">
        <EmptyState icon={Wallet} title="Sin métodos de pago" description="Crea el primer método de pago." size="compact" />
      </div>
    </>
  );
}
