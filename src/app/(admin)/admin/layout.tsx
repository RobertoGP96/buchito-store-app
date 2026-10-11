import { requireRole } from "@/lib/auth-guard";
import { AdminShell } from "@/components/layout/admin/admin-shell";
import { AuthSessionProvider } from "@/components/session-provider";
import { CurrencyProvider } from "@/modules/currency/store/currency-provider";
import { getCurrencyContext } from "@/modules/currency/queries/currency-queries";

export default async function AdminLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const session = await requireRole("admin");
  // El admin pinta montos en base en todas sus pantallas (<Money/>).
  const currency = await getCurrencyContext();
  return (
    <AuthSessionProvider>
      <CurrencyProvider data={currency} lockToBase>
        <AdminShell userName={session.user.fullName} role={session.user.role}>
          {children}
        </AdminShell>
      </CurrencyProvider>
    </AuthSessionProvider>
  );
}
