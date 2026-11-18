import type { Metadata } from "next";
import { UserCog } from "lucide-react";
import { PageHeading } from "@/components/page-header";
import { requireRole } from "@/lib/auth-guard";
import { UserList } from "@/modules/users/components/user-list";
import { getUsers } from "@/modules/users/queries/user-queries";

export const metadata: Metadata = { title: "Usuarios" };
export const dynamic = "force-dynamic";

export default async function AdminUsersPage() {
  const [session, rows] = await Promise.all([requireRole("admin"), getUsers()]);
  return (
    <>
      <UserList
        heading={<PageHeading icon={UserCog} title="Usuarios" description="Cuentas de acceso y roles. Los mensajeros se dan de alta en Mensajeros." />}
        rows={rows} currentUserId={session.user.userId} />
    </>
  );
}
