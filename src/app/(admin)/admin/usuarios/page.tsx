import type { Metadata } from "next";
import { UserCog } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { UserList } from "@/modules/users/components/user-list";
import { getUsers } from "@/modules/users/queries/user-queries";

export const metadata: Metadata = { title: "Usuarios" };
export const dynamic = "force-dynamic";

export default async function AdminUsersPage() {
  const rows = await getUsers();
  return (
    <>
      <PageHeader
        icon={UserCog}
        title="Usuarios"
        description="Cuentas de acceso y roles. Los mensajeros se dan de alta en Mensajeros."
      />
      <UserList rows={rows} />
    </>
  );
}
