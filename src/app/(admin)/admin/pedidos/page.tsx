import type { Metadata } from "next";
import { Inbox } from "lucide-react";
import { EmptyState } from "@/components/empty-state";
import { PageHeader } from "@/components/page-header";

export const metadata: Metadata = { title: "Pedidos" };
export const dynamic = "force-dynamic";

export default function AdminOrdersPage() {
  return (
    <>
      <PageHeader icon={Inbox} title="Pedidos" description="Pedidos de la tienda por estado." />
      <div className="rounded-card bg-canvas shadow-card">
        <EmptyState icon={Inbox} title="Sin pedidos" description="Los pedidos de la tienda aparecerán aquí." size="compact" />
      </div>
    </>
  );
}
