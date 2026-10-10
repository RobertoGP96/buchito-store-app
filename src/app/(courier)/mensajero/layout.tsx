import { requireRole } from "@/lib/auth-guard";
import { CourierShell } from "@/components/layout/courier/courier-shell";

export default async function CourierLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const session = await requireRole("courier");
  return <CourierShell userName={session.user.fullName}>{children}</CourierShell>;
}
