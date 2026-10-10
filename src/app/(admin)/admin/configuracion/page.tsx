import type { Metadata } from "next";
import { Settings2 } from "lucide-react";
import { EmptyState } from "@/components/empty-state";
import { PageHeader } from "@/components/page-header";

export const metadata: Metadata = { title: "Configuración" };
export const dynamic = "force-dynamic";

export default function AdminSettingsPage() {
  return (
    <>
      <PageHeader icon={Settings2} title="Configuración" description="Datos de la tienda, moneda base, envío y folios." />
      <div className="rounded-card bg-canvas shadow-card">
        <EmptyState icon={Settings2} title="Configuración" description="El formulario de configuración llega en la fase B." size="compact" />
      </div>
    </>
  );
}
