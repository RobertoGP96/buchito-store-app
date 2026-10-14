import { redirect } from "next/navigation";
import { requireRole } from "@/lib/auth-guard";
import { homeForRole } from "@/lib/roles";
import { CourierShell } from "@/components/layout/courier/courier-shell";
import { CurrencyProvider } from "@/modules/currency/store/currency-provider";
import { getCurrencyContext } from "@/modules/currency/queries/currency-queries";

export default async function CourierLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const [session, currency] = await Promise.all([requireRole("courier"), getCurrencyContext()]);
  // requireRole deja pasar al admin; esta app es solo del mensajero.
  if (session.user.role !== "courier") redirect(homeForRole("admin"));
  return (
    <CurrencyProvider data={currency} lockToBase>
      <CourierShell userName={session.user.fullName}>{children}</CourierShell>
    </CurrencyProvider>
  );
}
