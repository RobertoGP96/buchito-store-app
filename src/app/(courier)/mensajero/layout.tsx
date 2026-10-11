import { requireRole } from "@/lib/auth-guard";
import { CourierShell } from "@/components/layout/courier/courier-shell";
import { CurrencyProvider } from "@/modules/currency/store/currency-provider";
import { getCurrencyContext } from "@/modules/currency/queries/currency-queries";

export default async function CourierLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const session = await requireRole("courier");
  const currency = await getCurrencyContext();
  return (
    <CurrencyProvider data={currency} lockToBase>
      <CourierShell userName={session.user.fullName}>{children}</CourierShell>
    </CurrencyProvider>
  );
}
