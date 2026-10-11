import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Users } from "lucide-react";
import { ButtonLink } from "@/components/button-link";
import { PageHeader } from "@/components/page-header";
import { StatusChip } from "@/components/status-chip";
import { CustomerDetail } from "@/modules/customers/components/customer-detail";
import { getCustomerById } from "@/modules/customers/queries/customer-queries";

export const dynamic = "force-dynamic";

interface AdminCustomerPageProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: AdminCustomerPageProps): Promise<Metadata> {
  const { id } = await params;
  return { title: `Cliente #${id}` };
}

export default async function AdminCustomerPage({ params }: AdminCustomerPageProps) {
  const { id } = await params;
  const customerId = Number(id);
  if (!Number.isInteger(customerId)) notFound();

  const customer = await getCustomerById(customerId);
  if (!customer) notFound();

  return (
    <>
      <PageHeader
        icon={Users}
        title={customer.name}
        description={customer.email ? `${customer.phone} · ${customer.email}` : customer.phone}
        badge={
          <StatusChip
            label={customer.hasAccount ? "Con cuenta" : "Invitado"}
            tone={customer.hasAccount ? "info" : "neutral"}
          />
        }
      >
        <ButtonLink href="/admin/clientes" variant="ghost" size="sm">
          Volver a clientes
        </ButtonLink>
      </PageHeader>
      <CustomerDetail customer={customer} />
    </>
  );
}
