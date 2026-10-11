import type { Metadata } from "next";
import { Users } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { CustomerList } from "@/modules/customers/components/customer-list";
import { getCustomers } from "@/modules/customers/queries/customer-queries";

export const metadata: Metadata = { title: "Clientes" };
export const dynamic = "force-dynamic";

interface AdminCustomersPageProps {
  searchParams: Promise<{ q?: string }>;
}

export default async function AdminCustomersPage({ searchParams }: AdminCustomersPageProps) {
  const params = await searchParams;
  const q = params.q?.trim() ?? "";
  const rows = await getCustomers({ q: q || undefined });
  return (
    <>
      <PageHeader icon={Users} title="Clientes" description="Fichas, direcciones e historial de compras." />
      <CustomerList key={q} rows={rows} query={q} />
    </>
  );
}
