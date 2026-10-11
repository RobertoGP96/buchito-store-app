import { cookies } from "next/headers";
import { requireRole } from "@/lib/auth-guard";
import { ADMIN_NAV_COOKIE } from "@/lib/preferences";
import { AdminShell } from "@/components/layout/admin/admin-shell";
import { CurrencyProvider } from "@/modules/currency/store/currency-provider";
import { getCurrencyContext } from "@/modules/currency/queries/currency-queries";

export default async function AdminLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  // El middleware ya rechaza a quien no es admin: las tres lecturas pueden ir
  // a la vez sin gastar una consulta en un usuario que va a ser redirigido.
  // El admin pinta montos en base en todas sus pantallas (<Money/>).
  const [session, currency, cookieStore] = await Promise.all([
    requireRole("admin"),
    getCurrencyContext(),
    cookies(),
  ]);
  const collapsed = cookieStore.get(ADMIN_NAV_COOKIE)?.value === "collapsed";
  return (
    <CurrencyProvider data={currency} lockToBase>
      <AdminShell userName={session.user.fullName} role={session.user.role} initialCollapsed={collapsed}>
        {children}
      </AdminShell>
    </CurrencyProvider>
  );
}
