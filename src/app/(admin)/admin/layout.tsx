import { requireRole } from "@/lib/auth-guard";
import { AdminShell } from "@/components/layout/admin/admin-shell";
import { AuthSessionProvider } from "@/components/session-provider";

export default async function AdminLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const session = await requireRole("admin");
  return (
    <AuthSessionProvider>
      <AdminShell userName={session.user.fullName}>{children}</AdminShell>
    </AuthSessionProvider>
  );
}
