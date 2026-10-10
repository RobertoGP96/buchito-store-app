import { requireAuth } from "@/lib/auth-guard";

export default async function ProfileLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  await requireAuth("/perfil");
  return <>{children}</>;
}
